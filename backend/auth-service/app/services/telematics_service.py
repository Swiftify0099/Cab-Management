"""
Authoritative Driver Availability & Telematics Service
════════════════════════════════════════════════════════════════════════════════
Manages:
- 7-Step Go-Online Pre-Flight Checklist
- Availability State Machine: OFFLINE, ONLINE, BUSY, ON_TRIP, PAUSED, SUSPENDED
- Real GPS Telemetry Processing with PostGIS Point geometry & Accuracy checks
- Stale-Location Protection & Auto-Pausing
- Immutable Telemetry History Logging
"""
from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple

import structlog
from fastapi import HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.utils.redis_client import get_redis
from common.models.all_models import (
    Driver,
    DriverDocument,
    DriverPreference,
    DriverStatus,
    DriverTelematicsHistory,
    KYCStatus,
    Vehicle,
)
from common.models.service_catalog import (
    ServiceCatalogType,
    ServiceEligibilityEngine,
    SERVICE_CATALOG_REGISTRY,
)

logger = structlog.get_logger(__name__)

GPS_ACCURACY_THRESHOLD_METERS = 50.0  # Reject inaccurate GPS (> 50m)
GPS_FRESHNESS_GO_ONLINE_SECONDS = 30.0  # Go-online requires GPS ping <= 30s old
LIVE_DISPATCH_STALE_THRESHOLD_SECONDS = 60.0  # Exclude from dispatch if GPS > 60s old
AUTO_PAUSE_STALE_MINUTES = 10.0  # Auto-pause if no GPS for > 10m


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Request & Response Schemas
# ──────────────────────────────────────────────────────────────────────────────
class TelemetryPingRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
    accuracy_m: float = Field(10.0, ge=0.0, le=500.0, description="GPS accuracy radius in meters")
    heading: float = Field(0.0, ge=0.0, le=360.0, description="Bearing angle in degrees")
    speed_kmh: float = Field(0.0, ge=0.0, le=250.0, description="Current vehicle speed in km/h")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="UTC timestamp of GPS fix")
    battery_pct: Optional[int] = Field(None, ge=0, le=100)
    is_charging: bool = Field(False)
    app_state: str = Field("foreground", description="foreground, background, screen_locked")
    network_status: str = Field("online", description="online, reconnecting, restored")


class GoOnlineRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    accuracy_m: float = Field(10.0, ge=0.0, le=500.0)
    heading: float = Field(0.0, ge=0.0, le=360.0)
    speed_kmh: float = Field(0.0, ge=0.0, le=250.0)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    battery_pct: Optional[int] = Field(None, ge=0, le=100)
    is_charging: bool = Field(False)
    app_state: str = Field("foreground")


class GoOfflineRequest(BaseModel):
    reason: Optional[str] = Field("manual_toggle", description="Reason driver is going offline")


class ChangeDriverStatusRequest(BaseModel):
    target_status: str = Field(..., description="OFFLINE, ONLINE, BUSY, ON_TRIP, PAUSED, SUSPENDED")
    reason: Optional[str] = None


class DriverAvailabilityStatusResponse(BaseModel):
    driver_id: uuid.UUID
    status: str
    is_online: bool
    is_stale: bool
    last_location_updated_at: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_m: Optional[float] = None
    active_vehicle_id: Optional[uuid.UUID] = None
    active_vehicle_reg: Optional[str] = None
    active_vehicle_type: Optional[str] = None
    eligible_services: List[str] = []
    offline_reason: Optional[str] = None


class PreFlightCheckResult(BaseModel):
    passed: bool
    step_results: Dict[str, bool]
    failure_reasons: List[str]


