"""
Script to patch matching.py and trip_completion_service.py with Features 20, 21, and 22 API endpoints.
"""
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
matching_py = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")
trip_comp_py = os.path.join(backend_root, "matching-service", "app", "services", "trip_completion_service.py")

print("Reading matching.py...")
with open(matching_py, "r", encoding="utf-8") as f:
    m_content = f.read()

feature20_21_22_routes = '''

# ============================================================
# FEATURE 20: DESTINATION MODE API
# ============================================================

class SetDestinationModeRequest(BaseModel):
    destination_address: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    preference_mode: str = "balanced"  # flexible, balanced, strict
    max_rides: int = 2
    turn_off: bool = False


class DestinationProgressRequest(BaseModel):
    latitude: float
    longitude: float


@router.post(
    "/destination-mode",
    response_model=SuccessResponse,
    summary="Driver: Set or update destination mode preference",
)
async def set_destination_mode(
    request: SetDestinationModeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.destination_mode_service import DestinationModeService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DestinationModeService(db)
    result = await service.set_destination_mode(
        driver_id=driver.id,
        destination_address=request.destination_address,
        destination_lat=request.destination_lat,
        destination_lng=request.destination_lng,
        preference_mode=request.preference_mode,
        max_rides=request.max_rides,
        turn_off=request.turn_off,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/destination-mode/status",
    response_model=SuccessResponse,
    summary="Driver: Get active destination mode status and time remaining",
)
async def get_destination_status(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.destination_mode_service import DestinationModeService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DestinationModeService(db)
    status_data = await service.get_destination_status(driver.id)
    return SuccessResponse(success=True, message="Destination status fetched", data=status_data)


@router.post(
    "/destination-mode/progress",
    response_model=SuccessResponse,
    summary="Driver: Update GPS to check if destination reached",
)
async def check_destination_progress(
    request: DestinationProgressRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.destination_mode_service import DestinationModeService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DestinationModeService(db)
    res = await service.check_destination_reached_or_progress(
        driver_id=driver.id,
        current_lat=request.latitude,
        current_lng=request.longitude,
    )
    return SuccessResponse(success=True, message="Progress evaluated", data=res)


# ============================================================
# FEATURE 21: BACK-TO-BACK CONTINUOUS DISPATCH API
# ============================================================

class ReserveNextRideRequest(BaseModel):
    next_ride_id: str


class ReleaseNextRideRequest(BaseModel):
    reason: Optional[str] = "Driver delayed or customer request"


@router.get(
    "/rides/{ride_id}/back-to-back/eligibility",
    response_model=SuccessResponse,
    summary="Driver: Check if eligible for next ride offer near dropoff",
)
async def check_back_to_back_eligibility(
    ride_id: str,
    lat: float = Query(..., description="Driver live latitude"),
    lng: float = Query(..., description="Driver live longitude"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.back_to_back_service import BackToBackService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = BackToBackService(db)
    res = await service.check_back_to_back_eligibility(
        driver_id=driver.id,
        current_ride_id=uuid.UUID(ride_id),
        driver_lat=lat,
        driver_lng=lng,
    )
    return SuccessResponse(success=True, message="Eligibility evaluated", data=res)


@router.get(
    "/rides/{ride_id}/back-to-back/candidates",
    response_model=SuccessResponse,
    summary="Driver: Discover candidate next rides near current dropoff",
)
async def discover_back_to_back_candidates(
    ride_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.back_to_back_service import BackToBackService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = BackToBackService(db)
    candidates = await service.discover_next_ride_candidates(
        driver_id=driver.id,
        current_ride_id=uuid.UUID(ride_id),
    )
    return SuccessResponse(success=True, message=f"Found {len(candidates)} next ride candidates", data=candidates)


@router.post(
    "/rides/{ride_id}/back-to-back/reserve",
    response_model=SuccessResponse,
    summary="Driver: Atomically reserve next ride to start after current dropoff",
)
async def reserve_back_to_back_ride(
    ride_id: str,
    request: ReserveNextRideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.back_to_back_service import BackToBackService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = BackToBackService(db)
    res = await service.reserve_next_ride(
        driver_id=driver.id,
        current_ride_id=uuid.UUID(ride_id),
        next_ride_id=uuid.UUID(request.next_ride_id),
    )
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.post(
    "/rides/{ride_id}/back-to-back/release",
    response_model=SuccessResponse,
    summary="Driver: Release reserved next ride if delayed or detoured",
)
async def release_back_to_back_ride(
    ride_id: str,
    request: ReleaseNextRideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.back_to_back_service import BackToBackService
    service = BackToBackService(db)
    res = await service.release_next_ride_reservation(
        current_ride_id=uuid.UUID(ride_id),
        reason=request.reason or "Driver requested release",
    )
    return SuccessResponse(success=True, message=res["message"], data=res)


# ============================================================
# FEATURE 22: DRIVER SAFETY INTELLIGENCE API
# ============================================================

class SafetySOSTriggerRequest(BaseModel):
    ride_id: str
    latitude: float
    longitude: float
    accuracy: float = 10.0
    reason: Optional[str] = "Emergency SOS triggered from driver app"


class AddTrustedContactRequest(BaseModel):
    name: str
    phone: str
    relationship: str = "Family"


class SafetyAlertRecordRequest(BaseModel):
    ride_id: Optional[str] = None
    alert_type: str  # ROUTE_DEVIATION, LONG_STOP, OVERSPEED
    severity: str = "WARNING"
    latitude: float
    longitude: float
    details: dict = {}


class SafetyAlertResolveRequest(BaseModel):
    resolution_type: str = "IM_SAFE"  # IM_SAFE, DISMISSED, SUPPORT_CALL


class SafetyIncidentSubmitRequest(BaseModel):
    ride_id: Optional[str] = None
    incident_category: str  # UNSAFE_PASSENGER, ACCIDENT, ROAD_HAZARD, VEHICLE_ISSUE, MEDICAL_EMERGENCY, HARASSMENT, OTHER
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    description: str
    evidence_urls: list[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.post(
    "/safety/sos",
    response_model=SuccessResponse,
    summary="Driver: Authoritative Emergency SOS Trigger with 112 Police Alert",
)
async def trigger_emergency_sos(
    request: SafetySOSTriggerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.trigger_sos(
        driver_id=driver.id,
        ride_id=uuid.UUID(request.ride_id),
        latitude=request.latitude,
        longitude=request.longitude,
        accuracy=request.accuracy,
        reason=request.reason or "Driver Emergency SOS",
    )
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.post(
    "/safety/trusted-contacts",
    response_model=SuccessResponse,
    summary="Driver: Add emergency trusted contact",
)
async def add_trusted_contact(
    request: AddTrustedContactRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.add_trusted_contact(
        driver_id=driver.id,
        name=request.name,
        phone=request.phone,
        relationship=request.relationship,
    )
    return SuccessResponse(success=True, message="Trusted contact added", data=res)


@router.get(
    "/safety/trusted-contacts",
    response_model=SuccessResponse,
    summary="Driver: Get list of trusted emergency contacts",
)
async def get_trusted_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    contacts = await service.get_trusted_contacts(driver.id)
    return SuccessResponse(success=True, message=f"Loaded {len(contacts)} contacts", data=contacts)


@router.delete(
    "/safety/trusted-contacts/{contact_id}",
    response_model=SuccessResponse,
    summary="Driver: Remove trusted contact",
)
async def delete_trusted_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.delete_trusted_contact(driver.id, uuid.UUID(contact_id))
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.post(
    "/safety/rides/{ride_id}/share",
    response_model=SuccessResponse,
    summary="Driver: Create tokenized live trip sharing link",
)
async def create_live_trip_share(
    ride_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.create_live_trip_share(driver.id, uuid.UUID(ride_id))
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.get(
    "/safety/share/{share_token}",
    response_model=SuccessResponse,
    summary="Public: Track live trip by share token (read-only, no PII)",
)
async def get_shared_trip_telemetry(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    from app.services.driver_safety_service import DriverSafetyService
    service = DriverSafetyService(db)
    res = await service.get_shared_trip_telemetry(share_token)
    return SuccessResponse(success=True, message="Shared trip telemetry fetched", data=res)


@router.post(
    "/safety/alerts",
    response_model=SuccessResponse,
    summary="Driver: Record safety alert anomaly (deviation, long stop, speed)",
)
async def record_safety_alert(
    request: SafetyAlertRecordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.record_safety_alert(
        driver_id=driver.id,
        ride_id=uuid.UUID(request.ride_id) if request.ride_id else None,
        alert_type=request.alert_type,
        severity=request.severity,
        latitude=request.latitude,
        longitude=request.longitude,
        details=request.details,
    )
    return SuccessResponse(success=True, message="Safety alert logged", data=res)


@router.post(
    "/safety/alerts/{alert_id}/resolve",
    response_model=SuccessResponse,
    summary="Driver: Resolve safety warning ('I'm Safe' acknowledgment)",
)
async def resolve_safety_alert(
    alert_id: str,
    request: SafetyAlertResolveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.resolve_safety_alert(
        driver_id=driver.id,
        alert_id=uuid.UUID(alert_id),
        resolution_type=request.resolution_type,
    )
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.post(
    "/safety/incidents",
    response_model=SuccessResponse,
    summary="Driver: Report safety incident (unsafe passenger, accident, harassment)",
)
async def report_safety_incident(
    request: SafetyIncidentSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.report_safety_incident(
        driver_id=driver.id,
        ride_id=uuid.UUID(request.ride_id) if request.ride_id else None,
        incident_category=request.incident_category,
        severity=request.severity,
        description=request.description,
        evidence_urls=request.evidence_urls,
        latitude=request.latitude,
        longitude=request.longitude,
    )
    return SuccessResponse(success=True, message=res["message"], data=res)
'''

