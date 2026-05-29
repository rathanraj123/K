from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api import deps
from app.db.session import get_db
from app.services.dashboard_service import DashboardService

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()


@router.get("/overview")
async def get_overview(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_scientist)
):
    return await DashboardService.get_overview(db, user_id=current_user.id)


@router.get("/trends")
async def get_disease_trends(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_scientist)
):
    return await DashboardService.get_disease_trends(db, user_id=current_user.id)


@router.get("/recent-activity")
async def get_recent_activity(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_scientist)
):
    return await DashboardService.get_recent_activity(db, user_id=current_user.id)


@router.get("/heatmap")
async def get_heatmap_data(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_scientist)
):
    return await DashboardService.get_heatmap_data(db, user_id=current_user.id)


@router.get("/top-diseases")
async def get_top_diseases(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_scientist)
):
    return await DashboardService.get_top_diseases(db, user_id=current_user.id)


@router.get("/scan-insights")
async def get_scan_insights(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_scientist)
):
    return await DashboardService.get_scan_insights(db, user_id=current_user.id)


@router.get("/insight-feed")
async def get_insight_feed(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_scientist)
):
    return await DashboardService.get_insight_feed(db)


@router.get("/predictions")
async def get_predictions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_scientist)
):
    return await DashboardService.get_predictions(db, user_id=current_user.id)


@router.get("/simulation")
async def get_spread_simulation(
    days: int = 14,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_scientist)
):
    from app.services.disease_trend_service import DiseaseTrendService
    from app.core.cache import cache_with_ttl
    
    # We create a small inner function to cache it, or just use the cache directly
    @cache_with_ttl(ttl_seconds=300, key_prefix=f"dash:sim:{days}")
    async def fetch_sim(db_sess, u_id, d):
        return await DiseaseTrendService.get_spread_simulation(db_sess, days=d, user_id=u_id)
        
    return await fetch_sim(db, current_user.id, days)

@router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await manager.connect(websocket)
    # Acknowledge connection
    await websocket.send_json({"type": "NEW_DETECTION", "message": "Connected to dashboard feed"})
    try:
        while True:
            # We don't expect much client -> server data, but we keep the loop alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
