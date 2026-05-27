from typing import Generator, Annotated, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/access-token"
)

optional_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/access-token",
    auto_error=False
)

async def get_current_user_optional(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[Optional[str], Depends(optional_oauth2)] = None
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            return None
    except (JWTError, ValidationError):
        return None
        
    result = await db.execute(select(User).where(User.id == str(token_data.sub)))
    return result.scalars().first()

async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    token: Annotated[str, Depends(reusable_oauth2)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        
        if token_data.sub is None:
            raise credentials_exception
            
    except (JWTError, ValidationError):
        raise credentials_exception
        
    result = await db.execute(select(User).where(User.id == str(token_data.sub)))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user

async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(allowed_roles: list[str]):
    """Decorator factory enforcing RBAC constraints."""
    async def role_checker(current_user: Annotated[User, Depends(get_current_active_user)]) -> User:
        user_role = str(getattr(current_user.role, 'value', current_user.role)).lower()
        # Fallback/auto-escalation for local developers and explicit admins
        if current_user.is_superuser or current_user.email in ["admin@agricosmo.ai", "battularathanraj@gmail.com", "ratha@gmail.com", "myadmin@example.com"] or "admin" in current_user.email.lower():
            user_role = "admin"
            
        if user_role not in allowed_roles and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {allowed_roles}"
            )
        return current_user
    return role_checker

require_admin = require_role(["admin"])
require_manufacturer = require_role(["admin", "manufacturer"])
require_scientist = require_role(["admin", "scientist"])
require_farmer = require_role(["admin", "scientist", "farmer", "manufacturer"])
require_user = require_role(["admin", "scientist", "farmer", "manufacturer"])

# ── Enterprise RBAC tiers ─────────────────────────────────────────────────────
require_super_admin = require_role(["admin"])          # Only full admin access
require_moderator   = require_role(["admin"])           # Same for now, extend when roles expand
require_analyst     = require_role(["admin", "scientist"])  # Read-only analytics access

async def get_current_admin_user(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    user_role = str(getattr(current_user.role, 'value', current_user.role)).lower()
    if current_user.is_superuser or current_user.email in ["admin@agricosmo.ai", "battularathanraj@gmail.com", "ratha@gmail.com", "myadmin@example.com"] or "admin" in current_user.email.lower():
        user_role = "admin"
        
    if user_role != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user
