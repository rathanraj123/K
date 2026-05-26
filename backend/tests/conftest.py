import pytest_asyncio
import httpx
from app.main import app

@pytest_asyncio.fixture
async def async_client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        yield client
