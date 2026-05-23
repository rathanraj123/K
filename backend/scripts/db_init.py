import asyncio
import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.db.session import engine, Base
# Import all models to ensure they are registered with Base.metadata
from app.models.user import User
from app.models.analytics import AILog
from app.models.agriculture import Crop, Disease, DiseaseDetection

async def init_db():
    print(f"Creating tables for {engine.url}...")
    async with engine.begin() as conn:
        # Get all table names in public schema
        result = await conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        ))
        tables = result.scalars().all()
        
        if tables:
            print(f"Dropping tables: {', '.join(tables)}")
            for table in tables:
                await conn.execute(text(f"DROP TABLE IF EXISTS \"{table}\" CASCADE"))
        
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialization complete.")

if __name__ == "__main__":
    asyncio.run(init_db())
