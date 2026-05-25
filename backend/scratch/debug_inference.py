import asyncio
import os
import sys

# Add project root to path
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
        
        if not detection:
            print("No failed detections found.")
            return
            
        print(f"Found failed detection: {detection.id}")
        
        # Try to run the detection service directly to see the error!
        from app.modules.detection.service import detection_service
        import aiohttp
        
        # We need the image bytes. Since the image was uploaded to Supabase, we can download it.
        if not detection.image_url:
            print("No image URL. Can't test.")
            return
            
        print(f"Downloading image from {detection.image_url}...")
        async with aiohttp.ClientSession() as session:
            async with session.get(detection.image_url) as resp:
                image_bytes = await resp.read()
                
        print(f"Downloaded {len(image_bytes)} bytes. Running detection...")
        try:
            res = await detection_service.predict_disease(
                image_bytes=image_bytes,
                lat=detection.scan_latitude,
                lon=detection.scan_longitude,
                crop_type=detection.crop_type or "Rice",
                user_role="farmer",
                language="English",
                detection_id=str(detection.id)
            )
            print("SUCCESS??", res)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_latest_failed())
