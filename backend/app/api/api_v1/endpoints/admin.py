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

    # Build weekly scans from DailyScanStat table
    from app.models.enterprise import DailyScanStat
    import datetime
    week_ago = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).replace(tzinfo=None)
    result = await db.execute(
        select(DailyScanStat)
        .where(DailyScanStat.date >= week_ago)
        .order_by(DailyScanStat.date)
    )
    rows = result.scalars().all()

    weekly_scans = [
        {
            "name": row.date.strftime("%a"),
            "scans": row.total_scans,
            "failed": row.failed_scans,
            "avg_confidence": round(row.avg_confidence, 2)
        }
        for row in rows
    ]

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

    payload = {"weekly_scans": weekly_scans, "disease_trends": disease_trends}
    if redis_client:
        await redis_client.setex(cache_key, 30, json.dumps(payload))

    return payload
