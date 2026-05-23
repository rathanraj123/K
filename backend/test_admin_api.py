import asyncio
from app.db.session import engine
from sqlalchemy import select
from app.models.user import User
from app.core.security import create_access_token
from datetime import timedelta
from app.core.config import settings
import httpx

async def test_admin_api():
    async with engine.connect() as conn:
        user_res = await conn.execute(select(User).where(User.email == 'admin@agricosmo.ai'))
        user = user_res.first()
        if not user:
            print("Admin not found")
            return
        
        token = create_access_token(user.id, expires_delta=timedelta(minutes=60))

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        print("Fetching /analytics/dashboard-summary")
        resp = await client.get("http://127.0.0.1:8000/api/v1/analytics/dashboard-summary", headers=headers)
        print(f"Status: {resp.status_code}")
        print("Response:", resp.json())
        
        print("Fetching /analytics/user-activity")
        resp = await client.get("http://127.0.0.1:8000/api/v1/analytics/user-activity", headers=headers)
        print(f"Status: {resp.status_code}")
        print("Response:", resp.json() if resp.status_code == 200 else resp.text)

if __name__ == "__main__":
    asyncio.run(test_admin_api())
