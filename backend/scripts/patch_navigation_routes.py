import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
matching_api_path = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

with open(matching_api_path, "r", encoding="utf-8") as f:
    content = f.read()

new_routes = '''
# ============================================================
# NAVIGATION & HAZARD ENDPOINTS (Feature 7)
# ============================================================

from app.services.routing_gatekeeper import RoutingGatekeeper
from app.services.hazard_service import HazardService
from app.services.navigation_service import NavigationService


class NavigationArrivalSchema(BaseModel):
    ride_id: str
    phase: str  # pickup or dropoff
    latitude: float
    longitude: float


class ReportHazardSchema(BaseModel):
    hazard_type: str  # construction, pothole, accident, road_closed, heavy_traffic, flooding, other
    latitude: float
    longitude: float
    description: Optional[str] = None
    heading: Optional[float] = None
    speed_kmh: Optional[float] = None
    ride_id: Optional[str] = None


@router.get(
    "/navigation/route",
    response_model=SuccessResponse,
    summary="Navigation: Fetch authoritative road route with turn-by-turn maneuvers",
)
async def get_navigation_route(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
    ride_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Centralized server-authoritative route with Redis caching and in-flight request deduplication.
    Prevents mobile from ever calling Google Routes API directly.
    """
    import os
    google_key = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY")
    route = await RoutingGatekeeper.get_route(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        google_api_key=google_key,
        db=db,
        ride_id=ride_id,
        driver_id=current_user.user_id_str,
    )
    return SuccessResponse(
        success=True,
        message="Navigation route generated",
        data=route,
    )


@router.post(
    "/navigation/arrival",
    response_model=SuccessResponse,
    summary="Navigation: Authoritative PostGIS arrival verification",
)
async def verify_arrival(
    request: NavigationArrivalSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Validates driver physical arrival at pickup (<60m) or dropoff (<80m) using PostGIS spatial logic.
    """
    import uuid
    service = NavigationService(db)
    ride_uuid = uuid.UUID(request.ride_id)
    if request.phase == "pickup":
        is_arrived, msg, dist_m = await service.verify_pickup_arrival(
            ride_id=ride_uuid,
            driver_lat=request.latitude,
            driver_lng=request.longitude,
        )
    else:
        is_arrived, msg, dist_m = await service.verify_destination_arrival(
            ride_id=ride_uuid,
            driver_lat=request.latitude,
            driver_lng=request.longitude,
        )

    return SuccessResponse(
        success=is_arrived,
        message=msg,
        data={
            "is_arrived": is_arrived,
            "distance_meters": round(dist_m, 1),
            "phase": request.phase,
        },
    )


@router.post(
    "/navigation/hazard",
    response_model=SuccessResponse,
    summary="Navigation: Submit one-tap road hazard with PostGIS spatial clustering",
)
async def report_hazard(
    request: ReportHazardSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Captures driver road hazard. Clusters duplicates within 50m to avoid clutter.
    """
    from common.models.all_models import Driver
    import uuid
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()

    service = HazardService(db)
    hazard = await service.report_hazard(
        driver_id=driver.id if driver else None,
        hazard_type=request.hazard_type,
        latitude=request.latitude,
        longitude=request.longitude,
        description=request.description,
        heading=request.heading,
        speed_kmh=request.speed_kmh,
        ride_id=uuid.UUID(request.ride_id) if request.ride_id else None,
    )
    return SuccessResponse(
        success=True,
        message=f"Hazard '{hazard.hazard_type}' recorded successfully. Confidence: {hazard.confidence_score}",
        data={
            "hazard_id": str(hazard.id),
            "hazard_type": hazard.hazard_type,
            "status": hazard.status,
            "confidence_score": hazard.confidence_score,
            "report_count": hazard.report_count,
        },
    )


@router.get(
    "/navigation/hazards",
    response_model=SuccessResponse,
    summary="Navigation: Fetch active road hazards near driver location",
)
async def get_nearby_hazards(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_meters: float = Query(1500.0),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """Returns active road hazards along driver route using PostGIS ST_DWithin."""
    service = HazardService(db)
    hazards = await service.get_nearby_hazards(
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
    )
    return SuccessResponse(
        success=True,
        message=f"{len(hazards)} hazards found nearby",
        data={"hazards": hazards, "count": len(hazards)},
    )
'''

if "/navigation/route" not in content:
    content += "\n" + new_routes
    with open(matching_api_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("[OK] Updated matching.py with Feature 7 endpoints")