# ──────────────────────────────────────────────────────────────────────────────
# PRE-FLIGHT VALIDATION & GO-ONLINE CHECKLIST
# ──────────────────────────────────────────────────────────────────────────────
async def perform_go_online_preflight_check(
    session: AsyncSession,
    driver: Driver,
    location_payload: GoOnlineRequest,
) -> PreFlightCheckResult:
    """
    Executes the 7-step pre-flight validation checklist when Partner presses GO ONLINE:
    1. Account validation (active, not suspended, fatigue < 0.95)
    2. KYC validation (approved & verified)
    3. Vehicle validation (active vehicle assigned & approved)
    4. Document compliance (Insurance, PUC, Fitness, Permit unexpired)
    5. Service catalog approval (at least 1 service eligible)
    6. Location permission & accuracy (<= 50m)
    7. GPS freshness (fix <= 30s old)
    """
    step_results: Dict[str, bool] = {
        "account_active": False,
        "kyc_approved": False,
        "vehicle_active_and_approved": False,
        "documents_unexpired": False,
        "service_eligible": False,
        "location_accuracy_valid": False,
        "gps_freshness_valid": False,
    }
    failure_reasons: List[str] = []
    today = date.today()
    now_utc = datetime.now(timezone.utc)

    # Step 1: Account Validation
    if not driver.is_active:
        failure_reasons.append("Account is deactivated.")
    elif driver.status == DriverStatus.SUSPENDED:
        failure_reasons.append(f"Account is suspended until {driver.suspension_until or 'indefinitely'}.")
    elif getattr(driver, "restriction_status", "NORMAL") in ["RESTRICTED", "TEMPORARILY_SUSPENDED"]:
        failure_reasons.append(f"Account is under restriction: {driver.restriction_status}.")
    elif (driver.fatigue_score or 0.0) >= 0.95:
        failure_reasons.append("Fatigue limit reached; mandatory rest period required before going online.")
    else:
        step_results["account_active"] = True

    # Step 2: KYC Validation
    is_kyc_approved = (driver.kyc_status == KYCStatus.APPROVED or driver.is_verified)
    if is_kyc_approved:
        step_results["kyc_approved"] = True
    else:
        failure_reasons.append(f"Partner KYC is not approved (current status: {driver.kyc_status.value if hasattr(driver.kyc_status, 'value') else driver.kyc_status}).")

    # Step 3: Active Vehicle Validation
    veh_res = await session.execute(
        select(Vehicle).where(Vehicle.driver_id == driver.id, Vehicle.is_active == True)
    )
    active_veh = veh_res.scalar_one_or_none()

    if not active_veh:
        failure_reasons.append("No active operational vehicle found. Please add or activate a vehicle first.")
    elif active_veh.status != "APPROVED":
        failure_reasons.append(f"Active vehicle '{active_veh.registration_number}' is not approved (status: {active_veh.status}).")
    else:
        step_results["vehicle_active_and_approved"] = True

    # Step 4: Documents Expiry Check
    if active_veh:
        doc_failures: List[str] = []
        if active_veh.insurance_expiry and active_veh.insurance_expiry < today:
            doc_failures.append(f"Vehicle insurance expired on {active_veh.insurance_expiry}")
        if active_veh.pollution_expiry and active_veh.pollution_expiry < today:
            doc_failures.append(f"PUC certificate expired on {active_veh.pollution_expiry}")
        if active_veh.fitness_expiry and active_veh.fitness_expiry < today:
            doc_failures.append(f"Fitness certificate expired on {active_veh.fitness_expiry}")
        if active_veh.permit_expiry and active_veh.permit_expiry < today:
            doc_failures.append(f"Commercial permit expired on {active_veh.permit_expiry}")

        if doc_failures:
            failure_reasons.extend(doc_failures)
        else:
            step_results["documents_unexpired"] = True

    # Step 5: Service Eligibility Check
    if active_veh and step_results["account_active"] and step_results["kyc_approved"]:
        pref_res = await session.execute(
            select(DriverPreference).where(DriverPreference.driver_id == driver.id)
        )
        pref = pref_res.scalar_one_or_none()

        report = ServiceEligibilityEngine.build_full_driver_eligibility_report(
            driver=driver,
            active_vehicle=active_veh,
            driver_pref=pref,
        )
        if len(report.eligible_services) > 0:
            step_results["service_eligible"] = True
        else:
            failure_reasons.append("No eligible platform services found for this vehicle and driver preferences.")

    # Step 6: Location Accuracy Check (Native GPS validation)
    if location_payload.accuracy_m > GPS_ACCURACY_THRESHOLD_METERS:
        failure_reasons.append(f"GPS accuracy is too low ({location_payload.accuracy_m:.1f}m > {GPS_ACCURACY_THRESHOLD_METERS}m limit). Please enable High Accuracy GPS.")
    elif not (-90.0 <= location_payload.latitude <= 90.0 and -180.0 <= location_payload.longitude <= 180.0):
        failure_reasons.append("Invalid geographical coordinates.")
    else:
        step_results["location_accuracy_valid"] = True

    # Step 7: GPS Freshness Check
    payload_ts = location_payload.timestamp
    if payload_ts.tzinfo is None:
        payload_ts = payload_ts.replace(tzinfo=timezone.utc)

    age_seconds = (now_utc - payload_ts).total_seconds()
    if age_seconds > GPS_FRESHNESS_GO_ONLINE_SECONDS:
        failure_reasons.append(f"Location telemetry fix is stale ({age_seconds:.1f}s old > {GPS_FRESHNESS_GO_ONLINE_SECONDS}s limit). Please acquire fresh GPS fix.")
    elif age_seconds < -60.0:
        failure_reasons.append("Telemetry timestamp is in the future. Please verify device clock.")
    else:
        step_results["gps_freshness_valid"] = True

    all_passed = all(step_results.values())
    return PreFlightCheckResult(
        passed=all_passed,
        step_results=step_results,
        failure_reasons=failure_reasons,
    )


