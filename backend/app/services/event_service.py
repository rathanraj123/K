import json
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.enterprise import RealtimeEvent, ActivityLog
from app.core.websocket_manager import manager
from app.workers.tasks import aggregate_analytics # We will create this task

logger = logging.getLogger(__name__)

class EventService:
    @staticmethod
    async def emit_event(db: AsyncSession, event_type: str, payload: Dict[str, Any], user_id: str = None):
        """
        Core event bus for the platform.
        1. Persists event to DB
        2. Broadcasts via WebSocket
        3. Dispatches async Celery task for heavy aggregations
        """
        try:
            # 1. Persist Event for audit
            event = RealtimeEvent(
                event_type=event_type,
                payload=payload
            )
            db.add(event)

            # If it's a specific user activity, log it
            if user_id:
                activity = ActivityLog(
                    user_id=user_id,
                    action=event_type,
                    details=payload
                )
                db.add(activity)

            await db.commit()

            # 2. Broadcast via WebSockets (Redis Pub/Sub)
            await manager.publish_event(event_type, payload)

            # 3. Dispatch Background Analytics Task
            # We send the task to Celery to compute new dashboard stats
            aggregate_analytics.delay(event_type, payload)

        except Exception as e:
            logger.error(f"Failed to emit event {event_type}: {e}")
            await db.rollback()

    @staticmethod
    async def push_notification(level: str, message: str, details: dict = None):
        """
        Push a toast notification directly to all connected admin dashboards.
        levels: info, success, warning, error
        """
        payload = {
            "level": level,
            "message": message,
            "details": details or {}
        }
        # Log it using structured logging
        logger.info("Admin Notification", extra={"extra_meta": {"notification": payload}})
        # Broadcast immediately
        await manager.publish_event("admin_notification", payload)
