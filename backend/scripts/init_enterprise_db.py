import asyncio
import sys
import os

# Add backend directory to sys path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine, Base
# Import all models to ensure they are registered with Base.metadata
from app.models.user import User
from app.models.agriculture import DiseaseDetection, Crop, Disease
from app.models.analytics import AILog, AnalyticsCache
from app.models.chat import ChatSession, ChatMessage
from app.models.cosmetic import CosmeticMapping, Recommendation
from app.models.notifications import Notification
from app.models.enterprise import ActivityLog, ApiMetric, AiModelMetric, Session, AdminAction, DiseaseStatistic, RealtimeEvent, DailyScanStat, HourlyApiMetric, ActiveUserMetric

async def init_db():
    print("Initializing Enterprise Database Schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(init_db())
