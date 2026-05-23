import asyncio
from sqlalchemy import select, func
from app.db.session import engine
from app.models.user import User
from app.models.agriculture import DiseaseDetection
from app.models.enterprise import ActivityLog, ApiMetric, Session, DiseaseStatistic, HourlyApiMetric

async def debug_tables():
    async with engine.connect() as conn:
        print("Checking tables...")
        for model in [User, DiseaseDetection, ActivityLog, ApiMetric, Session, DiseaseStatistic, HourlyApiMetric]:
            try:
                result = await conn.execute(select(func.count()).select_from(model))
                count = result.scalar()
                print(f"Table {model.__tablename__}: {count} records")
            except Exception as e:
                print(f"Table {model.__tablename__} ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(debug_tables())
