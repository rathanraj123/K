from typing import Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.modules.insights.service import insights_service
from app.schemas.response import StandardResponse

router = APIRouter()

@router.get("/insights", response_model=StandardResponse)
async def get_ai_insights(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.require_farmer)
) -> Any:
    """
    Generates rule-based AI insights natively computed from local weather data 
    and historical PostgreSQL disease detection frequencies. No mock text is utilized.
    """
    data = await insights_service.generate_insights(db, current_user, lat, lon)
    return StandardResponse.success_payload(data=data, total=len(data))
