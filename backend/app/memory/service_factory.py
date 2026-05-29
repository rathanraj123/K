"""
Memory service factory.
Resolves which memory backend to use at runtime:
  1. PostgreSQL + pgvector (preferred — when DATABASE_URL contains 'postgresql')
  2. Elasticsearch (if ES client is configured and reachable)
  3. None (graceful no-op — chatbot still works, just without persistent memory)
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_memory_service = None
_resolved = False


def get_memory_service():
    """
    Return the active memory service singleton.
    Resolves lazily on first call and caches the result.
    """
    global _memory_service, _resolved
    if _resolved:
        return _memory_service

    from app.core.config import settings

    if "postgresql" in settings.DATABASE_URL:
        try:
            from app.memory.postgres_memory_service import pg_memory
            _memory_service = pg_memory
            logger.info("Memory service: PostgreSQL + pgvector")
        except Exception as e:
            logger.warning(f"Could not load PostgresMemoryService: {e}")
    
    if _memory_service is None:
        # Try Elasticsearch as fallback
        try:
            from app.memory.es_service import es_memory
            _memory_service = es_memory
            logger.info("Memory service: Elasticsearch (fallback)")
        except Exception as e:
            logger.warning(f"Could not load ElasticsearchMemoryService: {e}")

    if _memory_service is None:
        logger.warning(
            "Memory service: None (no persistent chat memory). "
            "Chatbot will work without long-term recall."
        )

    _resolved = True
    return _memory_service
