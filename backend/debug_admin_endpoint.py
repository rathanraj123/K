import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.agriculture import DiseaseDetection
from app.models.enterprise import Session, HourlyApiMetric
import datetime

async def test_endpoint():
    async with AsyncSessionLocal() as db:
        total_users_q = await db.execute(select(func.count(User.id)))
        total_users = total_users_q.scalar() or 0

        total_scans_q = await db.execute(select(func.count(DiseaseDetection.id)))
        total_scans = total_scans_q.scalar() or 0

        active_sessions_q = await db.execute(select(func.count(Session.id)).where(Session.is_active == True))
        active_sessions = active_sessions_q.scalar() or 0

        today = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
        api_calls_q = await db.execute(select(func.sum(HourlyApiMetric.total_requests)).where(HourlyApiMetric.timestamp >= today))
        api_calls = api_calls_q.scalar() or 0
        
        avg_latency_q = await db.execute(select(func.avg(HourlyApiMetric.avg_latency_ms)).where(HourlyApiMetric.timestamp >= today))
        avg_latency = avg_latency_q.scalar() or 0

        stats = {
            "total_users": total_users,
            "total_scans": total_scans,
            "active_users": active_sessions,
            "api_calls": int(api_calls) if api_calls else 0,
            "avg_latency": round(avg_latency, 2) if avg_latency else 0
        }
        print("Computed stats:", stats)

if __name__ == "__main__":
    asyncio.run(test_endpoint())
