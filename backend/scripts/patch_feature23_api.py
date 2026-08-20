import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
api_file = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

print("Reading matching.py...")
with open(api_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import for AISmartDriverService
if "from app.services.ai_smart_driver_service import AISmartDriverService" not in content:
    import_stmt = "from app.services.ai_smart_driver_service import AISmartDriverService\n"
    if "from app.services.rating_feedback_service import RatingFeedbackService" in content:
        content = content.replace("from app.services.rating_feedback_service import RatingFeedbackService", "from app.services.rating_feedback_service import RatingFeedbackService\n" + import_stmt)
    else:
        content = import_stmt + content
    print("✓ Added AISmartDriverService import to matching.py")

# 2. Add API Endpoints
if "@router.get(\"/ai/driver-insights\"" not in content and "@router.get('/ai/driver-insights'" not in content:
    feature23_routes = """

# ============================================================
# FEATURE 23: AI / SMART DRIVER ASSISTANCE ENDPOINTS
# ============================================================

@router.get("/ai/driver-insights")
async def get_driver_ai_insights(
    lat: Optional[float] = 18.5204,
    lng: Optional[float] = 73.8567,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns real-time AI summary: predicted hourly rate, demand trend, best zone, and fatigue state.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.get_driver_ai_insights(driver.id, current_lat=lat, current_lng=lng)


@router.get("/ai/demand-forecast")
async def get_demand_forecast(
    lat: Optional[float] = 18.5204,
    lng: Optional[float] = 73.8567,
    radius_km: Optional[float] = 20.0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns spatial demand forecast zones with 15m/30m/60m surge projections (PostGIS-backed).
    \"\"\"
    service = AISmartDriverService(db)
    return await service.get_demand_forecast(lat=lat, lng=lng, radius_km=radius_km)


@router.get("/ai/best-zones")
async def get_best_zones(
    lat: Optional[float] = 18.5204,
    lng: Optional[float] = 73.8567,
    limit: Optional[int] = 5,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns ranked high-opportunity zones near driver with distance, road ETA, and surge multiplier.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.get_best_zones(driver.id, lat=lat, lng=lng, limit=limit)


@router.get("/ai/earnings-prediction")
async def get_earnings_prediction(
    timeframe: Optional[str] = "hourly",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns estimated earnings projections based on historical double-entry ledger.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.get_earnings_prediction(driver.id, timeframe=timeframe)


@router.get("/ai/fatigue-status")
async def get_fatigue_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns continuous driving duration and safe break recommendations.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.get_fatigue_status(driver.id)


@router.post("/ai/fatigue-break-taken")
async def record_fatigue_break_taken(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Acknowledge rest break taken by driver and log to fatigue ledger.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.record_fatigue_break(driver.id)


@router.post("/ai/report-risk-signal")
async def report_risk_signal(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Records internal GPS/telemetry anomalies (impossible speed, fake GPS jump).
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    signal_type = payload.get("signal_type", "SENSOR_MISMATCH")
    details = payload.get("details_json", {})
    ride_id = uuid.UUID(payload["ride_id"]) if payload.get("ride_id") else None

    service = AISmartDriverService(db)
    return await service.evaluate_risk_signal(driver.id, signal_type, details, ride_id=ride_id)


@router.post("/ai/dev-simulate")
async def simulate_ai_dev_scenario(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Developer Mode simulator for testing 10+ AI states safely.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    scenario_key = payload.get("scenario_key", "RESET_ALL")
    service = AISmartDriverService(db)
    return await service.simulate_dev_scenario(driver.id, scenario_key)
"""
    content += feature23_routes
    print("✓ Appended Feature 23 API endpoints to matching.py")
else:
    print("✓ Feature 23 API endpoints already registered in matching.py")

with open(api_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated matching.py")
