"""
common/schemas/base.py — convenience aliases and SuccessResponse.
"""
from typing import Any, Optional
from pydantic import BaseModel

from common.schemas.response import APIResponse, PaginatedResponse, ErrorResponse, MessageResponse


class SuccessResponse(BaseModel):
    """Generic success envelope used across all services."""
    success: bool = True
    message: str = "OK"
    data: Optional[Any] = None


# Re-exports for convenience
__all__ = [
    "SuccessResponse",
    "APIResponse",
    "PaginatedResponse",
    "ErrorResponse",
    "MessageResponse",
]
