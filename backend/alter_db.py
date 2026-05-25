import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def alter():
    print(f"Connecting to: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE'))
    print('Altered table successfully')

asyncio.run(alter())
