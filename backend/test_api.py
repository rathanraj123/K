import asyncio
from sqlalchemy import select
from app.db.session import engine
from app.models.chat import ChatThread, ChatMessage
from app.models.user import User
from app.core.security import create_access_token
from datetime import timedelta
from app.core.config import settings
import httpx

async def test_api():
    async with engine.connect() as conn:
        user_res = await conn.execute(select(User).where(User.email == 'battularathanraj@gmail.com'))
        user = user_res.first()
        if not user:
            print("User not found")
            return
        
        print(f"User ID: {user.id}")
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token = create_access_token(
            user.id, expires_delta=access_token_expires
        )
        print("Generated Token")

    async with httpx.AsyncClient() as client:
        # Hit the threads endpoint
        headers = {"Authorization": f"Bearer {token}"}
        print("Fetching threads...")
        resp = await client.get("http://127.0.0.1:8000/api/v1/chatbot/threads", headers=headers)
        print(f"Status: {resp.status_code}")
        try:
            print("Response:", resp.json())
        except:
             print("Response text:", resp.text)

if __name__ == "__main__":
    asyncio.run(test_api())
