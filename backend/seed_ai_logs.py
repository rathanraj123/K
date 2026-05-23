
import asyncio
import uuid
import random
from app.db.session import AsyncSessionLocal
from app.models.analytics import AILog
from app.models.user import User
from app.models.agriculture import DiseaseDetection

async def seed_logs():
    async with AsyncSessionLocal() as db:
        # Seed 20 random AI logs for the chart
        models = ["llama-3.1-70b", "mixtral-8x7b", "llama-3.3-70b-versatile"]
        for _ in range(20):
            log = AILog(
                model_used=random.choice(models),
                response_time_ms=random.uniform(500, 2500)
            )
            db.add(log)
        await db.commit()
        print("Successfully seeded 20 AI logs.")

if __name__ == "__main__":
    asyncio.run(seed_logs())
