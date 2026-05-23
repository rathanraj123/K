import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base

class Notification(Base):
    """Stores system and AI-driven alerts for users."""
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, nullable=False) # e.g. "alert", "insight", "system"
    is_read = Column(Boolean, default=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
