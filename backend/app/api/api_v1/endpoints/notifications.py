from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.api.deps import require_user
from app.db.session import get_db
from app.models.user import User
from app.models.notifications import Notification
from app.schemas.response import StandardResponse

router = APIRouter()

@router.get("/", response_model=StandardResponse)
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_user)
) -> Any:
    """List active unread notifications for the user."""
    query = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).limit(20)
    
    result = await db.execute(query)
    notifs = result.scalars().all()
    
    # We serialize manually for StandardResponse envelope compatibility if schema not fully defined
    data = [{"id": str(n.id), "title": n.title, "message": n.message, "type": n.type, "created_at": n.created_at.isoformat()} for n in notifs]
    
    return StandardResponse.success_payload(data=data, total=len(data))

@router.post("/read/{notification_id}", response_model=StandardResponse)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_user)
) -> Any:
    """Mark a specific notification as read."""
    stmt = update(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).values(is_read=True)
    
    await db.execute(stmt)
    await db.commit()
    
    return StandardResponse.success_payload(data=[], message="Notification marked as read")
