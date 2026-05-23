from typing import Any, Dict
from fastapi import APIRouter, Depends, Query
from app.api import deps
from app.models.user import User
from app.modules.agriculture.service import agriculture_service
from app.core.cache import cache_with_ttl

router = APIRouter()

@router.get("/weather-insights", response_model=Dict[str, Any])
@cache_with_ttl(ttl_seconds=3600, key_prefix="weather") # Cache weather for 1 hour
async def get_weather_insights(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get contextual agricultural warnings based on local weather via OpenWeather API.
    """
    insights = await agriculture_service.get_weather_intelligence(lat, lon)
    if not insights:
        return {"weather": "No data available", "agri_warnings": ["Check local news for weather impacts."]}
        
    return insights
