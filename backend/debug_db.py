import asyncio
from sqlalchemy import select
from app.db.session import engine
from app.models.chat import ChatThread, ChatMessage
from app.models.user import User

async def debug_chat_data():
    async with engine.connect() as conn:
        # Check users
        users_result = await conn.execute(select(User))
        users = users_result.all()
        print(f"Total Users in DB: {len(users)}")
        for u in users:
            print(f"  - User: {u.email} (ID: {u.id})")
            
        # Check threads
        threads_result = await conn.execute(select(ChatThread))
        threads = threads_result.all()
        print(f"Total Chat Threads: {len(threads)}")
        for t in threads:
            print(f"  - Thread: {t.title} (ID: {t.id}, UserID: {t.user_id})")
            
        # Check messages
        msgs_result = await conn.execute(select(ChatMessage))
        msgs = msgs_result.all()
        print(f"Total Chat Messages: {len(msgs)}")

if __name__ == "__main__":
    asyncio.run(debug_chat_data())
