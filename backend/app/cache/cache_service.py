import json
import logging
from typing import List, Dict, Any, Optional
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

class L1CacheService:
    def __init__(self, ttl_seconds: int = 3600):
        # Default TTL for active conversations is 1 hour
        self.ttl = ttl_seconds

    def _get_session_key(self, session_id: str) -> str:
        return f"agricosmo:chat:session:{session_id}"

    async def get_active_context(self, session_id: str) -> Optional[List[Dict[str, Any]]]:
        """Retrieve recent messages from Redis for instantaneous L1 retrieval."""
        redis = await get_redis()
        if not redis:
            return None
        
        try:
            key = self._get_session_key(session_id)
            # Retrieve all list elements
            raw_messages = await redis.lrange(key, 0, -1)
            if not raw_messages:
                return None
                
            # Parse back to dicts
            return [json.loads(msg) for msg in raw_messages]
        except Exception as e:
            logger.error(f"Redis L1 read failed for {session_id}: {str(e)}")
            return None

    async def add_messages_to_context(self, session_id: str, messages: List[Dict[str, Any]], max_items: int = 15):
        """Append new messages to the Redis list, trimming older ones."""
        redis = await get_redis()
        if not redis:
            return
            
        try:
            key = self._get_session_key(session_id)
            
            # Serialize messages
            serialized = [json.dumps(msg) for msg in messages]
            
            # Use pipeline to execute multiple commands atomically
            pipe = redis.pipeline()
            # Push new messages to the right
            pipe.rpush(key, *serialized)
            # Keep only the latest `max_items`
            pipe.ltrim(key, -max_items, -1)
            # Reset TTL
            pipe.expire(key, self.ttl)
            
            await pipe.execute()
        except Exception as e:
            logger.error(f"Redis L1 write failed for {session_id}: {str(e)}")

    async def invalidate_context(self, session_id: str):
        """Remove a session from L1 cache."""
        redis = await get_redis()
        if redis:
            await redis.delete(self._get_session_key(session_id))

l1_cache = L1CacheService()
