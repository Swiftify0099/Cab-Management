"""
Standardized API response schemas for all services.
"""
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard success response envelope."""
    success: bool = True
    message: str = "OK"
    data: Optional[T] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response envelope."""
    success: bool = True
    message: str = "OK"
    data: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(
        cls,
        data: List[T],
        total: int,
        page: int,
        page_size: int,
    ) -> "PaginatedResponse[T]":
        import math
        return cls(
            data=data,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if page_size > 0 else 0,
        )


class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[Any] = None


class MessageResponse(BaseModel):
    """Simple message response."""
    success: bool = True
    message: str


class PaginationParams(BaseModel):
    """Reusable pagination query parameters."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
