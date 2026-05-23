import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer
from sqlalchemy.sql import func
import enum
from app.db.session import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FARMER = "farmer"
    SCIENTIST = "scientist"
    MANUFACTURER = "manufacturer"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.FARMER, nullable=False)
    
    # Profile Extensions
    skin_type = Column(String, nullable=True)
    region = Column(String, nullable=True)
    preferences = Column(String, nullable=True) # JSON string or plain text
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False, index=True) # Soft delete
    
    # Monetization limits
    subscription_tier = Column(String, default="free") # free, pro, enterprise
    ai_calls_limit = Column(Integer, default=100)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
