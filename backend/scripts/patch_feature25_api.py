import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
api_file = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

print("Reading matching.py...")
with open(api_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add NotificationCenterService import
if "from app.services.notification_center_service import NotificationCenterService" not in content:
    import_stmt = "from app.services.notification_center_service import NotificationCenterService\n"
    if "from app.services.support_ticket_service import SupportTicketService" in content:
        content = content.replace("from app.services.support_ticket_service import SupportTicketService", "from app.services.support_ticket_service import SupportTicketService\n" + import_stmt)
    else:
        content = import_stmt + content
    print("✓ Added NotificationCenterService import to matching.py")

# 2. Add API endpoints
if "@router.get(\"/notifications\"" not in content and "@router.get('/notifications'" not in content:
    feature25_routes = """

# ============================================================
# FEATURE 25: NOTIFICATION CENTER & PREFERENCES ENDPOINTS
# ============================================================

@router.get("/notifications")
async def get_notifications_feed(
    category: Optional[str] = None,
    unread_only: Optional[bool] = False,
    limit: Optional[int] = 30,
    offset: Optional[int] = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns paginated notification feed strictly scoped to authenticated user.
    \"\"\"
    service = NotificationCenterService(db)
    return await service.get_notifications(
        user_id=current_user.id,
        category=category,
        is_unread_only=unread_only or False,
        limit=limit,
        offset=offset
    )


@router.get("/notifications/unread-count")
async def get_notification_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns active unread notification counter for badges.
    \"\"\"
    service = NotificationCenterService(db)
    count = await service.get_unread_count(user_id=current_user.id)
    return {"unread_count": count}


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Marks single notification as read.
    \"\"\"
    service = NotificationCenterService(db)
    return await service.mark_as_read(user_id=current_user.id, notification_id=notification_id)


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Bulk marks all unread notifications for authenticated user as read.
    \"\"\"
    service = NotificationCenterService(db)
    return await service.mark_all_as_read(user_id=current_user.id)


@router.delete("/notifications/{notification_id}")
async def delete_notification_item(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Dismisses / deletes a notification item.
    \"\"\"
    service = NotificationCenterService(db)
    return await service.delete_notification(user_id=current_user.id, notification_id=notification_id)


@router.get("/notifications/preferences")
async def get_driver_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Fetches driver notification category preferences.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = NotificationCenterService(db)
    return await service.get_preferences(driver_id=driver.id)


@router.put("/notifications/preferences")
async def update_driver_notification_preferences(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Updates driver notification category preferences.
    \"\"\"
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = NotificationCenterService(db)
    return await service.update_preferences(driver_id=driver.id, payload=payload)


@router.post("/notifications/dev-simulate")
async def simulate_notification_dev_scenario(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Developer Mode sandbox simulator for dispatching test notification alerts.
    \"\"\"
    scenario_key = payload.get("scenario_key", "TRIP_ALERT")
    service = NotificationCenterService(db)
    return await service.simulate_dev_scenario(user_id=current_user.id, scenario_key=scenario_key)
"""
    content += feature25_routes
    print("✓ Appended Feature 25 API endpoints to matching.py")
else:
    print("✓ Feature 25 API endpoints already registered in matching.py")

with open(api_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated matching.py for Feature 25")
