from pydantic import BaseModel
from typing import Optional, List
import uuid

class CosmeticMappingBase(BaseModel):
    plant_name: str
    benefits: Optional[str] = None
    warnings: Optional[str] = None
    mapped_skin_types: Optional[List[str]] = None

class CosmeticMappingResponse(CosmeticMappingBase):
    id: uuid.UUID
    
    model_config = {"from_attributes": True}

class RecommendationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    item_reference: str
    reason: Optional[str] = None
    
    model_config = {"from_attributes": True}
