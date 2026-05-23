from typing import Generic, TypeVar, Any, Dict, List, Optional
from pydantic import BaseModel

T = TypeVar('T')

class StandardMeta(BaseModel):
    total: int
    timestamp: str

class StandardResponse(BaseModel, Generic[T]):
    success: bool
    data: List[T] | Dict[str, Any]
    meta: Optional[StandardMeta] = None
    message: Optional[str] = None
    
    @classmethod
    def success_payload(cls, data: Any, total: int = 0, message: Optional[str] = None):
        from datetime import datetime
        meta = StandardMeta(total=total, timestamp=datetime.utcnow().isoformat() + "Z")
        # Ensure data is always a list if expected to be iterable, exception for empty state
        if not data and isinstance(data, list):
            return cls(success=True, data=[], meta=meta, message=message or "No data available yet")
            
        return cls(success=True, data=data, meta=meta, message=message)
        
    @classmethod
    def error_payload(cls, message: str):
        return cls(success=False, data=[], message=message)
