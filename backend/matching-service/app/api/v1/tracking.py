"""
Tracking API — Phase 5.
Exposes REST endpoints for live location, ETA, and trip route polyline.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from common.schemas.base import SuccessResponse
from app.services.tracking import TrackingService

router = APIRouter()


class LocationUpdateRequest(BaseModel):
    trip_id: str
    latitude: float
    longitude: float
    speed_kmh: float = 0.0
    heading: float = 0.0
    accuracy_m: float = 0.0
    altitude_m: Optional[float] = None
    booking_id: Optional[str] = None


@router.post(
    "/update",
    response_model=SuccessResponse,
    summary="Driver: Push a GPS location update",
)
async def push_location(
    request: LocationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Called by the driver app every ~5 seconds during an active trip.
    Persists to DB, updates Redis cache, broadcasts to trip room.
    """
    service = TrackingService(db)
    location_data = await service.record_location(
        trip_id=request.trip_id,
        driver_id=current_user.user_id_str,
        latitude=request.latitude,
        longitude=request.longitude,
        speed_kmh=request.speed_kmh,
        heading=request.heading,
        accuracy_m=request.accuracy_m,
        altitude_m=request.altitude_m,
        booking_id=request.booking_id,
    )
    return SuccessResponse(success=True, message="Location recorded", data=location_data)


@router.get(
    "/trip/{trip_id}/current",
    response_model=SuccessResponse,
    summary="Get driver's latest location for a trip",
)
async def get_current_location(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Customer polls this to get current driver location + ETA.
    (WebSocket is primary; this is the fallback REST endpoint.)
    """
    service = TrackingService(db)
    location = await service.get_latest_location(trip_id)
    if not location:
        raise HTTPException(
            status_code=404,
            detail="No location data available. Driver may not have started yet.",
        )
    return SuccessResponse(success=True, message="OK", data=location)


@router.get(
    "/trip/{trip_id}/route",
    response_model=SuccessResponse,
    summary="Get full GPS route polyline for a trip",
)
async def get_trip_route(
    trip_id: str,
    limit: int = 500,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns the ordered list of GPS points to draw on map.
    Used for completed trip replay or live route display.
    """
    service = TrackingService(db)
    route = await service.get_trip_route(trip_id, limit=min(limit, 2000))
    return SuccessResponse(
        success=True,
        message=f"{len(route)} GPS points",
        data=route,
    )
