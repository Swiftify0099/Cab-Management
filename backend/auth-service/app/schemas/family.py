"""
Pydantic schemas for Family & Shared Account.
Feature 1: Customer Core Account.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


class FamilyMemberBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    relationship: str = Field("Family Member", max_length=50)
    can_use_shared_payment: bool = True
    can_book_rides: bool = True
    can_track_trips: bool = True


class FamilyMemberCreate(FamilyMemberBase):
    pass


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    relationship: Optional[str] = Field(None, max_length=50)
    can_use_shared_payment: Optional[bool] = None
    can_book_rides: Optional[bool] = None
    can_track_trips: Optional[bool] = None
    status: Optional[str] = None


class FamilyMemberResponse(FamilyMemberBase):
    id: uuid.UUID
    family_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class FamilyCreate(BaseModel):
    family_name: str = Field("My Family", max_length=100)
    is_shared_payment_enabled: bool = True
    shared_payment_method: Optional[str] = "wallet"
    monthly_spending_limit: Optional[Decimal] = None


class FamilyPaymentUpdate(BaseModel):
    is_shared_payment_enabled: Optional[bool] = None
    shared_payment_method: Optional[str] = None
    monthly_spending_limit: Optional[Decimal] = None


class FamilyResponse(BaseModel):
    id: uuid.UUID
    organizer_id: uuid.UUID
    family_name: str
    is_shared_payment_enabled: bool
    shared_payment_method: Optional[str]
    monthly_spending_limit: Optional[Decimal]
    members: List[FamilyMemberResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True
