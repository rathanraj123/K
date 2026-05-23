from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

class ESKnowledgeDocumentBase(BaseModel):
    title: str
    content: str
    source: str
    topic: str
    embedding: Optional[List[float]] = None

class ESKnowledgeDocumentCreate(ESKnowledgeDocumentBase):
    doc_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class ESKnowledgeDocument(ESKnowledgeDocumentCreate):
    pass
