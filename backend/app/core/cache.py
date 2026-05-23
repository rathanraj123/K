import json
import logging
import time
from functools import wraps
from typing import Callable, Any

logger = logging.getLogger(__name__)

# Simple in-memory cache (no Redis dependency needed for local dev)
_memory_cache: dict[str, tuple[float, Any]] = {}


def cache_with_ttl(ttl_seconds: int = 300, key_prefix: str = "cache"):
    """
    Caching decorator using simple in-memory dict.
    No Redis dependency needed for local development.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{hash(str(args) + str(kwargs))}"
            
            # Check memory cache
            if cache_key in _memory_cache:
                cached_time, cached_data = _memory_cache[cache_key]
                if time.time() - cached_time < ttl_seconds:
                    return cached_data
                else:
                    del _memory_cache[cache_key]
            
            # Execute actual function
            result = await func(*args, **kwargs)
            
            # Store in memory cache
            try:
                _memory_cache[cache_key] = (time.time(), result)
            except Exception as e:
                logger.warning(f"Cache set failed: {e}")
                
            return result
        return wrapper
    return decorator
