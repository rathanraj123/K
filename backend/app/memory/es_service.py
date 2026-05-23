import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from elasticsearch import AsyncElasticsearch
from elasticsearch.exceptions import NotFoundError
from app.core.elasticsearch import es_client
from app.db.es_indices import CHAT_HISTORY_INDEX, MEMORY_SUMMARIES_INDEX
from app.schemas.es_chat import ESChatMessage, ESChatMessageCreate, ESMemorySummary

logger = logging.getLogger(__name__)

class ElasticsearchMemoryService:
    def __init__(self, client: AsyncElasticsearch = es_client):
        self.client = client
        self.history_index = CHAT_HISTORY_INDEX
        self.summary_index = MEMORY_SUMMARIES_INDEX

    async def add_message(self, message: ESChatMessageCreate) -> ESChatMessage:
        """Add a single message to the Elasticsearch history."""
        es_msg = ESChatMessage(**message.model_dump())
        try:
            await self.client.index(
                index=self.history_index,
                id=es_msg.message_id,
                document=es_msg.model_dump(mode='json')
            )
            return es_msg
        except Exception as e:
            logger.error(f"Failed to index message {es_msg.message_id}: {str(e)}")
            raise

    async def get_recent_messages(self, session_id: str, user_id: str, limit: int = 50) -> List[ESChatMessage]:
        """Retrieve the most recent messages for a specific session."""
        query = {
            "bool": {
                "must": [
                    { "term": { "session_id": session_id } },
                    { "term": { "user_id": user_id } }
                ]
            }
        }
        
        try:
            response = await self.client.search(
                index=self.history_index,
                query=query,
                sort=[{"timestamp": {"order": "desc"}}],
                size=limit
            )
            
            hits = response['hits']['hits']
            messages = [ESChatMessage(**hit['_source']) for hit in hits]
            return messages[::-1]
            
        except NotFoundError:
            logger.warning(f"Index {self.history_index} not found.")
            return []
        except Exception as e:
            logger.error(f"Error retrieving messages for session {session_id}: {str(e)}")
            return []

    async def semantic_search(self, query_vector: List[float], user_id: str, limit: int = 5) -> List[ESChatMessage]:
        """Perform semantic KNN search for long-term memory retrieval."""
        try:
            response = await self.client.search(
                index=self.history_index,
                knn={
                    "field": "embedding",
                    "query_vector": query_vector,
                    "k": limit,
                    "num_candidates": 100,
                    "filter": [
                        {"term": {"user_id": user_id}}
                    ]
                },
                size=limit
            )
            hits = response['hits']['hits']
            return [ESChatMessage(**hit['_source']) for hit in hits]
        except Exception as e:
            logger.error(f"Semantic search failed: {str(e)}")
            return []

    async def get_session_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve a list of recent unique sessions for a user."""
        aggs = {
            "sessions": {
                "terms": {
                    "field": "session_id",
                    "size": limit,
                    "order": { "latest_message": "desc" }
                },
                "aggs": {
                    "latest_message": { "max": { "field": "timestamp" } },
                    "top_message": {
                        "top_hits": {
                            "sort": [{"timestamp": {"order": "asc"}}],
                            "size": 1,
                            "_source": {"includes": ["content"]}
                        }
                    }
                }
            }
        }
        query = { "term": { "user_id": user_id } }
        
        try:
            response = await self.client.search(
                index=self.history_index,
                query=query,
                aggs=aggs,
                size=0
            )
            
            sessions = []
            buckets = response['aggregations']['sessions']['buckets']
            for bucket in buckets:
                hits = bucket['top_message']['hits']['hits']
                if not hits: continue
                first_msg_content = hits[0]['_source']['content']
                title = first_msg_content[:30] + "..." if len(first_msg_content) > 30 else first_msg_content
                
                sessions.append({
                    "id": bucket['key'],
                    "title": title,
                    "updated_at": datetime.fromtimestamp(bucket['latest_message']['value'] / 1000.0).isoformat()
                })
            return sessions
        except Exception as e:
            logger.error(f"Error fetching session history for user {user_id}: {str(e)}")
            return []

    async def delete_session(self, session_id: str, user_id: str) -> bool:
        """Delete all messages associated with a session."""
        query = {
            "bool": {
                "must": [
                    { "term": { "session_id": session_id } },
                    { "term": { "user_id": user_id } }
                ]
            }
        }
        try:
            response = await self.client.delete_by_query(
                index=self.history_index,
                query=query,
                refresh=True
            )
            return response['deleted'] > 0
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {str(e)}")
            return False

    async def add_summary(self, summary: ESMemorySummary) -> ESMemorySummary:
        """Save a long-term compressed memory summary."""
        try:
            await self.client.index(
                index=self.summary_index,
                id=summary.summary_id,
                document=summary.model_dump(mode='json')
            )
            return summary
        except Exception as e:
            logger.error(f"Failed to index summary {summary.summary_id}: {str(e)}")
            raise

es_memory = ElasticsearchMemoryService()
