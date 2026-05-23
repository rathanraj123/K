import asyncio
from app.db.session import engine
from sqlalchemy import select
from app.models.user import User
from app.core.security import create_access_token
from datetime import timedelta
import httpx

async def test_analytics():
    async with engine.connect() as conn:
        res = await conn.execute(select(User).where(User.email == 'admin@agricosmo.ai'))
        admin = res.first()
        token = create_access_token(admin.id, expires_delta=timedelta(minutes=60))
        
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        endpoints = [
            "/api/v1/analytics/dashboard-summary",
            "/api/v1/analytics/system-logs",
            "/api/v1/analytics/user-activity",
            "/api/v1/analytics/ai-usage",
            "/api/v1/analytics/community-summary"
        ]
        
        for ep in endpoints:
            resp = await client.get(f"http://127.0.0.1:8000{ep}", headers=headers)
            print(f"{ep}: {resp.status_code}")
            if resp.status_code != 200:
                print(resp.text)

if __name__ == "__main__":
    asyncio.run(test_analytics())
