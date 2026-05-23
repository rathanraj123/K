from pydantic import BaseModel, EmailStr
from typing import Optional
from typing import Literal
import uuid
from datetime import datetime
from app.models.user import UserRole

# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    full_name: Optional[str] = None
    role: Optional[UserRole] = UserRole.FARMER
    skin_type: Optional[str] = None
    region: Optional[str] = None
    preferences: Optional[str] = None

# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str

# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: str
    email: EmailStr
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

# Additional properties to return via API
class User(UserInDBBase):
    pass
