import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.agriculture import DiseaseDetection

async def extract():
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(DiseaseDetection)
            .where(DiseaseDetection.status == 'failed')
            .order_by(DiseaseDetection.created_at.desc())
            .limit(1)
        )
        d = res.scalars().first()
        if d:
            print(f"ID: {d.id}")
            if d.image_url and d.image_url.startswith('data:image'):
                b64_data = d.image_url.split(',')[1]
                import base64
                with open('scratch/failed_image.jpg', 'wb') as f:
                    f.write(base64.b64decode(b64_data))
                print("Saved to scratch/failed_image.jpg")
            else:
                print("Image URL is not base64:", d.image_url[:50])

if __name__ == "__main__":
    asyncio.run(extract())
