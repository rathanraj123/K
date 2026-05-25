from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from app.db.session import Base
import uuid

class TreatmentTrack(Base):
    __tablename__ = "treatment_tracks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    detection_id = Column(String(36), ForeignKey("disease_detections.id"), nullable=False, index=True)
    treatment_applied = Column(String, nullable=False)
    recovery_progress = Column(Integer, default=0) # 0-100 percentage
    feedback_rating = Column(Integer, nullable=True) # 1-5 rating
    comments = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