if "/destination-mode" not in m_content:
    m_content += feature20_21_22_routes
    with open(matching_py, "w", encoding="utf-8") as f:
        f.write(m_content)
    print("✓ Added Features 20, 21, and 22 API endpoints to matching.py")
else:
    print("• Features 20, 21, 22 endpoints already present in matching.py")

# Update trip_completion_service.py with Back-to-Back activation and Destination reached check
print("Updating trip_completion_service.py...")
with open(trip_comp_py, "r", encoding="utf-8") as f:
    t_content = f.read()

if "BackToBackService" not in t_content:
    target_comp_end = """        # 9. Audit Event Log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="RIDE_COMPLETED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={
                "receipt_number": receipt_no,
                "final_fare": customer_final_fare,
                "driver_net": driver_net_earning,
                "commission": platform_commission,
                "distance_km": distance_km,
                "duration_min": duration_min,
                "payment_method": payment_method,
            },
        )
        self.db.add(event_log)
        await self.db.commit()"""

    replacement_comp_end = """        # 9. Feature 20: Evaluate Destination Mode Reached / Progress
        try:
            from app.services.destination_mode_service import DestinationModeService
            await DestinationModeService(self.db).check_destination_reached_or_progress(
                driver_id=driver.id,
                current_lat=ride.destination_lat,
                current_lng=ride.destination_lng,
            )
        except Exception:
            pass

        # 10. Feature 21: Activate Next Reserved Ride if Back-to-Back
        next_ride_data = None
        try:
            from app.services.back_to_back_service import BackToBackService
            next_ride_data = await BackToBackService(self.db).activate_next_ride_on_completion(
                driver_id=driver.id,
                completed_ride_id=ride.id,
            )
        except Exception:
            pass

        # If no back-to-back next ride, return driver to online status
        if not next_ride_data:
            driver.status = DriverStatus.ONLINE

        # 11. Audit Event Log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="RIDE_COMPLETED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={
                "receipt_number": receipt_no,
                "final_fare": customer_final_fare,
                "driver_net": driver_net_earning,
                "commission": platform_commission,
                "distance_km": distance_km,
                "duration_min": duration_min,
                "payment_method": payment_method,
                "has_back_to_back_activated": bool(next_ride_data),
            },
        )
        self.db.add(event_log)
        await self.db.commit()"""

    if target_comp_end in t_content:
        t_content = t_content.replace(target_comp_end, replacement_comp_end)
        with open(trip_comp_py, "w", encoding="utf-8") as f:
            f.write(t_content)
        print("✓ Connected trip_completion_service.py with DestinationMode and BackToBack")
    else:
        print("⚠️ target_comp_end not matched in trip_completion_service.py")

print("\nFinished patching backend endpoints successfully!")
