import asyncio
import json
import logging
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, func
from app.models.agriculture import DiseaseDetection
from app.models.analytics import AnalyticsCache, AILog

logger = logging.getLogger(__name__)

# Event System Hook Placeholders
def fire_event_detection_created(detection_id: str):
    """Placeholder for Webhook / Websocket / Kafka emission"""
    # Triggered when a new detection is saved in DB
    logger.info(f"EVENT: New detection {detection_id}")

def fire_event_ai_used(model: str, time_ms: float):
    # Log directly for local dev (no Celery)
    try:
        asyncio.get_event_loop().create_task(_log_ai_async(model, time_ms))
    except RuntimeError:
        logger.info(f"AI usage logged (sync): model={model}, time_ms={time_ms}")


async def _log_ai_async(model_used: str, response_time_ms: float):
    """Log AI usage directly to DB without Celery."""
    try:
        async with AsyncSessionLocal() as db:
            log = AILog(model_used=model_used, response_time_ms=response_time_ms)
            db.add(log)
            await db.commit()
    except Exception as e:
        logger.warning(f"Failed to log AI usage: {e}")


async def precompute_disease_trends():
    """
    Compute disease trend aggregations and cache them in the analytics_cache table.
    Can be called directly without Celery for local development.
    """
    async with AsyncSessionLocal() as db:
        query = select(
            DiseaseDetection.detected_disease,
            func.count(DiseaseDetection.id).label("count")
        ).group_by(DiseaseDetection.detected_disease)
        
        result = await db.execute(query)
        data = [{"disease": row.detected_disease, "occurrences": row.count} for row in result.all()]
        
        # Simple upsert: check if exists, then update or insert
        existing = await db.execute(
            select(AnalyticsCache).where(AnalyticsCache.metric_name == "global_disease_trends")
        )
        cache_entry = existing.scalars().first()
        
        if cache_entry:
            cache_entry.data_payload = data
        else:
            cache_entry = AnalyticsCache(
                metric_name="global_disease_trends",
                data_payload=data
            )
            db.add(cache_entry)
        
        await db.commit()
        logger.info("Disease Trends Pre-computed.")
