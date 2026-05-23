from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class ESChatMessageBase(BaseModel):
    session_id: str
    user_id: str
    role: str = Field(..., description="user, assistant, system, tool, disease_scan, summary, context, memory_note, retrieved_knowledge")
    content: str
    message_type: str = "text"
    disease_context: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    importance_score: int = Field(default=5, ge=1, le=10)
    relevance_score: Optional[float] = None
    embedding: Optional[List[float]] = None

class ESChatMessageCreate(ESChatMessageBase):
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ESChatMessage(ESChatMessageCreate):
    pass

class ESMemorySummary(BaseModel):
    summary_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str
    summary_content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    covered_message_ids: List[str]
    embedding: Optional[List[float]] = None
