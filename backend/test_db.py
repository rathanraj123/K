import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import sys

async def test_conn():
    # Attempting to read from config or use defaults
    user = "postgres"
    password = "postgres"
    server = "localhost"
    port = "5432"
    db = "agricosmo"
    
    url = f"postgresql+asyncpg://{user}:{password}@{server}:{port}/{db}"
    print(f"Testing connection to: postgresql+asyncpg://{user}:*****@{server}:{port}/{db}")
    
    try:
        engine = create_async_engine(url)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            print("\n✅ SUCCESS: Successfully connected to the database!")
    except Exception as e:
        print("\n❌ ERROR: Connection failed.")
        print(f"Message: {str(e)}")
        if "password authentication failed" in str(e):
            print("\n💡 TIP: Your PostgreSQL password in .env is incorrect.")
        elif "database \"agricosmo\" does not exist" in str(e):
            print("\n💡 TIP: You need to create the 'agricosmo' database in PostgreSQL.")
        elif "Connection refused" in str(e):
            print("\n💡 TIP: PostgreSQL is not running on localhost:5432.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_conn())
