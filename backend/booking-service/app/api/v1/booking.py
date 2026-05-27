"""
Booking API — Seat booking + Fare estimation.
Phase 3: Customers book seats on Driver Trips.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from common.schemas.base import SuccessResponse
from app.services.fare_engine import calculate_all_fares, VEHICLE_RATES
from app.services.booking_service import BookingService

booking_router = APIRouter()
fare_router = APIRouter()


# ─── Fare schemas ─────────────────────────────────────────────────────────────

class FareRequest(BaseModel):
    from_city: str
    to_city: str
    departure_time: str
    seats: int = 1
    with_parcel: bool = False
    window_seat: bool = False

    @field_validator("seats")
    @classmethod
    def validate_seats(cls, v: int) -> int:
        if v < 1 or v > 40:
            raise ValueError("Seats must be 1–40")
        return v

    def get_departure(self) -> datetime:
        try:
            return datetime.fromisoformat(self.departure_time.replace("Z", "+00:00"))
        except Exception:
            raise ValueError("Invalid departure_time — use ISO 8601")


# ─── Booking schemas ──────────────────────────────────────────────────────────

class CreateBookingRequest(BaseModel):
    trip_id: str
    seat_count: int = 1
    window_seat: bool = False
    window_seat_count: int = 0
    has_parcel: bool = False
    pickup_address: Optional[str] = None
    drop_address: Optional[str] = None

    @field_validator("seat_count")
    @classmethod
    def validate_seats(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError("You can book 1–10 seats per booking")
        return v


class CancelBookingRequest(BaseModel):
    reason: str


# ─── Fare Routes ──────────────────────────────────────────────────────────────

@fare_router.post(
    "",
    summary="Get fare estimates for any route",
    response_model=SuccessResponse,
)
async def get_fare_estimates(
    request: FareRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    departure = request.get_departure()
    fares = calculate_all_fares(
        request.from_city, request.to_city, departure,
        seats_required=request.seats,
        with_parcel=request.with_parcel,
        window_seat=request.window_seat,
    )
    return SuccessResponse(
        success=True,
        message="Fare calculated successfully",
        data=[f.to_dict() for f in fares],
    )


# ─── Booking Routes ──────────────────────────────────────────────────────────

@booking_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse,
    summary="Book seats on a trip",
)
async def create_booking(
    request: CreateBookingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = BookingService(db)
    try:
        booking = await service.create_booking(
            customer_user_id=current_user.user_id_str,
            trip_id=request.trip_id,
            seat_count=request.seat_count,
            window_seat=request.window_seat,
            window_seat_count=request.window_seat_count,
            has_parcel=request.has_parcel,
            pickup_address=request.pickup_address,
            drop_address=request.drop_address,
        )
        return SuccessResponse(success=True, message="Booking confirmed!", data=booking)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@booking_router.get(
    "/my-trips",
    summary="Get my booking history",
    response_model=SuccessResponse,
)
async def get_my_trips(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = BookingService(db)
    trips = await service.get_customer_trips(
        customer_user_id=current_user.user_id_str,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return SuccessResponse(success=True, message="Trips retrieved", data=trips)


@booking_router.get(
    "/{booking_id}",
    summary="Get booking details",
    response_model=SuccessResponse,
)
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = BookingService(db)
    booking = await service.get_booking(booking_id, current_user.user_id_str)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return SuccessResponse(success=True, message="OK", data=booking)


@booking_router.post(
    "/{booking_id}/cancel",
    summary="Cancel a booking",
    response_model=SuccessResponse,
)
async def cancel_booking(
    booking_id: str,
    request: CancelBookingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = BookingService(db)
    ok = await service.cancel_booking(booking_id, current_user.user_id_str, request.reason)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot cancel this booking")
    return SuccessResponse(success=True, message="Booking cancelled")
