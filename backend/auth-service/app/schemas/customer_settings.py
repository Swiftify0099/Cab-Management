"""
Pydantic schemas for Customer App Settings, Privacy, Sessions, and Account Deletion.
Feature 1: Customer Core Account.
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CustomerSettingsResponse(BaseModel):
    user_id: uuid.UUID
    notifications_ride_updates: bool = True
    notifications_driver_arrival: bool = True
    notifications_promotions: bool = True
    notifications_security_alerts: bool = True
    privacy_location_sharing: bool = True
    privacy_family_trip_tracking: bool = True
    privacy_personalized_ads: bool = False
    language: str = "en"

    class Config:
        from_attributes = True


class CustomerSettingsUpdate(BaseModel):
    notifications_ride_updates: Optional[bool] = None
    notifications_driver_arrival: Optional[bool] = None
    notifications_promotions: Optional[bool] = None
    notifications_security_alerts: Optional[bool] = None
    privacy_location_sharing: Optional[bool] = None
    privacy_family_trip_tracking: Optional[bool] = None
    privacy_personalized_ads: Optional[bool] = None
    language: Optional[str] = Field(None, max_length=10)


class SessionResponse(BaseModel):
    id: uuid.UUID
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    ip_address: Optional[str] = None
    is_current: bool = False
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class AccountDeletionRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)
    confirmation: bool = Field(..., description="Must explicitly confirm deletion")
