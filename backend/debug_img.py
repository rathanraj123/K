import asyncio
from app.db.session import engine
from sqlalchemy import select
from app.models.agriculture import DiseaseDetection

async def check_img():
    async with engine.connect() as conn:
        res = await conn.execute(select(DiseaseDetection))
        records = res.all()
        for r in records:
            print(f"ID: {r.id}, ImageURL: '{r.image_url}', Disease: {r.detected_disease}")

if __name__ == '__main__':
    asyncio.run(check_img())
