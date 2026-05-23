from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.cosmetic import CosmeticMapping

router = APIRouter()

@router.get("/intelligence", response_model=Dict[str, Any])
async def get_cosmetic_intelligence(
    plant_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Determine how a specific plant can be utilized in skincare, mapped against the user's skin_type.
    """
    result = await db.execute(select(CosmeticMapping).where(CosmeticMapping.plant_name == plant_name))
    mapping = result.scalars().first()
    
    if not mapping:
        return {
            "status": "not_found", 
            "message": "We have no current cosmetic mappings for this plant."
        }
        
    skin_type = current_user.skin_type
    is_safe = skin_type in mapping.mapped_skin_types if mapping.mapped_skin_types and skin_type else "unknown"
    
    return {
        "plant_name": mapping.plant_name,
        "benefits": mapping.benefits,
        "warnings": mapping.warnings,
        "recommended_for": mapping.mapped_skin_types,
        "user_compatibility": "Safe" if is_safe == True else ("Not Recommended" if is_safe == False else "Use Caution")
    }
