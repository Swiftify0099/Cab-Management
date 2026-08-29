"""
Driver Availability & Telematics API Router
════════════════════════════════════════════════════════════════════════════════
Endpoints:
- POST /api/v1/driver/availability/go-online: 7-step pre-flight checklist & go online
- POST /api/v1/driver/availability/go-offline: Go offline with reason
- POST /api/v1/driver/availability/status: State machine transitions (ONLINE/BUSY/PAUSED/OFFLINE)
- POST /api/v1/driver/telematics/ping: Real-time native GPS telemetry packet processing
- GET /api/v1/driver/availability/status: Current status, telematics freshness, vehicle info
"""
from __future__ import annotations

import uuid
from typing import Dict, Any, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_active_driver
from common.models.all_models import Driver
from common.schemas.response import APIResponse
from app.services.telematics_service import (
    TelematicsService,
    GoOnlineRequest,
    GoOfflineRequest,
    ChangeDriverStatusRequest,
    TelemetryPingRequest,
    DriverAvailabilityStatusResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


async def _resolve_driver(current_user: AuthenticatedUser, db: AsyncSession) -> Driver:
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    return driver


@router.post(
    "/availability/go-online",
    response_model=APIResponse[DriverAvailabilityStatusResponse],
    summary="Partner Go-Online: 7-Step Pre-Flight Validation & Telematics Activation",
)
async def driver_go_online(
    payload: GoOnlineRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes full 7-step pre-flight checklist:
    1. Account validation (active, not restricted/suspended, fatigue < 0.95)
    2. KYC validation (approved & verified)
    3. Vehicle validation (active vehicle assigned & approved)
    4. Documents compliance (Insurance, PUC, Fitness, Permit not expired)
    5. Service catalog approval (at least 1 service eligible)
    6. Location permission & accuracy (<= 50m)
    7. GPS freshness (fix <= 30s old)
    """
    driver = await _resolve_driver(current_user, db)
    svc = TelematicsService(db)
    res = await svc.go_online(driver.id, payload)
    return APIResponse(message="Partner is now ONLINE and ready to receive ride dispatches", data=res)


@router.post(
    "/availability/go-offline",
    response_model=APIResponse[DriverAvailabilityStatusResponse],
    summary="Partner Go-Offline: Deactivate Availability & Log Reason",
)
async def driver_go_offline(
    payload: GoOfflineRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Transitions Partner to OFFLINE state and removes live dispatch eligibility."""
    driver = await _resolve_driver(current_user, db)
    svc = TelematicsService(db)
    res = await svc.go_offline(driver.id, payload)
    return APIResponse(message="Partner is now OFFLINE", data=res)


@router.post(
    "/availability/status",
    response_model=APIResponse[DriverAvailabilityStatusResponse],
    summary="Update Availability State: ONLINE, BUSY, ON_TRIP, PAUSED, OFFLINE",
)
async def update_driver_status(
    payload: ChangeDriverStatusRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Transitions partner across state machine states."""
    driver = await _resolve_driver(current_user, db)
    svc = TelematicsService(db)
    res = await svc.transition_status(driver.id, payload.target_status, payload.reason)
    return APIResponse(message=f"Driver status updated to {payload.target_status}", data=res)


@router.get(
    "/availability/status",
    response_model=APIResponse[DriverAvailabilityStatusResponse],
    summary="Get Current Partner Availability, Telematics Freshness, and Fleet Status",
)
async def get_driver_availability(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Returns real-time status, GPS freshness, stale detection, and active vehicle info."""
    driver = await _resolve_driver(current_user, db)
    svc = TelematicsService(db)
    res = await svc.get_availability_status(driver.id)
    return APIResponse(message="Driver availability status fetched", data=res)


@router.post(
    "/telematics/ping",
    response_model=APIResponse[dict],
    summary="High-Frequency GPS & Telematics Ping (Native React Native Tracker)",
)
async def record_telematics_ping(
    payload: TelemetryPingRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Receives high-frequency GPS telematics packets from React Native driver app:
    - Real latitude, longitude, accuracy_m, heading, speed_kmh, timestamp
    - Battery percentage, charging status, app state (foreground/background/locked)
    - Updates PostGIS current_location and logs to immutable history
    """
    driver = await _resolve_driver(current_user, db)
    svc = TelematicsService(db)
    res = await svc.record_telemetry_ping(driver.id, payload)
    return APIResponse(message="Telematics ping recorded successfully", data=res)
