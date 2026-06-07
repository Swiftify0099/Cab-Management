"""
Trip API  Driver creates/manages trips, Customer searches trips.
Phase 3
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import (
    get_current_user,
    get_current_active_driver,
    AuthenticatedUser,
)
from common.schemas.base import SuccessResponse
from app.services.trip_service import TripService

trip_router = APIRouter()


#  Request schemas 

class CreateTripRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    destination_lat: float
    destination_lng: float
    departure_time: str
    total_seats: int
    vehicle_type: str = "sedan"
    base_fare: float
    per_km_rate: float = 3.5
    parcel_enabled: bool = False
    women_only: bool = False
    window_seats: int = 0
    window_seat_charge: float = 0.0
    notes: Optional[str] = None
    route_stops: Optional[list] = None

    @field_validator("total_seats")
    @classmethod
    def validate_seats(cls, v: int) -> int:
        if v < 1 or v > 40:
            raise ValueError("Seats must be 140")
        return v


class SearchTripsRequest(BaseModel):
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float
    departure_date: str
    seats_needed: int = 1
    vehicle_type: Optional[str] = None
    women_only: bool = False
    with_parcel: bool = False


#  Routes 

@trip_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse,
    summary="Driver: create a new trip",
)
async def create_trip(
    request: CreateTripRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    try:
        trip = await service.create_trip(
            driver_user_id=current_user.user_id_str,
            pickup_lat=request.pickup_lat,
            pickup_lng=request.pickup_lng,
            destination_lat=request.destination_lat,
            destination_lng=request.destination_lng,
            departure_time=datetime.fromisoformat(request.departure_time.replace("Z", "+00:00")),
            total_seats=request.total_seats,
            vehicle_type=request.vehicle_type,
            base_fare=request.base_fare,
            per_km_rate=request.per_km_rate,
            parcel_enabled=request.parcel_enabled,
            women_only=request.women_only,
            window_seats=request.window_seats,
            window_seat_charge=request.window_seat_charge,
            notes=request.notes,
            route_stops=request.route_stops,
        )
        return SuccessResponse(success=True, message="Trip created", data=trip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@trip_router.post("/search", response_model=SuccessResponse, summary="Customer: search available trips")
async def search_trips(
    request: SearchTripsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = TripService(db)
    departure = datetime.fromisoformat(request.departure_date)
    trips = await service.search_trips(
        from_lat=request.from_lat,
        from_lng=request.from_lng,
        to_lat=request.to_lat,
        to_lng=request.to_lng,
        departure_date=departure,
        seats_needed=request.seats_needed,
        vehicle_type=request.vehicle_type,
        women_only=request.women_only,
        with_parcel=request.with_parcel,
    )
    return SuccessResponse(success=True, message=f"{len(trips)} trips found", data=trips)


@trip_router.get("/my-trips", response_model=SuccessResponse, summary="Driver: list my trips")
async def driver_trips(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    trips = await service.get_driver_trips(
        driver_user_id=current_user.user_id_str,
        status_filter=status_filter,
    )
    return SuccessResponse(success=True, message="Trips retrieved", data=trips)


@trip_router.post("/{trip_id}/publish", response_model=SuccessResponse, summary="Driver: publish trip")
async def publish_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    trip = await service.publish_trip(trip_id, current_user.user_id_str)
    if not trip:
        raise HTTPException(status_code=400, detail="Cannot publish this trip  check status and ownership")
    return SuccessResponse(success=True, message="Trip published", data=trip)


@trip_router.post("/{trip_id}/start", response_model=SuccessResponse, summary="Driver: start trip")
async def start_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    trip = await service.start_trip(trip_id, current_user.user_id_str)
    if not trip:
        raise HTTPException(status_code=400, detail="Cannot start this trip  must be PUBLISHED status")
    return SuccessResponse(success=True, message="Trip started", data=trip)


@trip_router.post("/{trip_id}/complete", response_model=SuccessResponse, summary="Driver: complete trip")
async def complete_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    trip = await service.complete_trip(trip_id, current_user.user_id_str)
    if not trip:
        raise HTTPException(status_code=400, detail="Cannot complete  trip must be IN_PROGRESS")
    return SuccessResponse(success=True, message="Trip completed ", data=trip)


@trip_router.post("/{trip_id}/share", response_model=SuccessResponse, summary="Customer/Driver: Share live trip link")
async def share_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    import uuid
    import base64
    
    # Generate a simple public token (mocking the real crypto/redis token logic)
    token = base64.urlsafe_b64encode(f"{trip_id}:{uuid.uuid4()}".encode()).decode()
    url = f"https://cabooking.com/track/{token}"
    
    return SuccessResponse(
        success=True, 
        message="Live tracking link generated", 
        data={"url": url, "expires_in": 86400}
    )

