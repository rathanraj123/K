import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__) + '/..'))

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from sqlalchemy import text

async def test():
    e = create_async_engine(settings.DATABASE_URL)
    
    tables = [
        "ai_logs",
        "daily_scan_stats",
        "disease_statistics"
    ]
    
    for table in tables:
        async with e.connect() as c:
            try:
                await c.execute(text(f'SELECT 1 FROM {table} LIMIT 1'))
                print(f"{table} table EXISTS!")
            except Exception as ex:
                print(f"{table} table does NOT exist")

if __name__ == "__main__":
    asyncio.run(test())
