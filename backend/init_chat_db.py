import asyncio
from app.db.session import engine
from app.db.base import Base

async def create_tables():
    print("Connecting to database...")
    async with engine.begin() as conn:
        print("Creating new tables (chat_threads, chat_messages)...")
        # This will only create tables that don't exist
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())
