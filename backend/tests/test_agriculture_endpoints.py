import pytest
from httpx import AsyncClient
from app.main import app
from app.api import deps
from app.models.user import User

# Mock active user
async def override_get_current_active_user():
    return User(
        id=999,
        email="test_farmer@agricosmo.com",
        full_name="Test Farmer",
        role="farmer",
        is_active=True
    )

@pytest.mark.asyncio
async def test_get_agriculture_news(async_client: AsyncClient):
    app.dependency_overrides[deps.get_current_active_user] = override_get_current_active_user
    try:
        response = await async_client.get("/api/v1/agriculture/news")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "title" in data[0]
            assert "description" in data[0]
            assert "url" in data[0]
            assert "source" in data[0]
    finally:
        app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_get_market_prices(async_client: AsyncClient):
    app.dependency_overrides[deps.get_current_active_user] = override_get_current_active_user
    try:
        response = await async_client.get("/api/v1/agriculture/market-prices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "commodity" in data[0]
            assert "state" in data[0]
            assert "modal_price" in data[0]
            assert "trend" in data[0]
    finally:
        app.dependency_overrides.clear()
