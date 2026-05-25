import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Crop(Base):
    __tablename__ = "crops"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    optimal_conditions = Column(JSON, nullable=True) # specific temp, soil type, etc.
    
    diseases = relationship("Disease", back_populates="crop")

class Disease(Base):
    __tablename__ = "diseases"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    crop_id = Column(String(36), ForeignKey("crops.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    treatment = Column(String, nullable=True)
    
    crop = relationship("Crop", back_populates="diseases")

class DiseaseDetection(Base):
    __tablename__ = "disease_detections"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    image_url = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    detected_disease = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    status = Column(String, default="completed") # processing, completed, failed
    severity = Column(String, nullable=True) # None, Low, Medium, High
    explainability_meta = Column(JSON, nullable=True)
    explanation = Column(String, nullable=True)
    treatments = Column(JSON, nullable=True)
    farmer_treatments = Column(JSON, nullable=True)
    scientist_data = Column(JSON, nullable=True)
    cosmetic_insights = Column(JSON, nullable=True)

    # ─── New Intelligence Fields ─────────────────────────────────
    # Disease identity
    scientific_name = Column(String, nullable=True)
    disease_category = Column(String, nullable=True)       # fungal/bacterial/viral/pest/none
    spread_risk = Column(String, nullable=True)             # low/moderate/high/critical
    contagiousness = Column(String, nullable=True)
    crop_stage_affected = Column(String, nullable=True)

    # ─── New Role-Specific Intelligence ──────────────────────────
    farmer_report = Column(JSON, nullable=True)
    scientist_report = Column(JSON, nullable=True)
    
    # ─── Legacy Fields (Kept for backwards compatibility) ────────
    confidence_breakdown = Column(JSON, nullable=True)
    explainable_ai = Column(JSON, nullable=True)
    agronomist_recommendation = Column(JSON, nullable=True)
    yield_loss_estimate = Column(JSON, nullable=True)
    disease_timeline = Column(JSON, nullable=True)
    similar_diseases = Column(JSON, nullable=True)
    detailed_treatments = Column(JSON, nullable=True)
    smart_products = Column(JSON, nullable=True)
    
    # Environmental context
    image_quality = Column(JSON, nullable=True)             # {scan_quality_score, metrics, ...}
    weather_risk = Column(JSON, nullable=True)              # {conditions, risk, correlations}
    
    # Geolocation metadata
    scan_latitude = Column(Float, nullable=True)
    scan_longitude = Column(Float, nullable=True)
    scan_location_name = Column(String, nullable=True)
    crop_type = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DetectionFeedback(Base):
    __tablename__ = "detection_feedbacks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    detection_id = Column(String(36), ForeignKey("disease_detections.id"), nullable=False)
    corrected_disease = Column(String, nullable=True)
    rating = Column(Integer, nullable=True)
    comments = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
