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
        
        # Test background task logic directly
        from app.workers.tasks import run_detection_async
        import aiohttp
        
        if not detection.image_url:
            print("No image URL. Can't test.")
            return
            
        print(f"Downloading image from {detection.image_url}...")
        async with aiohttp.ClientSession() as session:
            async with session.get(detection.image_url) as resp:
                image_bytes = await resp.read()
                
        try:
            await run_detection_async(
                detection_id=str(detection.id),
                image_bytes=image_bytes,
                lat=detection.scan_latitude,
                lon=detection.scan_longitude,
                crop_type=detection.crop_type or "Rice",
                user_role="farmer",
                language="English"
            )
            print("Finished run_detection_async without throwing!")
        except Exception as e:
            import traceback
            tb_str = traceback.format_exc()
            with open("error_traceback.txt", "w", encoding="utf-8") as f:
                f.write(tb_str)
            print("Wrote exception to error_traceback.txt")

if __name__ == "__main__":
    asyncio.run(debug_latest_failed())
