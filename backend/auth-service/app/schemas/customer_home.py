"""
Pydantic schemas for Service Catalog and Customer Home Summary API.
"""
from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import datetime


class ServiceCatalogItem(BaseModel):
    code: str
    title: str
    description: str
    category: str
    icon: str
    status: str  # AVAILABLE, COMING_SOON, TEMPORARILY_UNAVAILABLE, LOCATION_RESTRICTED
    badge: Optional[str] = None
    sort_order: int = 0
    route: Optional[str] = None


class ActiveRideDriver(BaseModel):
    id: str
    name: str
    phone: str
    rating: float
    vehicle_model: str
    license_plate: str
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None


class ActiveRideSummary(BaseModel):
    ride_id: str
    status: str
    pickup_address: str
    destination_address: str
    pickup_lat: float
    pickup_lng: float
    destination_lat: float
    destination_lng: float
    pickup_otp: Optional[str] = None
    estimated_fare: float
    eta_minutes: int
    driver: Optional[ActiveRideDriver] = None


class UpcomingBookingSummary(BaseModel):
    booking_id: str
    service_type: str
    title: str
    scheduled_time: datetime
    pickup_address: str
    destination_address: Optional[str] = None
    status: str


class PromotionSummary(BaseModel):
    id: str
    code: str
    title: str
    description: str
    discount_text: str
    expires_at: Optional[datetime] = None
    service: str = "all"
    banner_gradient: Optional[List[str]] = None


class CustomerHomeSummaryResponse(BaseModel):
    customer_id: str
    customer_name: str
    profile_photo_url: Optional[str] = None
    unread_notifications_count: int = 0
    active_ride: Optional[ActiveRideSummary] = None
    upcoming_booking: Optional[UpcomingBookingSummary] = None
    promotions: List[PromotionSummary] = []
    services: List[ServiceCatalogItem] = []
