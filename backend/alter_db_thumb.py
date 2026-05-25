import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def alter():
    print(f"Connecting to: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE disease_detections ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR'))
    print('Altered table successfully')

asyncio.run(alter())
