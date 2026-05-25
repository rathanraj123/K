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
        
        from app.workers.tasks import run_detection_async
        
        # Load a dummy image to bypass aiohttp base64 crash
        # I'll just use a blank 10x10 jpeg
        import io
        from PIL import Image
        img = Image.new('RGB', (10, 10), color = 'green')
        b = io.BytesIO()
        img.save(b, format='JPEG')
        image_bytes = b.getvalue()
        
        try:
            print("Running task...")
            # We must redirect stdout to avoid massive printing
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
            
            # Print the output carefully
            out = f.getvalue()
            if len(out) > 1000:
                print("Logs: ", out[:500] + "\n...\n" + out[-500:])
            else:
                print("Logs: ", out)
                
        except Exception as e:
            print("Task threw an UNCAUGHT exception!")
            print(str(e)[:500])

if __name__ == "__main__":
    asyncio.run(debug_latest_failed())
