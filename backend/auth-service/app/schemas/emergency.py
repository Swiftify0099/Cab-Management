"""
Pydantic schemas for Customer Emergency & Trusted Contacts.
Feature 1: Customer Core Account.
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class EmergencyContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    relationship: str = Field("Friend", max_length=50)
    is_primary: bool = False
    auto_share_rides: bool = False


class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, min_length=10, max_length=15)
    relationship: Optional[str] = Field(None, max_length=50)
    is_primary: Optional[bool] = None
    auto_share_rides: Optional[bool] = None


class EmergencyContactResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    phone: str
    relationship: str
    is_primary: bool
    auto_share_rides: bool
    created_at: datetime

    class Config:
        from_attributes = True
