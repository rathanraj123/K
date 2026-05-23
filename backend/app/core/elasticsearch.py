import logging
from elasticsearch import AsyncElasticsearch
from app.core.config import settings
import os
import asyncio
import subprocess
import platform
import httpx

logger = logging.getLogger(__name__)

# Fallback to localhost if not provided in env for local development
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")

# Initialize the Elasticsearch client
es_client = AsyncElasticsearch(
    hosts=[ELASTICSEARCH_URL],
    # Add authentication here if needed:
    # basic_auth=("username", "password"),
    # verify_certs=False # if using self-signed certs
)

async def check_es_connection():
    """Verify connection to Elasticsearch on startup."""
    try:
        info = await es_client.info()
        logger.info(f"Successfully connected to Elasticsearch cluster: {info.get('cluster_name')}")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to Elasticsearch: {str(e)}")
        return False

async def ensure_elasticsearch_started():
    """Ensure Elasticsearch is running. If not, attempt to start it locally on Windows."""
    url = ELASTICSEARCH_URL
    is_running = False
    
    # 1. Check if Elasticsearch is already responding
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                is_running = True
                logger.info("Elasticsearch is already running.")
    except Exception:
        pass

    if is_running:
        return True

    # 2. If not running, check if we are on Windows and check paths
    if platform.system() != "Windows":
        logger.warning("Elasticsearch is not running, and auto-start is only supported on Windows.")
        return False

    user_home = os.path.expanduser("~")
    possible_paths = [
        os.path.join(user_home, "elasticsearch"),
        r"C:\Users\ratha\elasticsearch",
        r"C:\elasticsearch",
    ]

    es_dir = None
    es_bat = None

    for path in possible_paths:
        bat_path = os.path.join(path, "bin", "elasticsearch.bat")
        if os.path.exists(bat_path):
            es_dir = path
            es_bat = bat_path
            break

    if not es_bat:
        logger.warning("Elasticsearch is not running, and local installation was not found in common paths.")
        return False

    logger.info(f"Elasticsearch is not running. Attempting to start from {es_bat}...")

    # Clear CLASSPATH env variable to prevent conflicts on Windows
    env = os.environ.copy()
    if "CLASSPATH" in env:
        del env["CLASSPATH"]

    # Start elasticsearch in a new console window
    try:
        subprocess.Popen(
            [es_bat],
            cwd=os.path.join(es_dir, "bin"),
            env=env,
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
        logger.info("Spawned Elasticsearch startup process in a new console window.")
    except Exception as e:
        logger.error(f"Failed to spawn Elasticsearch process: {e}")
        return False

    # 3. Poll the endpoint until it responds or we hit a timeout
    logger.info("Waiting for Elasticsearch to respond (up to 45 seconds)...")
    async with httpx.AsyncClient() as client:
        for i in range(45):
            await asyncio.sleep(1.0)
            try:
                response = await client.get(url, timeout=1.0)
                if response.status_code == 200:
                    logger.info("Elasticsearch started successfully and is responding.")
                    return True
            except Exception:
                pass
            if i % 5 == 4:
                logger.info(f"Still waiting for Elasticsearch to start... ({i+1}/45s)")

    logger.warning("Elasticsearch startup process spawned, but it is not responding yet. Continuing startup.")
    return False

