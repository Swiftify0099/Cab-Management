"""
Customer and Driver profile Pydantic schemas.
"""
from datetime import date
from decimal import Decimal
from typing import List, Optional, Any, Dict
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
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    gender: Optional[Gender] = None
    dob: Optional[date] = None
    emergency_contact: Optional[str] = Field(None, max_length=20)
    language: Optional[str] = Field(None, max_length=10)
    women_only_mode: Optional[bool] = None
    service_preferences: Optional[dict] = None  # Phase 10: {default_service, pinned_services, ladies_only, ...}

    @field_validator("full_name", mode="before")
    @classmethod
    def clean_full_name(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        v_str = str(v).strip()
        return v_str if v_str else None

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        v_str = str(v).strip().lower()
        return v_str if v_str else None

    @field_validator("emergency_contact", mode="before")
    @classmethod
    def clean_emergency_contact(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        v_str = str(v).strip()
        return v_str if v_str else None

    @field_validator("dob", mode="before")
    @classmethod
    def clean_dob(cls, v: Any) -> Optional[Any]:
        if v is None or v == "":
            return None
        return v


class CustomerProfileResponse(BaseModel):
    model_config = {"from_attributes": True}

    user_id: uuid.UUID
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[Gender] = None
    dob: Optional[date] = None
    emergency_contact: Optional[str] = None
    profile_photo: Optional[str] = None
    profile_photo_url: Optional[str] = None
    reward_points: int = 0
    wallet_balance: Decimal = Decimal("0.00")
    promo_credit_balance: Optional[Decimal] = Decimal("0.00")
    referral_reward_balance: Optional[Decimal] = Decimal("0.00")
    pending_refund_balance: Optional[Decimal] = Decimal("0.00")
    referral_code: Optional[str] = None
    women_only_mode: bool = False
    service_preferences: Optional[dict] = None  # Phase 10
    subscription_plan_id: Optional[uuid.UUID] = None
    rating: Optional[Decimal] = Decimal("5.00")
    total_ratings: Optional[int] = 0
    is_profile_complete: Optional[bool] = False


# ============================================================
# SAVED ADDRESSES
# ============================================================

class AddressCreate(BaseModel):
    address_type: Optional[str] = Field("general", max_length=20, description="general, pickup, or drop")
    label: str = Field(..., min_length=1, max_length=100, description="Home, Office, etc.")
    latitude: Optional[float] = Field(18.5204, ge=-90, le=90)
    longitude: Optional[float] = Field(73.8567, ge=-180, le=180)
    # pincode / district / state are optional: map-based picker doesn't collect these
    pincode: Optional[str] = Field("000000", min_length=0, max_length=10)
    district: Optional[str] = Field("Unknown", min_length=0, max_length=100)
    state: Optional[str] = Field("Unknown", min_length=0, max_length=100)
    landmark: Optional[str] = Field(None, max_length=255)
    full_address: Optional[str] = Field(None, max_length=500)
    address: Optional[str] = Field(None, max_length=500)
    is_default: bool = False

    @model_validator(mode="before")
    @classmethod
    def handle_address_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if not values.get("full_address"):
                values["full_address"] = values.get("address") or values.get("label") or "Saved Location"
            if values.get("latitude") is None:
                values["latitude"] = 18.5204
            if values.get("longitude") is None:
                values["longitude"] = 73.8567
        return values


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
    pickup_lng: float = Field(..., ge=-180, le=180)
    drop_label: str = Field(..., min_length=1, max_length=100)
    drop_address: str = Field(..., min_length=5, max_length=500)
    drop_lat: float = Field(..., ge=-90, le=90)
    drop_lng: float = Field(..., ge=-180, le=180)


class SavedRouteResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    route_name: str
    pickup_label: str
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    drop_label: str
    drop_address: str
    drop_lat: float
    drop_lng: float



# ============================================================
# DRIVER PROFILE & ONBOARDING
# ============================================================

class DriverProfileCreate(BaseModel):
    """Driver basic profile — first step of onboarding."""
    full_name: str = Field(..., min_length=2, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    gender: Optional[Gender] = None
    experience_years: Optional[int] = Field(0, ge=0, le=50)
    home_city: Optional[str] = Field(None, max_length=100)


class DriverProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[Gender] = None
    experience_years: Optional[int] = None
    home_city: Optional[str] = None


class VehicleCreate(BaseModel):
    """Vehicle details during driver onboarding."""
    vehicle_type: VehicleType
    make: str = Field(..., min_length=1, max_length=100, description="e.g. Maruti, Toyota")
    model: str = Field(..., min_length=1, max_length=100, description="e.g. Swift, Innova")
    variant: Optional[str] = Field(None, max_length=100)
    year: int = Field(..., ge=1995, le=2035)
    color: str = Field(..., min_length=1, max_length=50)
    registration_number: str = Field(..., min_length=4, max_length=25)
    seat_capacity: int = Field(..., ge=1, le=60)
    fuel_type: Optional[str] = Field("petrol")
    comfort_level: Optional[str] = Field("economy")
    ownership_type: Optional[str] = Field("self")
    registered_owner_name: Optional[str] = Field(None, max_length=255)
    service_capabilities: Optional[List[str]] = None
    parcel_capable: bool = False
    parcel_capacity_kg: Optional[float] = Field(None, ge=0, le=10000)
    has_ac: bool = True
    photos: Optional[List[str]] = Field(default_factory=list)

    @field_validator("vehicle_type", mode="before")
    @classmethod
    def validate_vehicle_type(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip().lower()
        return v


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
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[Gender] = None
    experience_years: Optional[int] = 0
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
