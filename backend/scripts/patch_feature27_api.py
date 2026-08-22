import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
api_file = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

print("Reading matching.py...")
with open(api_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add TripHistoryService import
if "from app.services.trip_history_service import TripHistoryService" not in content:
    import_stmt = "from app.services.trip_history_service import TripHistoryService\n"
    if "from app.services.scheduled_ride_service import ScheduledRideService" in content:
        content = content.replace("from app.services.scheduled_ride_service import ScheduledRideService", "from app.services.scheduled_ride_service import ScheduledRideService\n" + import_stmt)
    else:
        content = import_stmt + content
    print("✓ Added TripHistoryService import to matching.py")

# 2. Add API endpoints
if "@router.get(\"/history/trips\"" not in content and "@router.get('/history/trips'" not in content:
    feature27_routes = """

# ============================================================
# FEATURE 27: TRIP HISTORY & DETAILED RECEIPTS ENDPOINTS
# ============================================================

@router.get("/history/trips")
async def get_driver_trip_history(
    status: Optional[str] = "ALL",
    period: Optional[str] = "ALL_TIME",
    limit: Optional[int] = 25,
    offset: Optional[int] = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns paginated trip history feed strictly scoped to authenticated driver.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = TripHistoryService(db)
    return await service.get_driver_trip_history(
        driver_id=driver.id,
        status_filter=status or "ALL",
        date_filter=period or "ALL_TIME",
        limit=limit or 25,
        offset=offset or 0
    )


@router.get("/history/trips/{ride_id}")
async def get_trip_receipt_details(
    ride_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns full transparent itemized financial breakdown, route timeline, and customer feedback.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = TripHistoryService(db)
    return await service.get_trip_receipt_details(driver_id=driver.id, ride_id=ride_id)


@router.get("/history/trips/{ride_id}/export")
async def export_trip_receipt_statement(
    ride_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Generates formatted receipt document text for printing or export.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = TripHistoryService(db)
    return await service.export_trip_receipt(driver_id=driver.id, ride_id=ride_id)


@router.post("/history/dev-simulate")
async def simulate_history_dev_scenario(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Developer Mode sandbox simulator for seeding historical trips and receipts.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    scenario_key = payload.get("scenario_key", "SEED_COMPLETED_TRIP_HISTORY")

    service = TripHistoryService(db)
    return await service.simulate_dev_scenario(
        driver_id=driver.id if driver else uuid.uuid4(),
        scenario_key=scenario_key
    )
"""
    content += feature27_routes
    print("✓ Appended Feature 27 API endpoints to matching.py")
else:
    print("✓ Feature 27 API endpoints already registered in matching.py")

with open(api_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated matching.py for Feature 27")
