import json
import logging
import time
from functools import wraps
from typing import Callable, Any
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

# Fallback simple in-memory cache
_memory_cache: dict[str, tuple[float, Any]] = {}

def cache_with_ttl(ttl_seconds: int = 300, key_prefix: str = "cache"):
    """
    Caching decorator using Redis if available, falling back to in-memory dict.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract safe arguments (e.g. user_id string)
            safe_kwargs = {k: v for k, v in kwargs.items() if isinstance(v, (str, int, float, bool, type(None)))}
            # If no user_id is passed, it caches the global dataset
            user_id_str = safe_kwargs.get("user_id", "global")
            
            cache_key = f"{key_prefix}:{func.__name__}:{user_id_str}"
            
            redis_client = await get_redis()
            
            # 1. Try Redis cache
            if redis_client:
                try:
                    cached_data = await redis_client.get(cache_key)
                    if cached_data:
                        return json.loads(cached_data)
                except Exception as e:
                    logger.warning(f"Redis get failed, falling back to memory cache: {e}")
            
            # 2. Check memory cache fallback
            if cache_key in _memory_cache:
                cached_time, cached_data = _memory_cache[cache_key]
                if time.time() - cached_time < ttl_seconds:
                    return cached_data
                else:
                    del _memory_cache[cache_key]
            
            # 3. Cache Miss: Execute actual function
            result = await func(*args, **kwargs)
            
            # 4. Store in Cache
            
            # Try Redis first
            if redis_client:
                try:
                    await redis_client.setex(cache_key, ttl_seconds, json.dumps(result))
                except Exception as e:
                    logger.warning(f"Redis setex failed: {e}")
            
            # Always update memory fallback just in case
            _memory_cache[cache_key] = (time.time(), result)
                
            return result
        return wrapper
    return decorator

async def invalidate_dashboard_cache(user_id: str = None):
    """
    Invalidates all dashboard cache keys for a given user or globally.
    """
    redis_client = await get_redis()
    user_id_str = user_id if user_id else "global"
    
    # Prefix list matching the dashboard cache keys
    prefixes = [
        f"dash:overview",
        f"dash:trends",
        f"dash:heatmap",
        f"dash:top_diseases",
        f"dash:predictions"
    ]
    
    # 1. Clear Redis
    if redis_client:
        try:
            for prefix in prefixes:
                # We need to find the exact key formats we used.
                # The format in the decorator is: f"{key_prefix}:{func.__name__}:{user_id_str}"
                # Instead of matching exactly, we can use SCAN or just clear known combinations
                
                # To keep it simple, we just clear both global and user specific keys for the dashboard endpoints
                # since we know the function names
                endpoints = ["get_overview", "get_disease_trends", "get_heatmap_data", "get_top_diseases", "get_predictions"]
                
                for endpoint in endpoints:
                    cache_key_global = f"{prefix}:{endpoint}:global"
                    cache_key_user = f"{prefix}:{endpoint}:{user_id_str}"
                    await redis_client.delete(cache_key_global)
                    if user_id:
                        await redis_client.delete(cache_key_user)
        except Exception as e:
            logger.warning(f"Redis cache invalidation failed: {e}")
            
    # 2. Clear Memory Fallback
    keys_to_delete = []
    for key in _memory_cache.keys():
        if key.startswith("dash:"):
            keys_to_delete.append(key)
            
    for key in keys_to_delete:
        del _memory_cache[key]
