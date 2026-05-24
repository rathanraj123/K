from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings
 

engine_kwargs = {
    "echo": False,
    "future": True,
}
if settings.DATABASE_URL and "postgresql" in settings.DATABASE_URL:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["connect_args"] = {
        "timeout": 10.0,
        "command_timeout": 10.0,
        "statement_cache_size": 0,
    }

db_url = settings.DATABASE_URL
if db_url and "postgresql" in db_url:
    if "?" in db_url:
        db_url += "&prepared_statement_cache_size=0"
    else:
        db_url += "?prepared_statement_cache_size=0"

engine = create_async_engine(
    db_url,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

Base = declarative_base()

async def get_db() -> AsyncSession: # type: ignore
    async with AsyncSessionLocal() as session:
        yield session
