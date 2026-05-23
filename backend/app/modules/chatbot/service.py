import httpx
import logging
import asyncio
import json
from typing import List, Dict, Any, Tuple, Optional, AsyncGenerator
from app.core.config import settings
from app.core.exceptions import AIServiceError
from app.schemas.chatbot import ChatResponse
from app.schemas.es_chat import ESChatMessageCreate
from app.memory.es_service import es_memory
from app.memory.context_builder import context_builder
from app.cache.cache_service import l1_cache
from app.vector.embedding import embedding_service
from app.memory.compression import compression_engine
import groq

logger = logging.getLogger(__name__)

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED" 

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = asyncio.get_event_loop().time()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.error("Circuit Breaker OPEN - Routing traffic away from downstream service.")

    def record_success(self):
        self.failure_count = 0
        self.state = "CLOSED"

    def can_execute(self) -> bool:
        if self.state == "CLOSED": return True
        if self.state == "OPEN":
            if asyncio.get_event_loop().time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF-OPEN"
                return True
            return False
        return True

class ChatbotService:
    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.hf_api_key = settings.HUGGINGFACE_API_KEY
        # Use AsyncGroq for streaming support
        self.groq_client = groq.AsyncGroq(api_key=self.groq_api_key, max_retries=1) if self.groq_api_key else None
        self.groq_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=120)
        self.system_prompt = "You are AgriCosmo AI, an expert agricultural and cosmetic intelligence assistant. You help users with plant diseases, crop recommendations, and plant-based skincare advice."

    async def stream_chat(self, session_id: str, user_id: str, new_message: str, context: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        """
        Main entrypoint for streaming: Fetches L1-L5 memory, builds hierarchical context, streams LLM chunks.
        """
        # 1. Fetch L1 Active Cache
        l1_recent = await l1_cache.get_active_context(session_id)
        
        # 2. Fetch L2 Episodic Memory (if L1 miss)
        l2_episodic = []
        if not l1_recent:
            l2_episodic = await es_memory.get_recent_messages(session_id=session_id, user_id=user_id, limit=20)
            
        # 3. Generate query embedding for L3 Semantic Search
        query_embedding = await embedding_service.generate_embedding(new_message)
        
        # 4. Fetch L3 Semantic Memory (KNN)
        l3_semantic = await es_memory.semantic_search(query_vector=query_embedding, user_id=user_id, limit=3)
        
        # 5. Build Hierarchical Context
        # Note: L5 summary logic would go here by retrieving the summary from ES
        formatted_messages = context_builder.build_hierarchical_context(
            system_prompt=self.system_prompt,
            l1_recent_messages=l1_recent,
            l2_episodic_messages=l2_episodic,
            l3_semantic_memories=l3_semantic,
            l5_summary=None, # Simplified for now
            new_message=new_message
        )

        full_response = ""
        
        # 6. Stream from LLM
        if self.groq_client and self.groq_breaker.can_execute():
            try:
                stream = await self.groq_client.chat.completions.create(
                    messages=formatted_messages,
                    model="llama-3.3-70b-versatile",
                    temperature=0.7,
                    max_tokens=1024,
                    stream=True
                )
                async for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        full_response += content
                        # Yield Server-Sent Events (SSE) format
                        yield f"data: {json.dumps({'content': content})}\n\n"
                        
                self.groq_breaker.record_success()
                
            except Exception as e:
                self.groq_breaker.record_failure()
                logger.warning(f"Groq streaming failed: {e}. Falling back.")
                # Fallback to non-streaming error message for simplicity
                err_msg = "I'm sorry, I'm having trouble responding right now."
                full_response = err_msg
                yield f"data: {json.dumps({'content': err_msg})}\n\n"
        
        # 7. Finalize and signal end
        yield "data: [DONE]\n\n"
        
        # 8. Background caching (L1 update)
        if full_response:
            # We don't save to ES here. Router BackgroundTasks handles ES.
            # But we update Redis cache immediately.
            new_cache_msgs = [
                {"role": "user", "content": new_message},
                {"role": "assistant", "content": full_response}
            ]
            asyncio.create_task(l1_cache.add_messages_to_context(session_id, new_cache_msgs))

chatbot_service = ChatbotService()
