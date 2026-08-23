"""
Hotel Booking REST API Endpoints.
Covers:
- Hotel Search, Spatial Radius & Filters
- Hotel Details, Photo Gallery & Room Tiers
- Authoritative Pricing Quote & GST Tax Breakdown
- Room Booking & Wallet Payment Settlement
- Stay Management, Voucher & History
- Free Cancellation & Automated Wallet Refund
- Cross-Service Linked Airport / Hotel Cab Ride Integration
"""
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from app.services.hotel_service import HotelService

router = APIRouter()


# ─── Pydantic Request & Response Schemas ─────────────────────────────
class RoomQuoteRequest(BaseModel):
    check_in: date
    check_out: date
    rooms_count: int = Field(default=1, ge=1)
    guests_count: int = Field(default=2, ge=1)
    add_on_codes: Optional[List[str]] = Field(default_factory=list)
    promo_code: Optional[str] = None


class AdditionalGuestSchema(BaseModel):
    name: str
    age: int = 28


class HotelBookingCreateRequest(BaseModel):
    unit_id: str
    check_in: date
    check_out: date
    primary_guest_name: str
    primary_guest_phone: str
    primary_guest_email: Optional[str] = None
    rooms_count: int = Field(default=1, ge=1)
    guests_count: int = Field(default=2, ge=1)
    special_requests: Optional[str] = None
    add_on_codes: Optional[List[str]] = Field(default_factory=list)
    payment_method: str = Field(default="WALLET")  # WALLET, UPI, CARD, NETBANKING
    promo_code: Optional[str] = None
    idempotency_key: Optional[str] = None
    additional_guests: Optional[List[AdditionalGuestSchema]] = Field(default_factory=list)


class CancelBookingRequest(BaseModel):
    reason: str = Field(default="Customer requested cancellation")


class LinkRideRequest(BaseModel):
    ride_direction: str = Field(default="AIRPORT_TO_HOTEL")  # AIRPORT_TO_HOTEL, HOTEL_TO_AIRPORT
    airport_name: str = Field(default="Pune International Airport (PNQ)")
    airport_lat: float = Field(default=18.5822)
    airport_lng: float = Field(default=73.9197)
    scheduled_time: Optional[datetime] = None
    vehicle_type: str = Field(default="SEDAN")
    flight_number: Optional[str] = None


