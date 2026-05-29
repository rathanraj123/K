import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.agriculture import DiseaseDetection, InsightFeed

async def check():
    async with AsyncSessionLocal() as db:
        dets = (await db.execute(select(DiseaseDetection).order_by(DiseaseDetection.created_at.desc()).limit(10))).scalars().all()
        print('--- RECENT DETECTIONS ---')
        for d in dets:
            print(f'ID: {d.id}, Disease: {d.detected_disease}, Status: {d.status}, CreatedAt: {d.created_at}')
        
        feeds = (await db.execute(select(InsightFeed).order_by(InsightFeed.created_at.desc()).limit(5))).scalars().all()
        print('\n--- RECENT FEEDS ---')
        for f in feeds:
            print(f'Feed: {f.title}, Category: {f.category}')

if __name__ == "__main__":
    asyncio.run(check())