# ──────────────────────────────────────────────────────────────────────────────
# CORE TELEMATICS SERVICE IMPLEMENTATION
# ──────────────────────────────────────────────────────────────────────────────
class TelematicsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def go_online(
        self,
        driver_id: uuid.UUID,
        payload: GoOnlineRequest,
    ) -> DriverAvailabilityStatusResponse:
        """
        Validates 7 pre-flight steps and transitions Partner to ONLINE.
        Updates PostGIS current_location, telematics columns, and emits Redis event.
        """
        driver_res = await self.db.execute(select(Driver).where(Driver.id == driver_id))
        driver = driver_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # Run 7-Step Pre-flight checklist
        check = await perform_go_online_preflight_check(self.db, driver, payload)
        if not check.passed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Go-Online Pre-Flight Validation Failed",
                    "failure_reasons": check.failure_reasons,
                    "step_results": check.step_results,
                },
            )

        now = datetime.now(timezone.utc)
        wkt = f"SRID=4326;POINT({payload.longitude} {payload.latitude})"

        # Update Driver in Database
        driver.status = DriverStatus.ONLINE
        driver._is_online = True
        driver.current_location = wkt
        driver.current_latitude = payload.latitude
        driver.current_longitude = payload.longitude
        driver.current_accuracy_m = payload.accuracy_m
        driver.current_heading = payload.heading
        driver.current_speed_kmh = payload.speed_kmh
        driver.last_location_updated_at = now
        driver.last_online_at = now
        driver.offline_reason = None
        driver.telematics_battery_pct = payload.battery_pct
        driver.telematics_is_charging = payload.is_charging
        driver.telematics_app_state = payload.app_state

        # Log to Immutable Telemetry History
        history_entry = DriverTelematicsHistory(
            driver_id=driver.id,
            location=wkt,
            latitude=payload.latitude,
            longitude=payload.longitude,
            accuracy_m=payload.accuracy_m,
            heading=payload.heading,
            speed_kmh=payload.speed_kmh,
            battery_pct=payload.battery_pct,
            is_charging=payload.is_charging,
            app_state=payload.app_state,
            network_status="online",
            recorded_at=now,
        )
        self.db.add(history_entry)
        await self.db.commit()

        # Update Redis Cache
        try:
            r = await get_redis()
            loc_data = {
                "driver_id": str(driver.id),
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "accuracy_m": payload.accuracy_m,
                "heading": payload.heading,
                "speed_kmh": payload.speed_kmh,
                "status": "ONLINE",
                "updated_at": now.isoformat(),
            }
            await r.setex(f"driver:location:{driver.id}", int(LIVE_DISPATCH_STALE_THRESHOLD_SECONDS), json.dumps(loc_data))
            await r.publish("driver:status_changed", json.dumps({"driver_id": str(driver.id), "status": "ONLINE"}))
        except Exception as e:
            logger.warning("redis_cache_write_failed", error=str(e))

        logger.info("driver_online_success", driver_id=str(driver.id), lat=payload.latitude, lng=payload.longitude)

        return await self.get_availability_status(driver.id)

    async def go_offline(
        self,
        driver_id: uuid.UUID,
        payload: GoOfflineRequest,
    ) -> DriverAvailabilityStatusResponse:
        """Transitions driver to OFFLINE state with reason logging."""
        driver_res = await self.db.execute(select(Driver).where(Driver.id == driver_id))
        driver = driver_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        now = datetime.now(timezone.utc)
        driver.status = DriverStatus.OFFLINE
        driver._is_online = False
        driver.last_offline_at = now
        driver.offline_reason = payload.reason or "manual_toggle"

        await self.db.commit()

        # Clear Redis live cache
        try:
            r = await get_redis()
            await r.delete(f"driver:location:{driver.id}")
            await r.publish("driver:status_changed", json.dumps({"driver_id": str(driver.id), "status": "OFFLINE", "reason": payload.reason}))
        except Exception as e:
            logger.warning("redis_cache_delete_failed", error=str(e))

        logger.info("driver_offline_success", driver_id=str(driver.id), reason=payload.reason)
        return await self.get_availability_status(driver.id)

    async def transition_status(
        self,
        driver_id: uuid.UUID,
        target_status_str: str,
        reason: Optional[str] = None,
    ) -> DriverAvailabilityStatusResponse:
        """
        Transitions driver between state machine states:
        OFFLINE, ONLINE, BUSY, ON_TRIP, PAUSED, SUSPENDED.
        """
        driver_res = await self.db.execute(select(Driver).where(Driver.id == driver_id))
        driver = driver_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        target_upper = target_status_str.strip().upper()
        now = datetime.now(timezone.utc)

        status_mapping = {
            "OFFLINE": DriverStatus.OFFLINE,
            "ONLINE": DriverStatus.ONLINE,
            "BUSY": DriverStatus.BUSY,
            "ON_TRIP": DriverStatus.ON_TRIP,
            "PAUSED": DriverStatus.PAUSED,
            "SUSPENDED": DriverStatus.SUSPENDED,
        }

        if target_upper not in status_mapping:
            raise HTTPException(status_code=400, detail=f"Invalid target status '{target_status_str}'. Allowed: {list(status_mapping.keys())}")

        new_status = status_mapping[target_upper]

        driver.status = new_status
        driver._is_online = (new_status in (DriverStatus.ONLINE, DriverStatus.BUSY, DriverStatus.ON_TRIP))

        if new_status == DriverStatus.OFFLINE:
            driver.last_offline_at = now
            driver.offline_reason = reason or "state_transition"
        elif new_status == DriverStatus.PAUSED:
            driver.offline_reason = reason or "driver_paused"

        await self.db.commit()

        try:
            r = await get_redis()
            await r.publish("driver:status_changed", json.dumps({"driver_id": str(driver.id), "status": target_upper, "reason": reason}))
        except Exception as e:
            logger.warning("redis_publish_failed", error=str(e))

        logger.info("driver_status_transitioned", driver_id=str(driver.id), new_status=target_upper)
        return await self.get_availability_status(driver.id)

    async def record_telemetry_ping(
        self,
        driver_id: uuid.UUID,
        payload: TelemetryPingRequest,
    ) -> dict:
        """
        High-frequency GPS ping processor.
        Updates PostGIS point, telematics metadata, and logs to history.
        """
        driver_res = await self.db.execute(select(Driver).where(Driver.id == driver_id))
        driver = driver_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        now = datetime.now(timezone.utc)
        wkt = f"SRID=4326;POINT({payload.longitude} {payload.latitude})"

        driver.current_location = wkt
        driver.current_latitude = payload.latitude
        driver.current_longitude = payload.longitude
        driver.current_accuracy_m = payload.accuracy_m
        driver.current_heading = payload.heading
        driver.current_speed_kmh = payload.speed_kmh
        driver.last_location_updated_at = now
        if payload.battery_pct is not None:
            driver.telematics_battery_pct = payload.battery_pct
        driver.telematics_is_charging = payload.is_charging
        driver.telematics_app_state = payload.app_state

        # History log
        history_entry = DriverTelematicsHistory(
            driver_id=driver.id,
            location=wkt,
            latitude=payload.latitude,
            longitude=payload.longitude,
            accuracy_m=payload.accuracy_m,
            heading=payload.heading,
            speed_kmh=payload.speed_kmh,
            battery_pct=payload.battery_pct,
            is_charging=payload.is_charging,
            app_state=payload.app_state,
            network_status=payload.network_status,
            recorded_at=now,
        )
        self.db.add(history_entry)
        await self.db.commit()

        # Redis Cache
        try:
            r = await get_redis()
            loc_data = {
                "driver_id": str(driver.id),
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "accuracy_m": payload.accuracy_m,
                "heading": payload.heading,
                "speed_kmh": payload.speed_kmh,
                "status": driver.status.value if hasattr(driver.status, "value") else str(driver.status),
                "updated_at": now.isoformat(),
            }
            await r.setex(f"driver:location:{driver.id}", int(LIVE_DISPATCH_STALE_THRESHOLD_SECONDS), json.dumps(loc_data))
        except Exception as e:
            logger.warning("redis_telemetry_cache_failed", error=str(e))

        return {
            "driver_id": str(driver.id),
            "status": driver.status.value if hasattr(driver.status, "value") else str(driver.status),
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "accuracy_m": payload.accuracy_m,
            "recorded_at": now.isoformat(),
        }

    async def get_availability_status(self, driver_id: uuid.UUID) -> DriverAvailabilityStatusResponse:
        """Retrieves comprehensive availability, telematics freshness, and vehicle summary."""
        driver_res = await self.db.execute(select(Driver).where(Driver.id == driver_id))
        driver = driver_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        veh_res = await self.db.execute(
            select(Vehicle).where(Vehicle.driver_id == driver.id, Vehicle.is_active == True)
        )
        active_veh = veh_res.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        is_stale = True
        if driver.last_location_updated_at:
            last_ts = driver.last_location_updated_at
            if last_ts.tzinfo is None:
                last_ts = last_ts.replace(tzinfo=timezone.utc)
            age = (now - last_ts).total_seconds()
            is_stale = (age > LIVE_DISPATCH_STALE_THRESHOLD_SECONDS)

        # Get eligible services
        eligible_services: List[str] = []
        if active_veh:
            pref_res = await self.db.execute(
                select(DriverPreference).where(DriverPreference.driver_id == driver.id)
            )
            pref = pref_res.scalar_one_or_none()
            report = ServiceEligibilityEngine.build_full_driver_eligibility_report(
                driver=driver,
                active_vehicle=active_veh,
                driver_pref=pref,
            )
            eligible_services = [s.value for s in report.eligible_services]

        status_str = (driver.status.value if hasattr(driver.status, "value") else str(driver.status)).upper()

        return DriverAvailabilityStatusResponse(
            driver_id=driver.id,
            status=status_str,
            is_online=driver.is_online,
            is_stale=is_stale,
            last_location_updated_at=driver.last_location_updated_at,
            latitude=driver.current_latitude,
            longitude=driver.current_longitude,
            accuracy_m=driver.current_accuracy_m,
            active_vehicle_id=active_veh.id if active_veh else None,
            active_vehicle_reg=active_veh.registration_number if active_veh else None,
            active_vehicle_type=active_veh.vehicle_type.value if (active_veh and hasattr(active_veh.vehicle_type, "value")) else None,
            eligible_services=eligible_services,
            offline_reason=driver.offline_reason,
        )
