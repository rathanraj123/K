from pydantic import BaseModel, UUID4
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatMessageBase(BaseModel):
    role: str # "user", "assistant", "system"
    content: str

class ChatMessageCreate(ChatMessageBase):
    thread_id: str

class ChatMessage(ChatMessageBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatThreadBase(BaseModel):
    title: Optional[str] = "New Conversation"

class ChatThreadCreate(ChatThreadBase):
    pass

class ChatThread(ChatThreadBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    messages: List[ChatMessageBase]
    thread_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    message: str
    provider: str
    thread_id: Optional[str] = None
