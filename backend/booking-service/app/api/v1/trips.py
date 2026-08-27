"""
Trip API — Driver creates/manages trips, Customer searches trips.
Multi-service support (Cab, Transport, Organization, Parcel, Hotel, Airport, Packers & Movers)
with Saved Locations, Recurrence Management, and PostGIS Route Integration.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
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
from app.services.recurrence_engine import RecurrenceEngineService

trip_router = APIRouter()


# ─── Request schemas ──────────────────────────────────────────────────────────

class PolygonCoord(BaseModel):
    lat: float
    lng: float


class CreateTripRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    destination_lat: float
    destination_lng: float
    departure_time: str
    total_seats: int = 4
    vehicle_type: str = "sedan"
    base_fare: float = 450.0
    per_km_rate: float = 3.5
    min_fare: Optional[float] = None
    is_negotiable: bool = False
    service_type: str = "cab"
    visibility_mode: str = "SPECIFIC_CITY"
    recurrence_type: str = "SPECIFIC_DATE"
    days_of_week: Optional[List[int]] = None
    excluded_dates: Optional[List[str]] = None
    max_route_deviation_km: float = 3.0
    max_pickup_radius_km: float = 5.0
    max_pickup_deviation_left_km: float = 3.0
    max_pickup_deviation_right_km: float = 3.0
    allowed_drop_deviation_km: float = 3.0
    pickup_address: Optional[str] = None
    destination_address: Optional[str] = None
    pickup_city: Optional[str] = None
    destination_city: Optional[str] = None
    parcel_enabled: bool = False
    women_only: bool = False
    window_seats: int = 0
    window_seat_charge: float = 0.0
    notes: Optional[str] = None
    route_stops: Optional[list] = None
    non_stop: bool = False
    vehicle_id: Optional[str] = None
    organization_id: Optional[str] = None
    service_metadata: Optional[dict] = None
    encoded_polyline: Optional[str] = None
    distance_km: Optional[float] = None
    duration_minutes: Optional[int] = None
    pickup_polygon: Optional[List[PolygonCoord]] = None
    destination_polygon: Optional[List[PolygonCoord]] = None

    @field_validator("total_seats")
    @classmethod
    def validate_seats(cls, v: int) -> int:
        if v < 1 or v > 60:
            raise ValueError("Seats must be between 1 and 60")
        return v


class SavedLocationRequest(BaseModel):
    label: str
    address: str
    latitude: float
    longitude: float
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    landmark: Optional[str] = None
    location_type: str = "both"  # pickup, drop, both
    is_default: bool = False


class SearchTripsRequest(BaseModel):
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float
    departure_date: str
    service_type: Optional[str] = "cab"
    seats_needed: int = 1
    vehicle_type: Optional[str] = None
    women_only: bool = False
    with_parcel: bool = False


# ─── Routes ───────────────────────────────────────────────────────────────────

@trip_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse,
    summary="Driver: create and publish a new intercity trip",
)
@trip_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse,
    summary="Driver: create and publish a new intercity trip",
)
@trip_router.post(
    "/publish-intercity",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse,
    summary="Driver: multi-step publish intercity trip wizard endpoint",
)
async def create_trip(
    request: CreateTripRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    try:
        dep_time = datetime.fromisoformat(request.departure_time.replace("Z", "+00:00"))
        trip = await service.create_trip(
            driver_user_id=current_user.user_id_str,
            pickup_lat=request.pickup_lat,
            pickup_lng=request.pickup_lng,
            destination_lat=request.destination_lat,
            destination_lng=request.destination_lng,
            departure_time=dep_time,
            total_seats=request.total_seats,
            vehicle_type=request.vehicle_type,
            base_fare=request.base_fare,
            per_km_rate=request.per_km_rate,
            min_fare=request.min_fare,
            is_negotiable=request.is_negotiable,
            service_type=request.service_type,
            visibility_mode=request.visibility_mode,
            recurrence_type=request.recurrence_type,
            days_of_week=request.days_of_week,
            excluded_dates=request.excluded_dates,
            max_route_deviation_km=request.max_route_deviation_km,
            max_pickup_radius_km=request.max_pickup_radius_km,
            max_pickup_deviation_left_km=request.max_pickup_deviation_left_km,
            max_pickup_deviation_right_km=request.max_pickup_deviation_right_km,
            allowed_drop_deviation_km=request.allowed_drop_deviation_km,
            pickup_address=request.pickup_address,
            destination_address=request.destination_address,
            pickup_city=request.pickup_city,
            destination_city=request.destination_city,
            parcel_enabled=request.parcel_enabled,
            women_only=request.women_only,
            window_seats=request.window_seats,
            window_seat_charge=request.window_seat_charge,
            notes=request.notes,
            route_stops=request.route_stops,
            non_stop=request.non_stop,
            vehicle_id=request.vehicle_id,
            organization_id=request.organization_id,
            service_metadata=request.service_metadata,
            encoded_polyline=request.encoded_polyline,
            distance_km=request.distance_km,
            pickup_polygon=[{"lat": p.lat, "lng": p.lng} for p in request.pickup_polygon] if request.pickup_polygon else None,
            destination_polygon=[{"lat": p.lat, "lng": p.lng} for p in request.destination_polygon] if request.destination_polygon else None,
        )
        trip_id = trip.get("id")

        if trip_id and request.encoded_polyline:
            background_tasks.add_task(
                _store_route_and_match,
                trip_id=str(trip_id),
                encoded_polyline=request.encoded_polyline,
                distance_km=request.distance_km,
                duration_minutes=request.duration_minutes,
                pickup_polygon=[{"lat": p.lat, "lng": p.lng} for p in request.pickup_polygon] if request.pickup_polygon else None,
                destination_polygon=[{"lat": p.lat, "lng": p.lng} for p in request.destination_polygon] if request.destination_polygon else None,
            )

        return SuccessResponse(success=True, message="Trip published successfully", data=trip)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@trip_router.get(
    "/driver-published-trips",
    response_model=SuccessResponse,
    summary="Driver: list all published trips across services",
)
async def get_driver_published_trips(
    service_type: Optional[str] = Query(None, description="Filter by service: cab, transport, organization, parcel, hotel, airport, packers, or all"),
    status: Optional[str] = Query(None, description="Filter by status: published, full, in_progress, completed, cancelled, or all"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    trips = await service.get_driver_trips(
        driver_user_id=current_user.user_id_str,
        service_type=service_type,
        status_filter=status,
        limit=limit,
    )
    return SuccessResponse(success=True, message="Driver published trips retrieved", data=trips)


# ─── Saved Driver Locations Endpoints ─────────────────────────────────────────

@trip_router.get(
    "/saved-locations",
    response_model=SuccessResponse,
    summary="Driver: list saved pickup/drop locations",
)
async def get_saved_locations(
    location_type: Optional[str] = Query(None, description="pickup, drop, or all"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    locs = await service.list_saved_locations(current_user.user_id_str, location_type)
    return SuccessResponse(success=True, message="Saved locations retrieved", data=locs)


@trip_router.post(
    "/saved-locations",
    status_code=status.HTTP_201_CREATED,
    response_model=SuccessResponse,
    summary="Driver: save a new frequent location",
)
async def create_saved_location(
    request: SavedLocationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    loc = await service.create_saved_location(current_user.user_id_str, request.model_dump())
    return SuccessResponse(success=True, message="Location saved successfully", data=loc)


@trip_router.put(
    "/saved-locations/{location_id}",
    response_model=SuccessResponse,
    summary="Driver: update a saved location",
)
async def update_saved_location(
    location_id: str,
    request: SavedLocationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    loc = await service.update_saved_location(current_user.user_id_str, location_id, request.model_dump())
    if not loc:
        raise HTTPException(status_code=404, detail="Saved location not found")
    return SuccessResponse(success=True, message="Saved location updated", data=loc)


@trip_router.delete(
    "/saved-locations/{location_id}",
    response_model=SuccessResponse,
    summary="Driver: delete a saved location",
)
async def delete_saved_location(
    location_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = TripService(db)
    ok = await service.delete_saved_location(current_user.user_id_str, location_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Saved location not found")
    return SuccessResponse(success=True, message="Saved location deleted")


# ─── Recurrence Renewal Endpoint ──────────────────────────────────────────────

@trip_router.post(
    "/recurrence/renew-daily",
    response_model=SuccessResponse,
    summary="Driver / System: trigger daily instance generation for recurring template",
)
async def renew_daily_trip_instance(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    import uuid as _uuid
    service = RecurrenceEngineService(db)
    trip = await service.generate_daily_instance(template_id=_uuid.UUID(template_id), force=True)
    if not trip:
        raise HTTPException(status_code=400, detail="Could not generate trip instance from template")
    return SuccessResponse(success=True, message="Today's trip instance renewed", data={"trip_id": str(trip.id)})


# ─── Organizations & Campus Fleets ────────────────────────────────────────────

@trip_router.get(
    "/organizations",
    response_model=SuccessResponse,
    summary="List registered colleges / corporate organizations",
)
async def get_organizations(
    org_type: Optional[str] = Query(None, description="college, corporate, or all"),
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    orgs = await service.list_organizations(org_type)
    return SuccessResponse(success=True, message="Organizations retrieved", data=orgs)


@trip_router.get(
    "/organizations/{org_id}/routes",
    response_model=SuccessResponse,
    summary="List configured routes for an organization",
)
async def get_organization_routes(
    org_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    routes = await service.list_organization_routes(org_id)
    return SuccessResponse(success=True, message="Organization routes retrieved", data=routes)


@trip_router.get(
    "/organizations/routes/{route_id}/members",
    response_model=SuccessResponse,
    summary="List registered students / members assigned to a route",
)
async def get_route_members(
    route_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = TripService(db)
    members = await service.list_route_members(route_id)
    return SuccessResponse(success=True, message="Route members retrieved", data=members)


async def _store_route_and_match(
    trip_id: str,
    encoded_polyline: str,
    distance_km: Optional[float],
    duration_minutes: Optional[int],
    pickup_polygon: Optional[list],
    destination_polygon: Optional[list],
) -> None:
    """Store route geometry + polygons, then run forward matching in background."""
    import httpx, os
    base = os.environ.get("MATCHING_SERVICE_URL", "http://localhost:8003")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.post(
                f"{base}/api/v1/matching/internal/store-route/{trip_id}",
                json={
                    "encoded_polyline": encoded_polyline,
                    "distance_km": distance_km,
                    "duration_minutes": duration_minutes,
                },
            )
            if pickup_polygon and destination_polygon:
                await client.post(
                    f"{base}/api/v1/matching/internal/store-polygons/{trip_id}",
                    json={
                        "pickup_polygon": pickup_polygon,
                        "destination_polygon": destination_polygon,
                    },
                )
            else:
                await client.post(f"{base}/api/v1/matching/internal/match-trip/{trip_id}")
    except Exception as e:
        pass
