import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
api_file = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

print("Reading matching.py...")
with open(api_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add DriverSettingsService import
if "from app.services.driver_settings_service import DriverSettingsService" not in content:
    import_stmt = "from app.services.driver_settings_service import DriverSettingsService\n"
    if "from app.services.trip_history_service import TripHistoryService" in content:
        content = content.replace("from app.services.trip_history_service import TripHistoryService", "from app.services.trip_history_service import TripHistoryService\n" + import_stmt)
    else:
        content = import_stmt + content
    print("✓ Added DriverSettingsService import to matching.py")

# 2. Add API endpoints
if "@router.get(\"/settings\"" not in content and "@router.get('/settings'" not in content:
    feature28_routes = """

# ============================================================
# FEATURE 28: DRIVER APP SETTINGS & PREFERENCES ENDPOINTS
# ============================================================

@router.get("/settings")
async def get_driver_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Retrieves app preferences and configuration for authenticated driver.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSettingsService(db)
    return await service.get_driver_settings(driver_id=driver.id)


@router.patch("/settings")
async def update_driver_settings(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Updates driver app preferences (language, navigation, audio, auto-accept).
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSettingsService(db)
    return await service.update_driver_settings(driver_id=driver.id, payload=payload)


@router.get("/settings/diagnostics")
async def run_driver_diagnostics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Runs device, network latency, and spatial telemetry diagnostic check.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSettingsService(db)
    return await service.run_diagnostics(driver_id=driver.id)


@router.post("/settings/deactivate")
async def request_account_deactivation(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Submits self-service account deactivation / data privacy request.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSettingsService(db)
    reason = payload.get("reason", "Driver personal decision")
    return await service.request_account_deactivation(driver_id=driver.id, reason=reason)


@router.post("/settings/dev-simulate")
async def simulate_settings_dev_scenario(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Developer Mode sandbox simulator for settings testing.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    scenario_key = payload.get("scenario_key", "RESET_SETTINGS_DEFAULTS")

    service = DriverSettingsService(db)
    return await service.simulate_dev_scenario(
        driver_id=driver.id if driver else uuid.uuid4(),
        scenario_key=scenario_key
    )
"""
    content += feature28_routes
    print("✓ Appended Feature 28 API endpoints to matching.py")
else:
    print("✓ Feature 28 API endpoints already registered in matching.py")

with open(api_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated matching.py for Feature 28")
