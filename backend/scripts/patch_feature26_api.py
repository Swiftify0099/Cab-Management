import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
api_file = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

print("Reading matching.py...")
with open(api_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add ScheduledRideService import
if "from app.services.scheduled_ride_service import ScheduledRideService" not in content:
    import_stmt = "from app.services.scheduled_ride_service import ScheduledRideService\n"
    if "from app.services.notification_center_service import NotificationCenterService" in content:
        content = content.replace("from app.services.notification_center_service import NotificationCenterService", "from app.services.notification_center_service import NotificationCenterService\n" + import_stmt)
    else:
        content = import_stmt + content
    print("✓ Added ScheduledRideService import to matching.py")

# 2. Add API endpoints
if "@router.get(\"/scheduled/available\"" not in content and "@router.get('/scheduled/available'" not in content:
    feature26_routes = """

# ============================================================
# FEATURE 26: SCHEDULED / RESERVED TRIPS ENDPOINTS
# ============================================================

@router.get("/scheduled/available")
async def get_available_scheduled_rides(
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns list of open, unassigned advance scheduled bookings.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    service = ScheduledRideService(db)
    return await service.get_available_scheduled_rides(
        driver_id=driver.id if driver else None,
        limit=limit,
        offset=offset
    )


@router.post("/scheduled/{ride_id}/accept")
async def accept_scheduled_reservation(
    ride_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Atomically claims an advance scheduled booking for driver with SELECT FOR UPDATE row locking.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = ScheduledRideService(db)
    return await service.accept_scheduled_reservation(driver_id=driver.id, ride_id=ride_id)


@router.get("/scheduled/upcoming")
async def get_upcoming_scheduled_trips(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns upcoming confirmed advance reservations for the authenticated driver.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = ScheduledRideService(db)
    return await service.get_driver_scheduled_trips(driver_id=driver.id)


@router.post("/scheduled/{ride_id}/start-heading")
async def start_heading_to_scheduled_pickup(
    ride_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Transitions reserved scheduled trip into active DISPATCHED state.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = ScheduledRideService(db)
    return await service.start_heading_to_scheduled_pickup(driver_id=driver.id, ride_id=ride_id)


@router.post("/scheduled/{ride_id}/cancel")
async def cancel_scheduled_reservation(
    ride_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Cancels a reserved scheduled ride with early vs late policy enforcement.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    reason = payload.get("reason", "Driver emergency")
    service = ScheduledRideService(db)
    return await service.cancel_scheduled_reservation(driver_id=driver.id, ride_id=ride_id, reason=reason)


@router.post("/scheduled/auto-release-check")
async def check_scheduled_auto_releases(
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Background worker endpoint: Automatically releases unfulfilled reservations back to open pool.
    \"\"\"
    service = ScheduledRideService(db)
    return await service.check_and_auto_release_expired()


@router.post("/scheduled/dev-simulate")
async def simulate_scheduled_dev_scenario(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Developer Mode sandbox simulator for seeding scheduled bookings and testing edge cases.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    scenario_key = payload.get("scenario_key", "SEED_AVAILABLE_SCHEDULED_RIDES")

    service = ScheduledRideService(db)
    return await service.simulate_dev_scenario(
        driver_id=driver.id if driver else uuid.uuid4(),
        scenario_key=scenario_key
    )
"""
    content += feature26_routes
    print("✓ Appended Feature 26 API endpoints to matching.py")
else:
    print("✓ Feature 26 API endpoints already registered in matching.py")

with open(api_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated matching.py for Feature 26")
