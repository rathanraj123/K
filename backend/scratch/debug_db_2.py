import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/..'))

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from sqlalchemy import text

async def test():
    e = create_async_engine(settings.DATABASE_URL)
    async with e.connect() as c:
        try:
            await c.execute(text('SELECT 1 FROM ai_logs LIMIT 1'))
            print("ai_logs table EXISTS!")
        except Exception as ex:
            print("ai_logs table does NOT exist:", ex)
            
        try:
            await c.execute(text('SELECT is_pinned FROM disease_detections LIMIT 1'))
            print("is_pinned column EXISTS!")
        except Exception as ex:
            print("is_pinned column does NOT exist:", ex)
            
        try:
            await c.execute(text('SELECT thumbnail_url FROM disease_detections LIMIT 1'))
            print("thumbnail_url column EXISTS!")
        except Exception as ex:
            print("thumbnail_url column does NOT exist:", ex)

if __name__ == "__main__":
    asyncio.run(test())
