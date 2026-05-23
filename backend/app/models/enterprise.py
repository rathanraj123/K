import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Integer, Boolean
from sqlalchemy.sql import func
from app.db.session import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, index=True, nullable=False) # e.g., 'login', 'scan_upload', 'report_download'
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class ApiMetric(Base):
    __tablename__ = "api_metrics"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    endpoint = Column(String, index=True, nullable=False)
    method = Column(String, nullable=False)
    status_code = Column(Integer, index=True, nullable=False)
    latency_ms = Column(Float, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class AiModelMetric(Base):
    __tablename__ = "ai_model_metrics"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    model_name = Column(String, index=True, nullable=False)
    inference_time_ms = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=True)
    status = Column(String, nullable=False) # success, failure
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class AdminAction(Base):
    __tablename__ = "admin_actions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    admin_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action_type = Column(String, index=True, nullable=False)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class DiseaseStatistic(Base):
    __tablename__ = "disease_statistics"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    disease_name = Column(String, index=True, nullable=False)
    occurrence_count = Column(Integer, default=0)
    region = Column(String, index=True, nullable=True)
    last_detected = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class RealtimeEvent(Base):
    __tablename__ = "realtime_events"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    event_type = Column(String, index=True, nullable=False)
    payload = Column(JSON, nullable=False)
    is_processed = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class DailyScanStat(Base):
    __tablename__ = "daily_scan_stats"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    date = Column(DateTime, index=True, nullable=False)
    total_scans = Column(Integer, default=0)
    failed_scans = Column(Integer, default=0)
    avg_confidence = Column(Float, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class HourlyApiMetric(Base):
    __tablename__ = "hourly_api_metrics"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    timestamp = Column(DateTime, index=True, nullable=False)
    total_requests = Column(Integer, default=0)
    avg_latency_ms = Column(Float, default=0.0)
    error_count = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ActiveUserMetric(Base):
    __tablename__ = "active_user_metrics"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    date = Column(DateTime, index=True, nullable=False)
    daily_active_users = Column(Integer, default=0)
    monthly_active_users = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
