from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core.config import settings
from app.core import security
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, User as UserSchema

router = APIRouter()

@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def register(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        skin_type=user_in.skin_type,
        region=user_in.region,
        preferences=user_in.preferences
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_str = security.create_access_token(
        user.id, role=getattr(user.role, 'value', user.role), expires_delta=access_token_expires
    )
    
    # Record session & emit event
    try:
        from app.models.enterprise import Session
        from app.services.event_service import EventService
        from datetime import datetime, timezone
        
        db_session = Session(
            user_id=user.id,
            token=token_str,
            is_active=True,
            expires_at=datetime.now(timezone.utc) + access_token_expires
        )
        db.add(db_session)
        
        await EventService.emit_event(
            db=db,
            event_type="user_login",
            payload={"email": user.email, "role": user.role, "message": f"User logged in: {user.full_name or user.email}"},
            user_id=user.id
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to record login telemetry: {e}")
        
    return {
        "access_token": token_str,
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    return current_user
