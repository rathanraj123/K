import asyncio
from datetime import datetime
from app.db.session import AsyncSessionLocal
from app.models.agriculture import DiseaseDetection
from app.models.user import User  # IMPORT THIS TO FIX FK
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        # Get any real user
        user = (await db.execute(select(User).limit(1))).scalars().first()
        user_id = user.id if user else '00000000-0000-0000-0000-000000000000'

        for _ in range(50):
            db.add(DiseaseDetection(
                user_id=user_id, 
                image_url='', 
                status='completed', 
                confidence=0.99, 
                severity='High', 
                detected_disease='blast', 
                created_at=now
            ))
        await db.commit()
        print('Added 50 blast detections!')

if __name__ == '__main__':
    asyncio.run(main())
