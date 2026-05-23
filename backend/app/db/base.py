# Import all models here so Alembic can discover them and Base.metadata is complete
from app.db.session import Base  # noqa

from app.models.user import User  # noqa
from app.models.agriculture import Crop, Disease, DiseaseDetection  # noqa
from app.models.cosmetic import CosmeticMapping, Recommendation  # noqa
from app.models.analytics import AILog, AnalyticsCache  # noqa
from app.models.notifications import Notification  # noqa
from app.models.chat import ChatThread, ChatMessage  # noqa
from app.models.enterprise import (  # noqa
    ActivityLog, ApiMetric, AiModelMetric, Session, AdminAction,
    DiseaseStatistic, RealtimeEvent, DailyScanStat, HourlyApiMetric, ActiveUserMetric
)
