import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket
import redis.asyncio as redis
from app.core.redis_client import get_redis
from app.core.structured_logging import admin_logger

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.redis_client = None
        self.pubsub = None
        self.channel_name = "agricosmo_realtime_events"

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        count = len(self.active_connections)
        try:
            from app.core.prometheus import websocket_connections_total, active_websocket_connections
            websocket_connections_total.labels(event="connect").inc()
            active_websocket_connections.set(count)
        except Exception:
            pass
        admin_logger.log_websocket("connect", count)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        count = len(self.active_connections)
        try:
            from app.core.prometheus import websocket_connections_total, active_websocket_connections
            websocket_connections_total.labels(event="disconnect").inc()
            active_websocket_connections.set(count)
        except Exception:
            pass
        admin_logger.log_websocket("disconnect", count)


    async def broadcast_to_local_sockets(self, message: Dict[str, Any]):
        """Broadcast directly to local connected websockets"""
        text_data = json.dumps(message)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(text_data)
            except Exception as e:
                logger.error(f"Error sending message to websocket: {e}")
                dead_connections.append(connection)
        
        for dead in dead_connections:
            self.disconnect(dead)

    async def publish_event(self, event_type: str, payload: Dict[str, Any]):
        """Publish an event to Redis so all workers receive it"""
        redis_conn = await get_redis()
        if redis_conn:
            message = {
                "type": event_type,
                "data": payload
            }
            await redis_conn.publish(self.channel_name, json.dumps(message))
        else:
            # Fallback to local broadcast if Redis is down
            await self.broadcast_to_local_sockets({
                "type": event_type,
                "data": payload
            })

    async def listen_to_redis(self):
        """Listen to Redis Pub/Sub and broadcast to local websockets"""
        redis_conn = await get_redis()
        if not redis_conn:
            logger.error("Could not connect to Redis for Pub/Sub")
            return

        self.pubsub = redis_conn.pubsub()
        await self.pubsub.subscribe(self.channel_name)
        
        logger.info(f"Subscribed to Redis channel: {self.channel_name}")
        
        import asyncio
        while True:
            try:
                async for message in self.pubsub.listen():
                    if message and message["type"] == "message":
                        data = json.loads(message["data"])
                        await self.broadcast_to_local_sockets(data)
            except Exception as e:
                # If it's a timeout, just continue and listen again.
                # The generator terminates on exception, so we need to recreate it via the while loop.
                if "Timeout" in str(e) or "TimeoutError" in type(e).__name__:
                    await asyncio.sleep(1)
                    continue
                logger.error(f"Redis PubSub error: {e}")
                await asyncio.sleep(2)

            
manager = ConnectionManager()
