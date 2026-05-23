import asyncio
from sqlalchemy import select
from app.db.session import engine
from app.models.chat import ChatThread, ChatMessage
from app.models.user import User

async def debug_admin_chats():
    async with engine.connect() as conn:
        # Get admin
        admin_result = await conn.execute(select(User).where(User.email == 'admin@agricosmo.ai'))
        admin = admin_result.first()
        if admin:
            print(f"Admin ID: {admin.id}")
            # Check threads for this admin
            threads_result = await conn.execute(select(ChatThread).where(ChatThread.user_id == admin.id))
            threads = threads_result.all()
            print(f"Total Threads for Admin: {len(threads)}")
            for t in threads:
                print(f"  - Thread: {t.title} (ID: {t.id})")
        else:
            print("Admin user not found")

if __name__ == "__main__":
    asyncio.run(debug_admin_chats())
