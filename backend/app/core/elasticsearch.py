import logging
from elasticsearch import AsyncElasticsearch
from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback to localhost only for local dev if ELASTICSEARCH_URL is not set
_es_url = settings.ELASTICSEARCH_URL if settings.ELASTICSEARCH_URL else "http://localhost:9200"

# Initialize the Elasticsearch client
es_client = AsyncElasticsearch(
    hosts=[_es_url],
    api_key=settings.ELASTICSEARCH_API_KEY,
    verify_certs=True,
    request_timeout=30,
)

async def check_es_connection() -> bool:
    """Verify connection to Elasticsearch on startup."""
    if not settings.ELASTICSEARCH_ENABLED:
        logger.warning("Elasticsearch is disabled via ELASTICSEARCH_ENABLED=False.")
        return False
        
    try:
        info = await es_client.info()
        logger.info(f"Successfully connected to Elasticsearch cluster: {info.get('cluster_name')} at {_es_url}")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to Elasticsearch: {str(e)}")
        return False

async def ensure_elasticsearch_started() -> bool:
    """Check if Elasticsearch is responsive."""
    if not settings.ELASTICSEARCH_ENABLED:
        return False
        
    return await check_es_connection()

