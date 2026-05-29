import json
import logging
import hashlib
from typing import Any, Dict, Optional, Tuple
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

class RedisCache:
    """
    Centralized caching client wrapping Redis operations.
    Handles weather, dashboard stats, deduplication locks, and rate limit counters.
    """

    def __init__(self):
        self.default_ttl = 3600  # 1 hour default
        self.weather_ttl = 600   # 10 minutes
        self.analytics_ttl = 300 # 5 minutes
        self.pred_ttl = 86400    # 24 hours for predictions

    async def get(self, key: str) -> Optional[Any]:
        client = await get_redis()
        if not client:
            return None
        try:
            val = await client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.error(f"Redis GET failed for key {key}: {e}")
        return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        client = await get_redis()
        if not client:
            return False
        try:
            serialized = json.dumps(value)
            expire = ttl if ttl is not None else self.default_ttl
            await client.set(key, serialized, ex=expire)
            return True
        except Exception as e:
            logger.error(f"Redis SET failed for key {key}: {e}")
        return False

    async def delete(self, key: str) -> bool:
        client = await get_redis()
        if not client:
            return False
        try:
            await client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis DELETE failed for key {key}: {e}")
        return False

    # ─── Distributed Locking & Deduplication ──────────────────────────
    
    async def acquire_lock(self, lock_name: str, expire_seconds: int = 15) -> bool:
        """
        Acquire a non-blocking distributed lock using SETNX.
        Returns True if lock acquired, False otherwise.
        """
        client = await get_redis()
        if not client:
            return True # If Redis is down, bypass lock to avoid stalling requests
        try:
            # setnx equivalent in async redis is set with nx=True
            acquired = await client.set(f"lock:{lock_name}", "locked", ex=expire_seconds, nx=True)
            return bool(acquired)
        except Exception as e:
            logger.error(f"Redis acquire_lock failed: {e}")
            return True

    async def release_lock(self, lock_name: str) -> bool:
        client = await get_redis()
        if not client:
            return False
        try:
            await client.delete(f"lock:{lock_name}")
            return True
        except Exception as e:
            logger.error(f"Redis release_lock failed: {e}")
            return False

    # ─── Rate Limiter Quotas ──────────────────────────────────────────
    
    async def increment_counter(self, key: str, expire_seconds: int = 86400) -> int:
        """Increment a rate-limit key and set expiration if new."""
        client = await get_redis()
        if not client:
            return 0
        try:
            # Execute in pipe to ensure expiration is set atomically
            pipe = client.pipeline()
            pipe.incr(key)
            pipe.ttl(key)
            results = await pipe.execute()
            
            val = results[0]
            ttl = results[1]
            if ttl == -1:
                await client.expire(key, expire_seconds)
                
            return val
        except Exception as e:
            logger.error(f"Redis increment_counter failed: {e}")
            return 0

    # ─── Weather Cache ────────────────────────────────────────────────
    
    def _make_weather_key(self, lat: float, lon: float) -> str:
        # Round to 1 decimal place (~11km precision) to aggregate nearby queries
        return f"cache:weather:{round(lat, 1)}:{round(lon, 1)}"

    async def get_weather(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        return await self.get(self._make_weather_key(lat, lon))

    async def set_weather(self, lat: float, lon: float, data: Dict[str, Any]) -> bool:
        return await self.set(self._make_weather_key(lat, lon), data, ttl=self.weather_ttl)

    # ─── Prediction Cache ─────────────────────────────────────────────
    
    def compute_image_hash(self, image_bytes: bytes) -> str:
        """Generate SHA256 hex string of image bytes."""
        return hashlib.sha256(image_bytes).hexdigest()

    async def get_prediction(self, image_hash: str) -> Optional[Dict[str, Any]]:
        return await self.get(f"cache:pred:{image_hash}")

    async def set_prediction(self, image_hash: str, result: Dict[str, Any]) -> bool:
        return await self.set(f"cache:pred:{image_hash}", result, ttl=self.pred_ttl)

redis_cache = RedisCache()
