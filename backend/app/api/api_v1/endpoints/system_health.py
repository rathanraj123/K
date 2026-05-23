"""
System Health endpoint for the admin dashboard.
Returns real-time DB, Redis, and Celery health.
"""
import time
from typing import Any
from fastapi import APIRouter, Depends
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter()

@router.get("/health")
async def system_health(
    current_user: User = Depends(require_admin)
) -> Any:
    """Return real-time system health for admin monitoring panel."""
    health = {
        "timestamp": time.time(),
        "services": {}
    }

    # Check PostgreSQL
    try:
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        health["services"]["postgres"] = {"status": "healthy"}
    except Exception as e:
        health["services"]["postgres"] = {"status": "degraded", "error": str(e)}

    # Check Redis
    try:
        from app.core.redis_client import get_redis
        import time as t
        r = await get_redis()
        ts = t.perf_counter()
        await r.ping()
        latency_ms = round((t.perf_counter() - ts) * 1000, 2)
        health["services"]["redis"] = {"status": "healthy", "latency_ms": latency_ms}
    except Exception as e:
        health["services"]["redis"] = {"status": "degraded", "error": str(e)}

    # Check Celery (inspect active workers)
    try:
        from app.core.celery_app import celery_app
        inspector = celery_app.control.inspect(timeout=1.0)
        active = inspector.active()
        worker_count = len(active) if active else 0
        health["services"]["celery"] = {
            "status": "healthy" if worker_count > 0 else "no_workers",
            "active_workers": worker_count
        }
    except Exception as e:
        health["services"]["celery"] = {"status": "degraded", "error": str(e)}

    # Check Elasticsearch
    try:
        from app.core.elasticsearch import es_client
        es_health = await es_client.cluster.health()
        health["services"]["elasticsearch"] = {
            "status": es_health.get("status", "unknown")
        }
    except Exception as e:
        health["services"]["elasticsearch"] = {"status": "degraded", "error": str(e)}

    # Overall
    all_ok = all(v["status"] in ("healthy", "green", "yellow", "no_workers") for v in health["services"].values())
    health["overall"] = "healthy" if all_ok else "degraded"
    return health
