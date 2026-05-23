import logging
from typing import List, Dict, Any, Optional
from app.schemas.es_chat import ESChatMessage

logger = logging.getLogger(__name__)

class ContextBuilder:
    def __init__(self, max_tokens: int = 4000):
        # A simple token approximation: 1 token ~ 4 characters
        self.max_tokens = max_tokens
        self.chars_per_token = 4

    def build_hierarchical_context(
        self, 
        system_prompt: str, 
        l1_recent_messages: List[Dict[str, Any]], 
        l2_episodic_messages: List[ESChatMessage], 
        l3_semantic_memories: List[ESChatMessage],
        l5_summary: Optional[str],
        new_message: str
    ) -> List[Dict[str, str]]:
        """
        Builds a hierarchical context window using multiple memory layers.
        Priority: System -> Summary (L5) -> Semantic Memory (L3) -> Recent Cache (L1/L2) -> New Message
        """
        formatted_messages = []
        used_tokens = 0
        
        # 1. System Prompt (Highest Priority)
        formatted_messages.append({"role": "system", "content": system_prompt})
        used_tokens += len(system_prompt) / self.chars_per_token
        
        # 2. Add Summary Context (L5) if available
        if l5_summary:
            summary_msg = f"--- PREVIOUS CONVERSATION SUMMARY ---\n{l5_summary}\n-------------------------------------"
            formatted_messages.append({"role": "system", "content": summary_msg})
            used_tokens += len(summary_msg) / self.chars_per_token
            
        # 3. Add Semantic Memory (L3) context
        if l3_semantic_memories:
            semantic_text = "--- RELEVANT PAST KNOWLEDGE ---\n"
            for mem in l3_semantic_memories:
                semantic_text += f"Past interaction: {mem.content}\n"
            semantic_text += "-------------------------------"
            
            # Check if it fits
            semantic_tokens = len(semantic_text) / self.chars_per_token
            if used_tokens + semantic_tokens < self.max_tokens * 0.7: # Reserve 30% for active chat
                formatted_messages.append({"role": "system", "content": semantic_text})
                used_tokens += semantic_tokens

        # 4. Reserve space for New Message
        new_msg_tokens = len(new_message) / self.chars_per_token
        
        # 5. Add Active History (L1 Cache or L2 Database)
        # Prefer L1 if it exists and is populated, else fallback to L2
        active_history = []
        if l1_recent_messages:
            active_history = [{"role": msg.get("role", "user"), "content": msg.get("content", "")} for msg in l1_recent_messages]
        else:
            active_history = [{"role": msg.role, "content": msg.content} for msg in l2_episodic_messages]
            
        # Add history in chronological order, checking token limits from oldest to newest
        history_to_include = []
        available_tokens = self.max_tokens - used_tokens - new_msg_tokens
        
        for msg in reversed(active_history): # Iterate backwards (newest first)
            msg_tokens = len(msg["content"]) / self.chars_per_token
            if msg_tokens <= available_tokens:
                history_to_include.insert(0, msg)
                available_tokens -= msg_tokens
            else:
                logger.info("Context window full, truncating active history.")
                break
                
        formatted_messages.extend(history_to_include)
        
        # 6. Add New Message
        formatted_messages.append({"role": "user", "content": new_message})
        
        return formatted_messages

context_builder = ContextBuilder()
