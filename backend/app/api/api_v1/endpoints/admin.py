import logging
from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.models.agriculture import DiseaseDetection
from app.models.enterprise import ActivityLog, ApiMetric, Session, DiseaseStatistic

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Any:
    """Get high-level stats for the admin dashboard"""
    from app.core.redis_client import get_redis
    import json
    
    redis_client = await get_redis()
    cache_key = "admin:stats:summary"
    
    if redis_client:
        cached_stats = await redis_client.get(cache_key)
        if cached_stats:
            return json.loads(cached_stats)

    # Cache miss, calculate from DB
    total_users_q = await db.execute(select(func.count(User.id)))
    total_users = total_users_q.scalar() or 0

    total_scans_q = await db.execute(select(func.count(DiseaseDetection.id)))
    total_scans = total_scans_q.scalar() or 0

    active_sessions_q = await db.execute(select(func.count(Session.id)).where(Session.is_active == True))
    active_sessions = active_sessions_q.scalar() or 0

    # For api calls and latency, we'd normally query `HourlyApiMetric`
    from app.models.enterprise import HourlyApiMetric
    import datetime
    today = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    api_calls_q = await db.execute(select(func.sum(HourlyApiMetric.total_requests)).where(HourlyApiMetric.timestamp >= today))
    api_calls = api_calls_q.scalar() or 0
    
    avg_latency_q = await db.execute(select(func.avg(HourlyApiMetric.avg_latency_ms)).where(HourlyApiMetric.timestamp >= today))
    avg_latency = avg_latency_q.scalar() or 0

    stats = {
        "total_users": total_users,
        "total_scans": total_scans,
        "active_users": active_sessions,
        "api_calls": int(api_calls),
        "avg_latency": round(avg_latency, 2)
    }
    
    if redis_client:
        await redis_client.setex(cache_key, 30, json.dumps(stats))

    return stats

@router.get("/logs")
async def get_activity_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Any:
    """Get recent activity logs"""
    query = select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at,
            "user_id": log.user_id
        } for log in logs
    ]

@router.get("/scans")
async def get_recent_scans(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Any:
    query = select(DiseaseDetection).order_by(desc(DiseaseDetection.created_at)).limit(limit)
    result = await db.execute(query)
    scans = result.scalars().all()
    
    return [
        {
            "id": scan.id,
            "crop_type": scan.crop_type,
            "status": scan.status,
            "created_at": scan.created_at
        } for scan in scans
    ]

@router.get("/analytics")
async def get_analytics_charts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Any:
    """Get chart data from aggregated daily_scan_stats table (Redis-cached 30s)."""
    from app.core.redis_client import get_redis
    import json
    
    redis_client = await get_redis()
    cache_key = "admin:analytics:charts"
    if redis_client:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)

    # Build weekly scans from DiseaseDetection table directly
    from app.models.agriculture import DiseaseDetection
    from sqlalchemy import cast, Date
    import datetime
    
    today = datetime.datetime.now(datetime.timezone.utc).date()
    week_ago_date = today - datetime.timedelta(days=6) # 7 days inclusive of today
    
    stmt = (
        select(
            cast(DiseaseDetection.created_at, Date).label("date"),
            func.count(DiseaseDetection.id).label("total")
        )
        .where(cast(DiseaseDetection.created_at, Date) >= week_ago_date)
        .group_by(cast(DiseaseDetection.created_at, Date))
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    counts_by_date = {row.date: row.total for row in rows}
    
    weekly_scans = []
    for i in range(7):
        current_date = week_ago_date + datetime.timedelta(days=i)
        weekly_scans.append({
            "name": current_date.strftime("%a"),
            "scans": counts_by_date.get(current_date, 0),
        })

    # Disease frequency from DiseaseStatistic table
    from app.models.enterprise import DiseaseStatistic
    disease_result = await db.execute(
        select(DiseaseStatistic).order_by(desc(DiseaseStatistic.occurrence_count)).limit(10)
    )
    disease_rows = disease_result.scalars().all()
    disease_trends = [
        {"name": row.disease_name, "count": row.occurrence_count, "region": row.region}
        for row in disease_rows
    ]

    # Regional Distribution from User table
    region_result = await db.execute(
        select(User.region, func.count(User.id)).group_by(User.region)
    )
    region_rows = region_result.all()
    regional_distribution = []
    for region, count in region_rows:
        reg_name = region if region else "Unknown"
        regional_distribution.append({"region": reg_name, "value": count})

    payload = {
        "weekly_scans": weekly_scans, 
        "disease_trends": disease_trends,
        "regional_distribution": regional_distribution
    }
    if redis_client:
        await redis_client.setex(cache_key, 30, json.dumps(payload))

    return payload

@router.post("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
) -> Any:
    from fastapi import HTTPException
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = not user.is_active
    await db.commit()
    
    return {"id": user.id, "status": "active" if user.is_active else "blocked"}
