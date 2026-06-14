"""
Customer and Driver profile Pydantic schemas.
"""
from datetime import date
from decimal import Decimal
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field, field_validator, model_validator

from common.models.all_models import Gender, VehicleType


# ============================================================
# CUSTOMER PROFILE
# ============================================================

class CustomerProfileCreate(BaseModel):
    """Mandatory profile setup on first login."""
    full_name: str = Field(..., min_length=2, max_length=255, description="Full legal name")
    gender: Gender
    dob: date = Field(..., description="Date of birth (YYYY-MM-DD)")
    emergency_contact: str = Field(..., min_length=10, max_length=15)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("emergency_contact")
    @classmethod
    def validate_emergency_contact(cls, v: str) -> str:
        import re
        v = v.strip().replace(" ", "").replace("-", "")
        if not re.match(r"^\+?[0-9]{10,15}$", v):
            raise ValueError("Invalid emergency contact number")
        return v

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, v: date) -> date:
        from datetime import date as d
        today = d.today()
        age = (today - v).days // 365
        if age < 18:
            raise ValueError("You must be at least 18 years old")
        if age > 100:
            raise ValueError("Invalid date of birth")
        return v


class CustomerProfileUpdate(BaseModel):
    """Optional fields that can be updated later."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    gender: Optional[Gender] = None
    dob: Optional[date] = None
    emergency_contact: Optional[str] = Field(None, min_length=10, max_length=15)
    language: Optional[str] = Field(None, max_length=10)
    women_only_mode: Optional[bool] = None


class CustomerProfileResponse(BaseModel):
    model_config = {"from_attributes": True}

    user_id: uuid.UUID
    full_name: str
    gender: Optional[Gender]
    dob: Optional[date]
    emergency_contact: Optional[str]
    profile_photo: Optional[str]
    reward_points: int
    wallet_balance: Decimal
    referral_code: Optional[str]
    women_only_mode: bool
    subscription_plan_id: Optional[uuid.UUID]


# ============================================================
# SAVED ADDRESSES
# ============================================================

class AddressCreate(BaseModel):
    address_type: Optional[str] = Field("general", max_length=20, description="general, pickup, or drop")
    label: str = Field(..., min_length=1, max_length=100, description="Home, Office, etc.")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    # pincode / district / state are optional: map-based picker doesn't collect these
    pincode: str = Field("000000", min_length=0, max_length=10)
    district: str = Field("Unknown", min_length=0, max_length=100)
    state: str = Field("Unknown", min_length=0, max_length=100)
    landmark: Optional[str] = Field(None, max_length=255)
    full_address: str = Field(..., min_length=5, max_length=500)
    is_default: bool = False


class AddressUpdate(BaseModel):
    address_type: Optional[str] = Field(None, max_length=20)
    label: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    pincode: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    landmark: Optional[str] = None
    full_address: Optional[str] = None
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    address_type: Optional[str] = "general"
    label: str
    latitude: float
    longitude: float
    pincode: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    landmark: Optional[str] = None
    full_address: str
    is_default: bool


# ============================================================
# SAVED ROUTES
# ============================================================

class SavedRouteCreate(BaseModel):
    route_name: str = Field(..., min_length=2, max_length=150)
    pickup_label: str = Field(..., min_length=1, max_length=100)
    pickup_address: str = Field(..., min_length=5, max_length=500)
    pickup_lat: float = Field(..., ge=-90, le=90)
    pickup_lon: float = Field(..., ge=-180, le=180)
    drop_label: str = Field(..., min_length=1, max_length=100)
    drop_address: str = Field(..., min_length=5, max_length=500)
    drop_lat: float = Field(..., ge=-90, le=90)
    drop_lon: float = Field(..., ge=-180, le=180)


class SavedRouteResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    route_name: str
    pickup_label: str
    pickup_address: str
    pickup_lat: float
    pickup_lon: float
    drop_label: str
    drop_address: str
    drop_lat: float
    drop_lon: float


# ============================================================
# DRIVER PROFILE & ONBOARDING
# ============================================================

class DriverProfileCreate(BaseModel):
    """Driver basic profile  first step of onboarding."""
    full_name: str = Field(..., min_length=2, max_length=255)
    gender: Optional[Gender] = None
    home_city: Optional[str] = Field(None, max_length=100)


class DriverProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[Gender] = None
    home_city: Optional[str] = None


class VehicleCreate(BaseModel):
    """Vehicle details during driver onboarding."""
    vehicle_type: VehicleType
    make: str = Field(..., min_length=2, max_length=100, description="e.g. Maruti, Toyota")
    model: str = Field(..., min_length=1, max_length=100, description="e.g. Swift, Innova")
    year: int = Field(..., ge=2000, le=2030)
    color: str = Field(..., min_length=2, max_length=50)
    registration_number: str = Field(..., min_length=5, max_length=20)
    seat_capacity: int = Field(..., ge=2, le=50)
    parcel_capable: bool = False
    parcel_capacity_kg: Optional[float] = Field(None, ge=0, le=1000)
    has_ac: bool = True


class VehicleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    vehicle_type: str
    make: str
    model: str
    year: int
    color: str
    registration_number: str
    seat_capacity: int
    parcel_capable: bool
    parcel_capacity_kg: Optional[float]
    has_ac: bool
    insurance_expiry: Optional[date]
    pollution_expiry: Optional[date]
    photos: List[str]


class DriverProfileResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    gender: Optional[Gender]
    profile_photo: Optional[str]
    kyc_status: str
    status: str
    rating: float
    total_trips: int
    total_earnings: Decimal
    wallet_balance: Decimal
    home_city: Optional[str]
    referral_code: Optional[str]


class DriverDocumentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    doc_type: str
    file_path: str
    is_verified: bool
    rejection_reason: Optional[str]