# ─── API Endpoints ───────────────────────────────────────────────────
@router.get("/search")
async def search_hotels(
    city: Optional[str] = Query(None, description="City name"),
    q: Optional[str] = Query(None, description="Search query across hotel name, area, city"),
    check_in: Optional[date] = Query(None, description="Check-in date"),
    check_out: Optional[date] = Query(None, description="Check-out date"),
    adults: int = Query(2, ge=1),
    rooms: int = Query(1, ge=1),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    star_ratings: Optional[str] = Query(None, description="Comma separated star ratings e.g. 4,5"),
    amenities: Optional[str] = Query(None, description="Comma separated amenities"),
    policies: Optional[str] = Query(None, description="Comma separated policies e.g. couple_friendly,pet_friendly"),
    property_type: Optional[str] = Query(None, description="hotel, resort, lodge, room"),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: float = Query(35.0, ge=1, le=200),
    sort_by: str = Query("RECOMMENDED", description="PRICE_LOW_HIGH, PRICE_HIGH_LOW, RATING_HIGH_LOW, DISTANCE"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search hotels with PostGIS spatial radius, city, multi-filters, and price aggregation."""
    service = HotelService(db)

    stars_list = [int(s.strip()) for s in star_ratings.split(",") if s.strip().isdigit()] if star_ratings else None
    amenities_list = [a.strip() for a in amenities.split(",") if a.strip()] if amenities else None
    policies_list = [p.strip() for p in policies.split(",") if p.strip()] if policies else None

    results = await service.search_hotels(
        city=city,
        query_text=q,
        check_in=check_in,
        check_out=check_out,
        adults=adults,
        rooms=rooms,
        min_price=min_price,
        max_price=max_price,
        star_ratings=stars_list,
        amenities=amenities_list,
        policies=policies_list,
        property_type=property_type,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )
    return {"status": "success", "data": results}


@router.get("/featured")
async def get_featured_hotels(
    city: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Fetch featured and recommended hotels for the home discovery feed."""
    service = HotelService(db)
    results = await service.search_hotels(
        city=city,
        sort_by="RATING_HIGH_LOW",
        page=1,
        page_size=6,
    )
    return {"status": "success", "data": results["hotels"]}


@router.get("/my-bookings")
async def get_my_hotel_bookings(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieve all hotel bookings and stay history for the logged-in customer."""
    service = HotelService(db)
    bookings = await service.get_customer_bookings(user.user_id_str)
    return {"status": "success", "data": bookings}


@router.get("/bookings/{booking_id}")
async def get_hotel_booking_by_id(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Get single confirmed hotel booking voucher and stay status."""
    service = HotelService(db)
    booking = await service.get_booking_details(booking_id)
    return {"status": "success", "data": booking}


@router.post("/bookings/{booking_id}/cancel")
async def cancel_hotel_booking(
    booking_id: str,
    payload: CancelBookingRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Cancel hotel reservation with automated refund settlement to customer wallet."""
    service = HotelService(db)
    result = await service.cancel_hotel_booking(
        customer_user_id=user.user_id_str,
        booking_id=booking_id,
        reason=payload.reason,
    )
    return {"status": "success", "data": result}


@router.post("/bookings/{booking_id}/link-ride")
async def link_airport_ride(
    booking_id: str,
    payload: LinkRideRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Cross-Service Bridge: Create linked Airport/Hotel cab ride.
    Dispatches to standard Cab Booking System. Driver receives only transportation trip.
    """
    service = HotelService(db)
    result = await service.link_cab_ride_to_stay(
        customer_user_id=user.user_id_str,
        booking_id=booking_id,
        ride_direction=payload.ride_direction,
        airport_name=payload.airport_name,
        airport_lat=payload.airport_lat,
        airport_lng=payload.airport_lng,
        scheduled_time=payload.scheduled_time,
        vehicle_type=payload.vehicle_type,
        flight_number=payload.flight_number,
    )
    return {"status": "success", "data": result}


@router.get("/{property_id}")
async def get_hotel_details(
    property_id: str,
    check_in: Optional[date] = Query(None),
    check_out: Optional[date] = Query(None),
    guests: int = Query(2, ge=1),
    db: AsyncSession = Depends(get_db),
):
    """Fetch complete hotel metadata, photo gallery, policies, and room tiers."""
    service = HotelService(db)
    details = await service.get_hotel_details(
        property_id=property_id,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
    )
    return {"status": "success", "data": details}


@router.post("/{unit_id}/quote")
async def get_room_pricing_quote(
    unit_id: str,
    payload: RoomQuoteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Calculate authoritative pricing quote with GST tax breakdown and add-ons."""
    service = HotelService(db)
    quote = await service.calculate_quote(
        unit_id=unit_id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        rooms_count=payload.rooms_count,
        guests_count=payload.guests_count,
        add_on_codes=payload.add_on_codes,
        promo_code=payload.promo_code,
    )
    return {"status": "success", "data": quote}


@router.post("/book")
async def create_hotel_booking(
    payload: HotelBookingCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Create confirmed hotel booking with room lock and wallet settlement."""
    service = HotelService(db)
    booking = await service.create_hotel_booking(
        customer_user_id=user.user_id_str,
        unit_id=payload.unit_id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        primary_guest_name=payload.primary_guest_name,
        primary_guest_phone=payload.primary_guest_phone,
        primary_guest_email=payload.primary_guest_email,
        rooms_count=payload.rooms_count,
        guests_count=payload.guests_count,
        special_requests=payload.special_requests,
        add_on_codes=payload.add_on_codes,
        payment_method=payload.payment_method,
        promo_code=payload.promo_code,
        idempotency_key=payload.idempotency_key,
        additional_guests=[g.model_dump() for g in payload.additional_guests] if payload.additional_guests else None,
    )
    return {"status": "success", "data": booking}
