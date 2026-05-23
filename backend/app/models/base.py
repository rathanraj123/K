"""
models/base.py
Imports every model so SQLAlchemy's Base.metadata is fully populated
before create_all() or Alembic autogenerate is called.
"""
from app.models.user import User  # noqa
from app.models.agriculture import DiseaseDetection, Crop, Disease  # noqa
from app.models.analytics import AILog, AnalyticsCache  # noqa
from app.models.chat import ChatSession, ChatMessage  # noqa
from app.models.cosmetic import CosmeticMapping, Recommendation  # noqa
from app.models.notifications import Notification  # noqa
from app.models.enterprise import (  # noqa
    ActivityLog, ApiMetric, AiModelMetric, Session, AdminAction,
    DiseaseStatistic, RealtimeEvent, DailyScanStat, HourlyApiMetric, ActiveUserMetric
)
