import logging
import asyncio
from app.core.elasticsearch import es_client

logger = logging.getLogger(__name__)

# Multi-Index Architecture
CHAT_HISTORY_INDEX = "agricosmo_chat_history"
KNOWLEDGE_BASE_INDEX = "agricosmo_knowledge_base"
SCAN_REPORTS_INDEX = "agricosmo_scan_reports"
MEMORY_SUMMARIES_INDEX = "agricosmo_memory_summaries"
USER_PROFILES_INDEX = "agricosmo_user_profiles"

async def create_indices():
    """Create all Elasticsearch indices for the multi-layer memory architecture."""
    
    # 1. Chat History (L2 Episodic Memory)
    chat_mapping = {
        "mappings": {
            "properties": {
                "message_id": { "type": "keyword" },
                "session_id": { "type": "keyword" },
                "user_id": { "type": "keyword" },
                "role": { "type": "keyword" }, # user, assistant, system, tool, summary, context
                "message_type": { "type": "keyword" },
                "content": { "type": "text", "analyzer": "standard" },
                "timestamp": { "type": "date" },
                "disease_context": { "type": "keyword" },
                "metadata": { "type": "object", "dynamic": True },
                "importance_score": { "type": "integer" },
                "relevance_score": { "type": "float" },
                "embedding": { 
                    "type": "dense_vector", 
                    "dims": 768, 
                    "index": True, 
                    "similarity": "cosine" 
                }
            }
        }
    }

    # 2. Memory Summaries (L5 Long-Term Compressed Memory)
    summary_mapping = {
        "mappings": {
            "properties": {
                "summary_id": { "type": "keyword" },
                "session_id": { "type": "keyword" },
                "user_id": { "type": "keyword" },
                "summary_content": { "type": "text", "analyzer": "english" },
                "created_at": { "type": "date" },
                "covered_message_ids": { "type": "keyword" },
                "embedding": { "type": "dense_vector", "dims": 768, "index": True, "similarity": "cosine" }
            }
        }
    }

    # 3. Knowledge Base (L4 RAG Storage)
    rag_mapping = {
        "mappings": {
            "properties": {
                "doc_id": { "type": "keyword" },
                "title": { "type": "text" },
                "content": { "type": "text", "analyzer": "english" },
                "source": { "type": "keyword" },
                "topic": { "type": "keyword" },
                "embedding": { "type": "dense_vector", "dims": 768, "index": True, "similarity": "cosine" }
            }
        }
    }

    indices_to_create = [
        (CHAT_HISTORY_INDEX, chat_mapping),
        (MEMORY_SUMMARIES_INDEX, summary_mapping),
        (KNOWLEDGE_BASE_INDEX, rag_mapping),
        (SCAN_REPORTS_INDEX, {"mappings": {"dynamic": "true"}}),
        (USER_PROFILES_INDEX, {"mappings": {"dynamic": "true"}})
    ]

    for index_name, mapping in indices_to_create:
        try:
            exists = await es_client.indices.exists(index=index_name)
            if not exists:
                logger.info(f"Creating index: {index_name}")
                await es_client.indices.create(index=index_name, **mapping)
            else:
                logger.debug(f"Index {index_name} already exists.")
        except Exception as e:
            logger.error(f"Failed to create index {index_name}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(create_indices())
