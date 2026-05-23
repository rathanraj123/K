import logging
from typing import List
from app.schemas.es_chat import ESChatMessage, ESMemorySummary
from app.memory.es_service import es_memory
from app.vector.embedding import embedding_service
import groq
from app.core.config import settings

logger = logging.getLogger(__name__)

class CompressionEngine:
    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.client = groq.AsyncGroq(api_key=self.groq_api_key) if self.groq_api_key else None
        
    async def summarize_old_messages(self, session_id: str, user_id: str, messages: List[ESChatMessage]) -> ESMemorySummary:
        """
        Generate a dense summary of old messages to compress context window.
        """
        if not self.client:
            logger.warning("No Groq API key available for summarization.")
            raise Exception("Summarization requires an LLM provider.")
            
        # 1. Format the conversation
        conversation_text = ""
        message_ids = []
        for msg in messages:
            conversation_text += f"{msg.role.capitalize()}: {msg.content}\n"
            message_ids.append(msg.message_id)
            
        prompt = f"""
        Summarize the following agricultural AI conversation into a dense, highly factual summary.
        Retain all specific technical details, crop names, diseases, and recommended treatments.
        Omit pleasantries and greetings. Keep it under 150 words.
        
        Conversation:
        {conversation_text}
        """
        
        try:
            # 2. Call LLM for summary
            completion = await self.client.chat.completions.create(
                messages=[{"role": "system", "content": "You are a memory compression AI. Be extremely concise and factual."},
                          {"role": "user", "content": prompt}],
                model="llama3-8b-8192", # Using a smaller/faster model for internal summarization
                temperature=0.3,
                max_tokens=256
            )
            
            summary_content = completion.choices[0].message.content
            
            # 3. Generate Semantic Embedding
            embedding = await embedding_service.generate_embedding(summary_content)
            
            # 4. Create and Save Summary Document
            summary_doc = ESMemorySummary(
                session_id=session_id,
                user_id=user_id,
                summary_content=summary_content,
                covered_message_ids=message_ids,
                embedding=embedding
            )
            
            await es_memory.add_summary(summary_doc)
            logger.info(f"Successfully compressed {len(messages)} messages for session {session_id}")
            return summary_doc
            
        except Exception as e:
            logger.error(f"Compression failed: {str(e)}")
            raise

compression_engine = CompressionEngine()
