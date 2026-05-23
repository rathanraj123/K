from typing import TypeVar, Generic, Sequence
from pydantic import BaseModel
from fastapi import Query

T = TypeVar('T')

class PaginationParams(BaseModel):
    limit: int = Query(10, ge=1, le=100, description="Items per page")
    offset: int = Query(0, ge=0, description="Offset for pagination")

class PaginatedResponse(BaseModel, Generic[T]):
    items: Sequence[T]
    total: int
    limit: int
    offset: int
    
    @classmethod
    def create(cls, items: Sequence[T], total: int, params: PaginationParams):
        return cls(
            items=items,
            total=total,
            limit=params.limit,
            offset=params.offset
        )
