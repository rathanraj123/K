import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import EVERYTHING so SQLAlchemy knows all tables
import app.models.user
import app.models.agriculture
import app.models.analytics
import app.models.enterprise

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
        
        from app.workers.tasks import run_detection_async
        
        # Load a dummy image to bypass aiohttp base64 crash
        import io
        from PIL import Image
        img = Image.new('RGB', (10, 10), color = 'green')
        b = io.BytesIO()
        img.save(b, format='JPEG')
        image_bytes = b.getvalue()
        
        try:
            print("Running task...")
            import contextlib
            f = io.StringIO()
            with contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
                await run_detection_async(
                    detection_id=str(detection.id),
                    image_bytes=image_bytes,
                    lat=detection.scan_latitude,
                    lon=detection.scan_longitude,
                    crop_type=detection.crop_type or "Rice",
                    user_role="farmer",
                    language="English"
                )
            
            # Now let's check what the status is
            updated_det = await db.get(DiseaseDetection, detection.id)
            print(f"Task completed. Final DB status: {updated_det.status}")
            
            out = f.getvalue()
            if "logger.error" in out or "Exception" in out or "Error" in out or "Traceback" in out:
                print("Task had an error logged inside:")
                print(out[:1000])
                
        except Exception as e:
            print("Task threw an UNCAUGHT exception!")
            print(str(e)[:500])

if __name__ == "__main__":
    asyncio.run(debug_latest_failed())
