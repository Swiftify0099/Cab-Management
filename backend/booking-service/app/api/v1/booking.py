"""
Booking API  Seat booking + Fare estimation.
Phase 3: Customers book seats on Driver Trips.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from common.schemas.base import SuccessResponse
from app.services.fare_engine import calculate_all_fares, VEHICLE_RATES
from app.services.booking_service import BookingService

booking_router = APIRouter()
fare_router = APIRouter()


#  Fare schemas 

class FareRequest(BaseModel):
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float
    departure_time: str
    seats: int = 1
    with_parcel: bool = False
    window_seat: bool = False

    @field_validator("seats")
    @classmethod
    def validate_seats(cls, v: int) -> int:
        if v < 1 or v > 40:
            raise ValueError("Seats must be 140")
        return v

    def get_departure(self) -> datetime:
        try:
            return datetime.fromisoformat(self.departure_time.replace("Z", "+00:00"))
        except Exception:
            raise ValueError("Invalid departure_time  use ISO 8601")


#  Booking schemas 

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
            raise ValueError("You can book 110 seats per booking")
        return v


class CancelBookingRequest(BaseModel):
    reason: str


class CreatePendingBookingRequest(BaseModel):
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    destination_address: str
    destination_lat: float
    destination_lng: float
    travel_date: str
    from_time: str
    to_time: str
    seats_required: int = 1
    parcel: bool = False
    women_only: bool = False

    @field_validator("seats_required")
    @classmethod
    def validate_seats(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError("You can pre-book 1-10 seats")
        return v


#  Fare Routes 

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
        request.from_lat, request.from_lng, request.to_lat, request.to_lng, departure,
        seats_required=request.seats,
        with_parcel=request.with_parcel,
        window_seat=request.window_seat,
    )
    return SuccessResponse(
        success=True,
        message="Fare calculated successfully",
        data=[f.to_dict() for f in fares],
    )

class ApplyCouponRequest(BaseModel):
    code: str
    fare_amount: float

@fare_router.post(
    "/apply-coupon",
    summary="Validate and apply a promo code",
    response_model=SuccessResponse,
)
async def apply_coupon(
    request: ApplyCouponRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from common.models.all_models import Coupon, CouponType, UserCoupon
    from sqlalchemy import select
    from datetime import datetime, timezone

    # 1. Find the active coupon
    result = await db.execute(select(Coupon).where(Coupon.code == request.code.upper(), Coupon.is_active == True))
    coupon = result.scalar_one_or_none()

    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid or expired promo code")

    # 2. Check Expiry
    now_utc = datetime.now(timezone.utc)
    if coupon.end_date < now_utc:
        raise HTTPException(status_code=400, detail="This promo code has expired")

    # 3. Check Minimum Fare
    if coupon.min_trip_amount and request.fare_amount < coupon.min_trip_amount:
        raise HTTPException(status_code=400, detail=f"Minimum fare required is ${coupon.min_trip_amount}")

    # 4. Check global usage limit
    if coupon.usage_limit and coupon.times_used >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="This promo code has reached its usage limit")

    # 5. Check if user already used it (Assuming single use per user for now)
    user_used = await db.execute(
        select(UserCoupon).where(UserCoupon.user_id == current_user.id, UserCoupon.coupon_id == coupon.id)
    )
    if user_used.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You have already used this promo code")

    # 6. Calculate discount
    discount = 0.0
    if coupon.coupon_type == CouponType.FLAT:
        discount = coupon.discount_value
    elif coupon.coupon_type == CouponType.PERCENTAGE:
        discount = request.fare_amount * (coupon.discount_value / 100.0)
        if coupon.max_discount_amount and discount > coupon.max_discount_amount:
            discount = coupon.max_discount_amount
            
    # Ensure fare doesn't go below 0
    discount = min(discount, request.fare_amount)
    new_fare = request.fare_amount - discount

    return SuccessResponse(
        success=True,
        message="Promo code applied!",
        data={
            "coupon_id": str(coupon.id),
            "original_fare": request.fare_amount,
            "discount_amount": round(discount, 2),
            "new_fare": round(new_fare, 2),
            "coupon_type": coupon.coupon_type.value
        }
    )



#  Booking Routes 

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


@booking_router.post(
    "/pending",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse,
    summary="Create a pre-booking intent",
)
async def create_pending_booking(
    request: CreatePendingBookingRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = BookingService(db)
    try:
        pb = await service.create_pending_booking(
            customer_user_id=current_user.user_id_str,
            pickup_address=request.pickup_address,
            pickup_lat=request.pickup_lat,
            pickup_lng=request.pickup_lng,
            destination_address=request.destination_address,
            destination_lat=request.destination_lat,
            destination_lng=request.destination_lng,
            travel_date=request.travel_date,
            from_time=request.from_time,
            to_time=request.to_time,
            seats_required=request.seats_required,
            parcel=request.parcel,
            women_only=request.women_only,
        )
        # Background task for reverse match
        background_tasks.add_task(service.trigger_reverse_match, str(pb["id"]))
        return SuccessResponse(success=True, message="Pre-booking created", data=pb)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@booking_router.get(
    "/pending",
    summary="Get my pending bookings",
    response_model=SuccessResponse,
)
async def get_my_pending_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = BookingService(db)
    pbs = await service.get_pending_bookings(current_user.user_id_str)
    return SuccessResponse(success=True, message="Pending bookings retrieved", data=pbs)


@booking_router.delete(
    "/pending/{pending_booking_id}",
    summary="Cancel a pending booking",
    response_model=SuccessResponse,
)
async def cancel_pending_booking_route(
    pending_booking_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = BookingService(db)
    ok = await service.cancel_pending_booking(pending_booking_id, current_user.user_id_str)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot cancel this pending booking")
    return SuccessResponse(success=True, message="Pending booking cancelled")


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

@booking_router.post(
    "/{booking_id}/driver-cancel",
    summary="Driver cancels an accepted booking",
    response_model=SuccessResponse,
)
async def driver_cancel_booking(
    booking_id: str,
    request: CancelBookingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = BookingService(db)
    result = await service.driver_cancel_booking(booking_id, current_user.user_id_str, request.reason)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Cannot cancel this booking"))
    return SuccessResponse(success=True, message=result.get("message", "Booking cancelled"))
