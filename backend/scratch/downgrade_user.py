import asyncio
from sqlalchemy import select, update
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole

async def downgrade_user():
    async with AsyncSessionLocal() as db:
        # Revert the specific admin emails back to farmer
        emails = ["battularathanraj@gmail.com", "ratha@gmail.com"]
        for email in emails:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalars().first()
            if user:
                user.role = UserRole.FARMER
                user.is_superuser = False
                print(f"Reverted user: {email} back to FARMER")
        
        await db.commit()
    print("Done updating users!")

if __name__ == "__main__":
    asyncio.run(downgrade_user())
