"""
Customer Security API Routers — Feature 26: Customer Security Architecture.
Exposes endpoints for Security Dashboard, Device Trust,
Security Activity Stream, Step-up Challenge, Lock Recovery & Dev Mode Simulator.
"""
import uuid
from typing import List, Optional
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status, Header
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_user
from common.schemas.response import APIResponse, MessageResponse
from app.schemas.security import (
    DeviceRegisterRequest,
    DeviceResponse,
    DeviceTrustUpdateRequest,
    SecurityDashboardResponse,
    SecurityEventResponse,
    StepUpChallengeRequest,
    StepUpChallengeResponse,
    AccountRecoveryRequest,
    AccountRecoveryResponse,
    DevSecuritySimulationRequest,
    DevSecuritySimulationResponse,
)
from app.services.customer_security_service import CustomerSecurityService

logger = structlog.get_logger(__name__)
router = APIRouter()


# ============================================================
# 1. SECURITY DASHBOARD & METRICS
# ============================================================

@router.get(
    "/dashboard",
    response_model=APIResponse[SecurityDashboardResponse],
    summary="Get customer security health score, trusted devices & alerts",
)
async def get_security_dashboard(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
):
    """
    Returns high-level security shield status (SECURE/ATTENTION/CRITICAL),
    security score (0-100), active device counts, and recent security alerts.
    """
    dash = await CustomerSecurityService.get_security_dashboard(
        db=db,
        user=current_user._user,
        current_device_id=x_device_id or current_user.device_id,
    )
    return APIResponse(message="Security dashboard fetched", data=dash)


# ============================================================
# 2. DEVICE TRUST MANAGEMENT
# ============================================================

@router.get(
    "/devices",
    response_model=APIResponse[List[DeviceResponse]],
    summary="List all active & registered hardware devices",
)
async def list_customer_devices(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
):
    """
    Returns all registered customer devices with hardware model,
    OS, trust status, risk score, and current active badge.
    """
    devices = await CustomerSecurityService.list_devices(
        db=db,
        user_id=current_user.id,
        current_device_id=x_device_id or current_user.device_id,
    )
    return APIResponse(message="Devices fetched", data=devices)


@router.post(
    "/devices/register",
    response_model=APIResponse[DeviceResponse],
    summary="Register or update customer hardware device",
)
async def register_device(
    payload: DeviceRegisterRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a new mobile device or updates heartbeat on existing hardware.
    """
    client_ip = request.client.host if request.client else None
    dev = await CustomerSecurityService.register_or_update_device(
        db=db,
        user_id=current_user.id,
        data=payload,
        ip_address=client_ip,
    )
    resp = DeviceResponse(
        id=dev.id,
        device_id=dev.device_id,
        platform=dev.platform,
        device_model=dev.device_model,
        os_version=dev.os_version,
        app_version=dev.app_version,
        trust_status=dev.trust_status,
        risk_score=dev.risk_score,
        last_active_at=dev.last_active_at,
        is_biometric_enabled=dev.is_biometric_enabled,
        is_current_device=True,
    )
    return APIResponse(message="Device registered successfully", data=resp)


@router.delete(
    "/devices/{device_id}",
    response_model=MessageResponse,
    summary="Revoke trust and disconnect a remote device",
)
async def revoke_device(
    device_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes device trust and invalidates all session tokens associated with it.
    """
    await CustomerSecurityService.revoke_device(
        db=db,
        user_id=current_user.id,
        device_id=device_id,
    )
    return MessageResponse(message="Device trust revoked and sessions disconnected")


# ============================================================
# 3. SECURITY & LOGIN ACTIVITY AUDIT STREAM
# ============================================================

@router.get(
    "/activity",
    response_model=APIResponse[List[SecurityEventResponse]],
    summary="Get customer security & login activity audit log",
)
async def get_security_activity(
    limit: int = 30,
    event_type: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches the chronological stream of logins, verification challenges,
    and security events with privacy-safe geolocation tags.
    """
    events = await CustomerSecurityService.list_security_events(
        db=db,
        user_id=current_user.id,
        limit=limit,
        event_type=event_type,
    )
    return APIResponse(message="Security activity log fetched", data=events)


# ============================================================
# 4. STEP-UP VERIFICATION CHALLENGE
# ============================================================

@router.post(
    "/challenge/verify",
    response_model=APIResponse[StepUpChallengeResponse],
    summary="Verify step-up challenge (new device / sensitive action)",
)
async def verify_step_up_challenge(
    payload: StepUpChallengeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies step-up challenge OTP or biometric approval to promote
    device to TRUSTED status.
    """
    res = await CustomerSecurityService.verify_step_up_challenge(
        db=db,
        user_id=current_user.id,
        challenge_type=payload.challenge_type,
        otp_code=payload.otp_code,
        device_id=payload.device_id or current_user.device_id,
        action_context=payload.action_context,
    )
    return APIResponse(message="Challenge verified", data=res)


# ============================================================
# 5. ACCOUNT LOCK RECOVERY
# ============================================================

@router.post(
    "/lock-recovery",
    response_model=APIResponse[AccountRecoveryResponse],
    summary="Recover and restore access to a protected/locked account",
)
async def recover_locked_account(
    payload: AccountRecoveryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public recovery endpoint for locked customers. Restores active status
    upon multi-factor phone OTP validation.
    """
    res = await CustomerSecurityService.recover_locked_account(
        db=db,
        phone=payload.phone,
        otp_code=payload.otp_code,
        emergency_contact_phone=payload.emergency_contact_phone,
    )
    return APIResponse(message="Account successfully recovered", data=res)


# ============================================================
# 6. DEVELOPER MODE SECURITY SIMULATION (__DEV__)
# ============================================================

@router.post(
    "/dev/simulate",
    response_model=APIResponse[DevSecuritySimulationResponse],
    summary="Developer Mode: Simulate security threat and anomaly scenarios",
)
async def simulate_security_scenario(
    payload: DevSecuritySimulationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Simulates security scenarios (NEW_DEVICE, VELOCITY_ANOMALY, ACCOUNT_LOCK,
    PROMO_FARMING, FAKE_BOOKING, COLLUSION_FLAG, IDOR_PROBE) for verification.
    """
    res = await CustomerSecurityService.simulate_security_scenario(
        db=db,
        user_id=current_user.id,
        scenario=payload.scenario,
        custom_risk_score=payload.custom_risk_score,
        details=payload.details,
    )
    return APIResponse(message="Security scenario simulated", data=res)
