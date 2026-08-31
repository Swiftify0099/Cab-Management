"""
Pydantic Schemas for Multi-Vehicle Management & Lifecycle.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

from common.models.all_models import VehicleType


class VehicleCreateRequest(BaseModel):
    vehicle_type: VehicleType
    make: str = Field(..., min_length=2, max_length=100, description="e.g. Maruti, Toyota, Tata, Bajaj")
    model: str = Field(..., min_length=1, max_length=100, description="e.g. Swift, Innova, Ace, Pulsar")
    variant: Optional[str] = Field(None, max_length=100, description="e.g. VXi, ZX, Gold")
    year: int = Field(..., ge=1995, le=2035)
    color: str = Field(..., min_length=2, max_length=50)
    registration_number: str = Field(..., min_length=5, max_length=20, description="e.g. MH12AB1234")
    seat_capacity: int = Field(..., ge=1, le=60)
    fuel_type: Optional[str] = Field("petrol", description="petrol | diesel | cng | electric | hybrid")
    comfort_level: Optional[str] = Field("economy", description="economy | comfort | premium | luxury")
    ownership_type: Optional[str] = Field("self", description="self | leased | company | fleet_partner")
    registered_owner_name: Optional[str] = Field(None, max_length=255)
    service_capabilities: Optional[List[str]] = Field(default_factory=lambda: ["cab"])
    has_ac: bool = True
    parcel_capable: bool = False
    parcel_capacity_kg: Optional[float] = Field(None, ge=0, le=10000)
    transport_capable: bool = False
    max_payload_kg: Optional[float] = Field(None, ge=0, le=50000)
    cargo_volume_cft: Optional[float] = Field(None, ge=0, le=5000)
    commercial_permit: bool = False
    insurance_expiry: Optional[date] = None
    pollution_expiry: Optional[date] = None
    permit_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    photos: Optional[List[str]] = Field(default_factory=list)

    @field_validator("vehicle_type", mode="before")
    @classmethod
    def validate_vehicle_type(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class VehicleUpdateRequest(BaseModel):
    make: Optional[str] = Field(None, min_length=2, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=100)
    variant: Optional[str] = None
    color: Optional[str] = None
    seat_capacity: Optional[int] = Field(None, ge=1, le=60)
    fuel_type: Optional[str] = None
    comfort_level: Optional[str] = None
    ownership_type: Optional[str] = None
    registered_owner_name: Optional[str] = None
    service_capabilities: Optional[List[str]] = None
    has_ac: Optional[bool] = None
    parcel_capable: Optional[bool] = None
    parcel_capacity_kg: Optional[float] = None
    transport_capable: Optional[bool] = None
    max_payload_kg: Optional[float] = None
    cargo_volume_cft: Optional[float] = None
    commercial_permit: Optional[bool] = None
    insurance_expiry: Optional[date] = None
    pollution_expiry: Optional[date] = None
    permit_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    photos: Optional[List[str]] = None


class VehicleDocumentSummary(BaseModel):
    model_config = {"from_attributes": True}

    doc_type: str
    is_verified: bool
    status: str
    expiry_date: Optional[date] = None
    is_expired: bool = False
    preview_url: Optional[str] = None


class VehicleDetailResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    driver_id: uuid.UUID
    vehicle_type: str
    make: str
    model: str
    variant: Optional[str] = None
    year: int
    color: str
    registration_number: str
    seat_capacity: int
    fuel_type: str
    comfort_level: str
    ownership_type: str
    registered_owner_name: Optional[str] = None
    service_capabilities: List[str]
    is_active: bool
    status: str
    rejection_reason: Optional[str] = None
    has_ac: bool
    parcel_capable: bool
    parcel_capacity_kg: Optional[float] = None
    transport_capable: bool
    max_payload_kg: Optional[float] = None
    cargo_volume_cft: Optional[float] = None
    commercial_permit: bool
    insurance_expiry: Optional[date] = None
    pollution_expiry: Optional[date] = None
    permit_expiry: Optional[date] = None
    fitness_expiry: Optional[date] = None
    photos: List[str] = []
    documents: List[VehicleDocumentSummary] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class VehicleDashboardSummaryResponse(BaseModel):
    total_vehicles: int
    active_vehicle: Optional[VehicleDetailResponse] = None
    standby_vehicles: List[VehicleDetailResponse] = []
    pending_count: int
    can_add_more: bool = True
    max_vehicles_allowed: int = 5
