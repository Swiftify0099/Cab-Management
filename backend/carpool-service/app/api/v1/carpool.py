"""
Feature 23: Intercity Carpool FastAPI Router.
Exposes endpoints for driver published trips, passenger search, seat reservations,
boarding OTP verification, waypoint drops, and trip completions.
"""
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from app.services.carpool_service import CarpoolService
from common.middleware.auth import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/carpool", tags=["Intercity Carpool Service"])


async def get_db():
    async with async_session_maker() as session:
        yield session


class PublishTripRequest(BaseModel):
    driver_id: str
    origin_city: str
    origin_address: str
    origin_lat: float
    origin_lng: float
    destination_city: str
    destination_address: str
    destination_lat: float
    destination_lng: float
    scheduled_departure: str
    total_seats: int = 3
    price_per_seat: float
    vehicle_id: Optional[str] = None
    corridor_distance_km: float = 150.0
    waypoints: Optional[List[Dict[str, Any]]] = None
    ladies_only: bool = False
    luggage_allowed: bool = True


class BookSeatsRequest(BaseModel):
    customer_user_id: str
    trip_id: str
    seats_booked: int = 1
    pickup_location: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    drop_location: Optional[str] = None
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None
    payment_method: str = "WALLET"


class BoardingPayload(BaseModel):
    otp: str


class CancelBookingPayload(BaseModel):
    customer_user_id: str
    reason: Optional[str] = None


@router.post("/publish")
async def publish_carpool_trip(payload: PublishTripRequest, db: AsyncSession = Depends(get_db)):
    svc = CarpoolService(db)
    return await svc.publish_trip(**payload.dict())


@router.get("/search")
async def search_carpool_trips(
    origin_city: str = Query(...),
    destination_city: str = Query(...),
    seats_needed: int = Query(1),
    ladies_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    svc = CarpoolService(db)
    data = await svc.search_trips(
        origin_city=origin_city,
        destination_city=destination_city,
        seats_needed=seats_needed,
        ladies_only=ladies_only,
    )
    return {"status": "success", "data": data}


@router.post("/book")
async def book_carpool_seats(payload: BookSeatsRequest, db: AsyncSession = Depends(get_db)):
    svc = CarpoolService(db)
    return await svc.book_seats(**payload.dict())


@router.post("/trips/{trip_id}/start")
async def start_carpool_trip(trip_id: str, driver_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    svc = CarpoolService(db)
    return await svc.start_trip(trip_id=trip_id, driver_id=driver_id)


@router.post("/bookings/{booking_id}/board")
async def verify_passenger_boarding(booking_id: str, payload: BoardingPayload, db: AsyncSession = Depends(get_db)):
    svc = CarpoolService(db)
    return await svc.verify_boarding_otp(booking_id=booking_id, entered_otp=payload.otp)


@router.post("/bookings/{booking_id}/drop")
async def drop_passenger(booking_id: str, db: AsyncSession = Depends(get_db)):
    svc = CarpoolService(db)
    return await svc.drop_passenger(booking_id=booking_id)


@router.post("/trips/{trip_id}/complete")
async def complete_carpool_trip(trip_id: str, driver_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    svc = CarpoolService(db)
    return await svc.complete_trip(trip_id=trip_id, driver_id=driver_id)


@router.post("/bookings/{booking_id}/cancel")
async def cancel_carpool_booking(booking_id: str, payload: CancelBookingPayload, db: AsyncSession = Depends(get_db)):
    svc = CarpoolService(db)
    return await svc.cancel_booking(
        booking_id=booking_id,
        customer_user_id=payload.customer_user_id,
        reason=payload.reason,
    )

@router.get("/driver-requests", summary="Get open carpool ride requests for drivers")
async def get_carpool_driver_requests(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns available carpool requests for drivers."""
    return {"status": "success", "data": []}
