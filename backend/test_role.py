import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.models.user import User

async def main():
    engine = create_async_engine('sqlite+aiosqlite:///backend/agricosmo.db')
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as db:
        res = await db.execute(select(User).where(User.full_name == 'rathan'))
        u = res.scalars().first()
        if u:
            print('role:', repr(u.role), 'type:', type(u.role), 'is farmer?:', u.role == 'farmer')
        else:
            print('user not found')

asyncio.run(main())
