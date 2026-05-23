from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import require_farmer, require_scientist, require_manufacturer, require_admin, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.modules.analytics.service import analytics_service
from app.schemas.response import StandardResponse
from app.core.cache import cache_with_ttl

router = APIRouter()

@router.get("/disease-trends", response_model=StandardResponse)
@cache_with_ttl(ttl_seconds=5, key_prefix="analytics:disease")
async def get_disease_trends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_farmer) # Farmers see own, scientists see all
) -> Any:
    data = await analytics_service.get_disease_trends(db, current_user)
    return StandardResponse.success_payload(data=data, total=len(data))

@router.get("/user-activity", response_model=StandardResponse)
@cache_with_ttl(ttl_seconds=5, key_prefix="analytics:activity")
async def get_user_activity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_scientist) # Must be scientist or admin
) -> Any:
    data = await analytics_service.get_user_activity(db)
    return StandardResponse.success_payload(data=data, total=len(data))

@router.get("/ai-usage", response_model=StandardResponse)
@cache_with_ttl(ttl_seconds=5, key_prefix="analytics:ai")
async def get_ai_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_scientist)
) -> Any:
    data = await analytics_service.get_ai_usage(db)
    return StandardResponse.success_payload(data=data, total=len(data))

@router.get("/sales", response_model=StandardResponse)
@cache_with_ttl(ttl_seconds=5, key_prefix="analytics:sales")
async def get_sales(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manufacturer)
) -> Any:
    data = await analytics_service.get_sales_data(db, current_user)
    return StandardResponse.success_payload(data=[data], total=1) # Wrapped dict in array

@router.get("/dashboard-summary", response_model=StandardResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user) # In real app, check for admin role
) -> Any:
    data = await analytics_service.get_dashboard_summary(db)
    return StandardResponse.success_payload(data=data)

@router.get("/system-logs", response_model=StandardResponse)
async def get_system_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    data = await analytics_service.get_system_logs(db)
    return StandardResponse.success_payload(data=data, total=len(data))

@router.get("/users", response_model=StandardResponse)
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    data = await analytics_service.get_all_users(db)
    return StandardResponse.success_payload(data=data, total=len(data))

@router.get("/scans", response_model=List[Any])
async def get_all_scans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_scientist)
) -> Any:
    return await analytics_service.get_all_scans(db)

@router.get("/community-summary", response_model=StandardResponse)
async def get_community_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_scientist)
) -> Any:
    data = await analytics_service.get_community_summary(db)
    return StandardResponse.success_payload(data=data)
