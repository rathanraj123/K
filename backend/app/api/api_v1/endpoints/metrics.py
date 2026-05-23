from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.metrics import global_metrics, MetricsResponse
from app.api.deps import get_db

router = APIRouter()

@router.get("/", response_model=MetricsResponse, tags=["Observability: System"])
async def get_metrics():
    """Enterprise metrics endpoint exposing prometheus-lite aggregations."""
    return global_metrics.get_snapshot()

@router.get("/health/db", tags=["Observability: System"])
async def check_db_health(db: AsyncSession = Depends(get_db)):
    """Diagnostic endpoint to verify database connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "connected", "message": "Database is reachable and responding."}
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "troubleshooting": "Check if your local database file is accessible and defined correctly in .env or config.py."
        }
