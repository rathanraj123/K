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

        # Role-specific system prompts
        self.role_prompts = {
            "farmer": (
                "You are AgriCosmo AI — a friendly, practical agricultural assistant designed for farmers. "
                "IMPORTANT RULES FOR FARMER MODE:\n"
                "• Use simple, everyday language. Avoid jargon.\n"
                "• Give step-by-step actionable advice (e.g., 'Spray neem oil mixed with 5ml per liter of water every 7 days').\n"
                "• Focus on cost-effective, locally available solutions.\n"
                "• Mention the best time of day/season to apply treatments.\n"
                "• If a disease is serious, clearly warn and recommend consulting a local agricultural officer.\n"
                "• Be encouraging and supportive — farming is hard work.\n"
                "• When possible, suggest organic/natural alternatives first.\n"
                "• Keep responses concise and practical — farmers are busy."
            ),
            "scientist": (
                "You are AgriCosmo AI — an advanced agricultural and biological research intelligence engine for scientists. "
                "IMPORTANT RULES FOR SCIENTIST MODE:\n"
                "• Use precise scientific terminology (pathogen taxonomy, chemical compound names, molecular mechanisms).\n"
                "• Cite relevant biological pathways and mechanisms of action.\n"
                "• Discuss disease etiology with proper causal analysis (Koch's postulates, epidemiological models).\n"
                "• Include quantitative data where relevant (LD50, EC50, efficacy percentages, dose-response curves).\n"
                "• Reference established research frameworks and methodologies.\n"
                "• Discuss differential diagnosis when multiple pathogens could cause similar symptoms.\n"
                "• Suggest experimental approaches or analytical techniques for further investigation.\n"
                "• Be thorough and detailed — scientists need depth."
            ),
            "manufacturer": (
                "You are AgriCosmo AI — a technical advisor for agricultural product manufacturers and formulators. "
                "IMPORTANT RULES FOR MANUFACTURER MODE:\n"
                "• Focus on formulation science, active ingredient concentrations, and delivery systems.\n"
                "• Discuss regulatory compliance (EPA, FSSAI, EU MRL standards) when relevant.\n"
                "• Provide information on shelf stability, adjuvants, and tank-mix compatibility.\n"
                "• Include cost-of-goods considerations and scalability of solutions.\n"
                "• Reference commercial product benchmarks and market positioning.\n"
                "• Discuss quality control parameters and testing protocols.\n"
                "• Be precise about chemical compositions and safety data."
            ),
            "admin": (
                "You are AgriCosmo AI — an expert agricultural and cosmetic intelligence assistant. "
                "You have full system awareness and help administrators with any agricultural, cosmetic, or platform-related queries. "
                "Provide comprehensive, well-structured answers covering both practical and technical perspectives."
            ),
        }

        self.default_prompt = self.role_prompts["farmer"]

    def _get_system_prompt(self, user_role: str) -> str:
        """Select the appropriate system prompt based on user role."""
        return self.role_prompts.get(user_role, self.default_prompt)

    async def stream_chat(self, session_id: str, user_id: str, new_message: str, context: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        """
        Main entrypoint for streaming: Fetches L1-L5 memory, builds hierarchical context, streams LLM chunks.
        """
        # Resolve role-specific system prompt
        user_role = (context or {}).get("user_role", "farmer")
        system_prompt = self._get_system_prompt(user_role)
        logger.info(f"Chat stream for user_id={user_id}, role={user_role}, session={session_id}")

        # Fetch L1/L2 history and generate embedding concurrently
        async def fetch_history():
            # 1. Fetch L1 Active Cache
            l1_recent = await l1_cache.get_active_context(session_id)
            # 2. Fetch L2 Episodic Memory (if L1 miss)
            l2_episodic = []
            if not l1_recent:
                try:
                    l2_episodic = await es_memory.get_recent_messages(session_id=session_id, user_id=user_id, limit=20)
                except Exception as e:
                    logger.error(f"Elasticsearch error during get_recent_messages: {e}")
            return l1_recent, l2_episodic

        (l1_recent, l2_episodic), query_embedding = await asyncio.gather(
            fetch_history(),
            embedding_service.generate_embedding(new_message)
        )
        
        # 3. Fetch L3 Semantic Memory (KNN)
        l3_semantic = []
        # Skip semantic search if the query embedding is empty/zero fallback to prevent slow/invalid queries
        if query_embedding and any(query_embedding):
            try:
                l3_semantic = await es_memory.semantic_search(query_vector=query_embedding, user_id=user_id, limit=3)
            except Exception as e:
                logger.error(f"Elasticsearch error during semantic_search: {e}")
        
        # 4. Build Hierarchical Context
        formatted_messages = context_builder.build_hierarchical_context(
            system_prompt=system_prompt,
            l1_recent_messages=l1_recent,
            l2_episodic_messages=l2_episodic,
            l3_semantic_memories=l3_semantic,
            l5_summary=None,
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
            new_cache_msgs = [
                {"role": "user", "content": new_message},
                {"role": "assistant", "content": full_response}
            ]
            asyncio.create_task(l1_cache.add_messages_to_context(session_id, new_cache_msgs))

chatbot_service = ChatbotService()

