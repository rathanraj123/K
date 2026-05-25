import asyncio
import os
import sys
import io
import contextlib

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
                
        # Run prediction
        f = io.StringIO()
        with contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
            import logging
            logging.getLogger().setLevel(logging.CRITICAL)
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
            except Exception as e:
                import traceback
                tb_str = traceback.format_exc()
                
        # Outside of the capture, print truncated lines
        if 'tb_str' in locals():
            lines = tb_str.split("\n")
            for line in lines:
                if len(line) > 200:
                    print(line[:200] + " ... [TRUNCATED]")
                else:
                    print(line)
        else:
            print("NO EXCEPTION OCCURRED. Output was:")
            print(f.getvalue()[:1000])

if __name__ == "__main__":
    asyncio.run(debug_latest_failed())
