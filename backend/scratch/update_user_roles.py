import asyncio
from sqlalchemy import select, update
from app.db.session import engine, AsyncSessionLocal
from app.models.user import User, UserRole

async def update_users():
    async with AsyncSessionLocal() as db:
        emails = ["admin@agricosmo.ai", "battularathanraj@gmail.com", "ratha@gmail.com", "myadmin@example.com"]
        for email in emails:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalars().first()
            if user:
                user.role = UserRole.ADMIN
                user.is_superuser = True
                print(f"Updated user: {email} to ADMIN and superuser")
        
        # Also let's check if there are any other admin emails that need update
        result = await db.execute(select(User).where(User.email.like("%admin%")))
        admin_users = result.scalars().all()
        for u in admin_users:
            u.role = UserRole.ADMIN
            u.is_superuser = True
            print(f"Updated user: {u.email} to ADMIN and superuser")
            
        await db.commit()
    print("Done updating users!")

if __name__ == "__main__":
    asyncio.run(update_users())
