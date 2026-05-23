import asyncio
from sqlalchemy import select
from app.db.session import engine
from app.models.chat import ChatThread, ChatMessage

async def find_symptoms_in_db():
    async with engine.connect() as conn:
        result = await conn.execute(select(ChatMessage).where(ChatMessage.content.ilike('%Blight%')))
        msgs = result.all()
        print(f"Messages found with 'Blight': {len(msgs)}")
        for m in msgs:
            # Get thread info
            t_res = await conn.execute(select(ChatThread).where(ChatThread.id == m.thread_id))
            t = t_res.first()
            print(f"  - Msg: {m.content[:50]}...")
            print(f"    - Thread ID: {m.thread_id} (Title: {t.title if t else 'NON-EXISTENT'})")
            print(f"    - Role: {m.role}")

if __name__ == "__main__":
    asyncio.run(find_symptoms_in_db())
