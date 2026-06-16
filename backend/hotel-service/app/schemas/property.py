from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, date
from uuid import UUID

class VendorRegisterRequest(BaseModel):
    business_name: str = Field(..., min_length=2)
    aadhaar_number: str = Field(..., min_length=12, max_length=12)
    pan_number: str = Field(..., min_length=10, max_length=10)
    gst_number: Optional[str] = None
    documents: Dict[str, str] = Field(default_factory=dict) # e.g. {"aadhaar": "url"}

class VendorResponse(BaseModel):
    id: UUID
    user_id: UUID
    business_name: str
    status: str
    
    class Config:
        from_attributes = True

class PropertyUnitSchema(BaseModel):
    name: str
    capacity: int = 2
    price: float
    amenities: Dict[str, Any] = Field(default_factory=dict)
    count: int = 1

class PropertyCreateRequest(BaseModel):
    type: str = Field(..., description="hotel, lodge, room, resort")
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: str
    city: str
    state: str
    pincode: str
    policies: Dict[str, Any] = Field(default_factory=dict)
    units: List[PropertyUnitSchema] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)

class PropertyResponse(BaseModel):
    id: UUID
    vendor_id: UUID
    type: str
    name: str
    city: str
    status: str
    rating: float

    class Config:
        from_attributes = True

class BookingCreateRequest(BaseModel):
    property_id: UUID
    unit_id: UUID
    check_in: date
    check_out: date
    nights: int
    guests: int
    total_fare: float
    payment_method: str = Field(..., description="'wallet' or 'razorpay'")

class BookingResponse(BaseModel):
    id: UUID
    property_id: UUID
    status: str
    total_fare: float

    class Config:
        from_attributes = True

class AdminActionRequest(BaseModel):
    approve: bool

class VendorActionRequest(BaseModel):
    action: str = Field(..., description="'accept', 'reject', 'checkin', 'checkout'")
