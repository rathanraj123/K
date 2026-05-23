import logging
import redis.asyncio as redis
from typing import Optional
from app.core.config import settings
import os

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Redis async connection pool
redis_client: Optional[redis.Redis] = None

async def init_redis():
    """Initialize Redis connection pool."""
    global redis_client
    try:
        redis_client = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        # Ping to check connection
        await redis_client.ping()
        logger.info("Successfully connected to Redis L1 Cache.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {str(e)}")
        redis_client = None

async def get_redis() -> Optional[redis.Redis]:
    """Dependency to get redis client."""
    if redis_client is None:
        await init_redis()
    return redis_client

async def close_redis():
    """Close Redis connection."""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed.")
