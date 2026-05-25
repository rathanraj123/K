import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import app.models.user
import app.models.agriculture
import app.models.analytics
import app.models.enterprise

from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.agriculture import DiseaseDetection

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(DiseaseDetection)
            .where(DiseaseDetection.status == 'failed')
            .order_by(DiseaseDetection.created_at.desc())
            .limit(5)
        )
        for d in res.scalars():
            print(f"ID: {d.id}, Created: {d.created_at}")
            print(f"Explanation: {getattr(d, 'explanation', 'None')}")

if __name__ == "__main__":
    asyncio.run(check())
