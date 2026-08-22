import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
matching_api_path = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

with open(matching_api_path, "r", encoding="utf-8") as f:
    content = f.read()

new_routes = '''
# ============================================================
# SMART RIDE SELECTION & RADAR ENDPOINTS (Feature 6)
# ============================================================

from app.services.smart_radar import SmartRadarService
from app.services.atomic_matching import AtomicMatchingEngine


class UpdateDriverPreferenceSchema(BaseModel):
    mode: Optional[str] = None
    allow_local: Optional[bool] = None
    allow_airport: Optional[bool] = None
    allow_outstation: Optional[bool] = None
    allow_scheduled: Optional[bool] = None
    min_earning_cutoff: Optional[float] = None
    max_pickup_distance_km: Optional[float] = None
    max_pickup_eta_min: Optional[int] = None
    destination_mode: Optional[str] = None
    destination_address: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None


class RadarMatchRequestSchema(BaseModel):
    selected_ride_ids: List[str]


@router.get(
    "/preferences",
    response_model=SuccessResponse,
    summary="Driver: Get personal matching preferences",
)
async def get_driver_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """Fetch driver's active driving mode, trip types, and pickup constraints."""
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = SmartRadarService(db)
    pref = await service.get_or_create_driver_preferences(driver.id)
    return SuccessResponse(
        success=True,
        message="Preferences retrieved",
        data={
            "mode": pref.mode,
            "allow_local": pref.allow_local,
            "allow_airport": pref.allow_airport,
            "allow_outstation": pref.allow_outstation,
            "allow_scheduled": pref.allow_scheduled,
            "min_earning_cutoff": pref.min_earning_cutoff,
            "max_pickup_distance_km": pref.max_pickup_distance_km,
            "max_pickup_eta_min": pref.max_pickup_eta_min,
            "destination_mode": pref.destination_mode,
            "destination_address": pref.destination_address,
            "destination_lat": pref.destination_lat,
            "destination_lng": pref.destination_lng,
        },
    )


@router.patch(
    "/preferences",
    response_model=SuccessResponse,
    summary="Driver: Update personal matching preferences",
)
async def update_driver_preferences_endpoint(
    request: UpdateDriverPreferenceSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """Update driver driving mode (Balanced, Best Earnings, Nearby Focus, Airport), constraints, and destination mode."""
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = SmartRadarService(db)
    pref = await service.update_driver_preferences(
        driver_id=driver.id,
        mode=request.mode,
        allow_local=request.allow_local,
        allow_airport=request.allow_airport,
        allow_outstation=request.allow_outstation,
        allow_scheduled=request.allow_scheduled,
        min_earning_cutoff=request.min_earning_cutoff,
        max_pickup_distance_km=request.max_pickup_distance_km,
        max_pickup_eta_min=request.max_pickup_eta_min,
        destination_mode=request.destination_mode,
        destination_address=request.destination_address,
        destination_lat=request.destination_lat,
        destination_lng=request.destination_lng,
    )
    return SuccessResponse(
        success=True,
        message="Preferences saved successfully",
        data={
            "mode": pref.mode,
            "allow_local": pref.allow_local,
            "allow_airport": pref.allow_airport,
            "allow_outstation": pref.allow_outstation,
            "allow_scheduled": pref.allow_scheduled,
            "min_earning_cutoff": pref.min_earning_cutoff,
            "max_pickup_distance_km": pref.max_pickup_distance_km,
            "max_pickup_eta_min": pref.max_pickup_eta_min,
            "destination_mode": pref.destination_mode,
            "destination_address": pref.destination_address,
            "destination_lat": pref.destination_lat,
            "destination_lng": pref.destination_lng,
        },
    )


@router.get(
    "/radar/candidates",
    response_model=SuccessResponse,
    summary="Driver: Discover Smart Ride Radar personalized opportunities",
)
async def get_smart_radar_candidates(
    filter_type: str = Query("all", description="all, recommended, best_earnings, closest, airport"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Returns top N personalized, scored candidate rides matching driver preferences for Smart Radar view.
    """
    service = SmartRadarService(db)
    candidates = await service.get_smart_radar_rides(
        driver_user_id=current_user.user_id_str,
        filter_type=filter_type,
    )
    return SuccessResponse(
        success=True,
        message=f"{len(candidates)} matching trips found in your radar",
        data={
            "candidates": candidates,
            "count": len(candidates),
        },
    )


@router.post(
    "/radar/match",
    response_model=SuccessResponse,
    summary="Driver: Submit interest in 1 or more Smart Radar candidate rides",
)
async def submit_radar_match(
    request: RadarMatchRequestSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Driver selects one or multiple candidate rides from Smart Radar.
    Backend performs atomic assignment using SELECT FOR UPDATE.
    """
    engine = AtomicMatchingEngine(db)
    result = await engine.submit_radar_match_interest(
        driver_user_id=current_user.user_id_str,
        selected_ride_ids=request.selected_ride_ids,
    )
    return SuccessResponse(
        success=result["success"],
        message=result["message"],
        data=result,
    )
'''

if "/radar/candidates" not in content:
    content += "\n" + new_routes
    with open(matching_api_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("[OK] Updated matching.py with Feature 6 endpoints")
