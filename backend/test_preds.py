import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.services.disease_trend_service import DiseaseTrendService

async def test_predictions():
    async with AsyncSessionLocal() as db:
        # Pass None for user_id to get global predictions
        preds = await DiseaseTrendService.get_predictions(db, user_id=None)
        print("GLOBAL PREDS:", preds)
        
        # Now try with a specific user (the first user we can find)
        from sqlalchemy import select
        from app.models.agriculture import DiseaseDetection
        det = (await db.execute(select(DiseaseDetection).limit(1))).scalars().first()
        if det:
            user_preds = await DiseaseTrendService.get_predictions(db, user_id=det.user_id)
            print("USER PREDS:", user_preds)

if __name__ == "__main__":
    asyncio.run(test_predictions())
