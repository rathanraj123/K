import asyncio
from sqlalchemy import select
from app.db.session import engine
from app.models.user import User

async def check_users():
    async with engine.connect() as conn:
        result = await conn.execute(select(User.id, User.email, User.full_name, User.role, User.is_active, User.is_superuser))
        users = result.fetchall()
        print("Users in DB:")
        for u in users:
            print(dict(zip(["id", "email", "full_name", "role", "is_active", "is_superuser"], u)))

if __name__ == "__main__":
    asyncio.run(check_users())
