import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.agriculture import DiseaseDetection

async def debug_latest_failed():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(DiseaseDetection)
            .where(DiseaseDetection.status == "failed")
            .order_by(DiseaseDetection.created_at.desc())
            .limit(1)
        )
        detection = result.scalars().first()
        
        from app.modules.detection.service import detection_service
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.get(detection.image_url) as resp:
                image_bytes = await resp.read()
                
        try:
            await detection_service.predict_disease(
                image_bytes=image_bytes,
                lat=detection.scan_latitude,
                lon=detection.scan_longitude,
                crop_type=detection.crop_type or "Rice",
                user_role="farmer",
                language="English",
                detection_id=str(detection.id)
            )
            print("SUCCESS")
        except Exception as e:
            msg = str(e)
            if len(msg) > 500:
                print(f"Exception: {type(e).__name__} | Message starts with: {msg[:250]}... and ends with: {msg[-250:]}")
            else:
                print(f"Exception: {type(e).__name__} | Message: {msg}")

if __name__ == "__main__":
    asyncio.run(debug_latest_failed())
