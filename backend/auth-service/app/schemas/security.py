"""
Pydantic Schemas for Feature 26: Customer Security Architecture
Covers Device Trust, Security Dashboard, Activity Audit Stream,
Step-Up Challenges, Account Recovery, and Dev Mode Simulation.
"""
from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field


# ============================================================
# DEVICE TRUST & REGISTRATION SCHEMAS
# ============================================================

class DeviceRegisterRequest(BaseModel):
    device_id: str = Field(..., description="Unique hardware or app instance identifier")
    platform: str = Field("android", description="android, ios, web")
    device_model: Optional[str] = Field(None, description="e.g. Samsung Galaxy S23, iPhone 15 Pro")
    os_version: Optional[str] = Field(None, description="e.g. Android 14, iOS 17.4")
    app_version: Optional[str] = Field(None, description="e.g. 2.4.0")
    is_biometric_enabled: bool = Field(False, description="Whether device supports biometric unlocking")


class DeviceResponse(BaseModel):
    id: UUID
    device_id: str
    platform: str
    device_model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    trust_status: str  # NEW, PENDING_VERIFICATION, TRUSTED, RESTRICTED, REVOKED
    risk_score: float
    last_active_at: datetime
    is_biometric_enabled: bool
    is_current_device: bool = False

    class Config:
        from_attributes = True


class DeviceTrustUpdateRequest(BaseModel):
    trust_status: str = Field(..., description="TRUSTED, RESTRICTED, REVOKED")


# ============================================================
# SECURITY DASHBOARD & METRICS
# ============================================================

class SecurityAlertItem(BaseModel):
    id: UUID
    event_type: str
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    title: str
    description: str
    created_at: datetime


class SecurityDashboardResponse(BaseModel):
    shield_status: str  # SECURE, ATTENTION, CRITICAL
    security_score: int  # 0 to 100
    active_devices_count: int
    trusted_devices_count: int
    trusted_contacts_count: int
    is_two_factor_enabled: bool
    is_biometric_enabled: bool
    last_login_at: Optional[datetime] = None
    last_login_device: Optional[str] = None
    account_status: str  # ACTIVE, SECURITY_REVIEW, TEMPORARILY_LOCKED, SUSPENDED
    recent_alerts: List[SecurityAlertItem] = []


# ============================================================
# SECURITY EVENT AUDIT STREAM
# ============================================================

class SecurityEventResponse(BaseModel):
    id: UUID
    event_type: str
    risk_level: str
    location_city: Optional[str] = None
    ip_hash: Optional[str] = None
    details_json: Dict[str, Any] = {}
    action_taken: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# STEP-UP CHALLENGE & VERIFICATION
# ============================================================

class StepUpChallengeRequest(BaseModel):
    challenge_type: str = Field("OTP", description="OTP, PIN, BIOMETRIC")
    otp_code: Optional[str] = Field(None, description="6-digit verification code")
    device_id: Optional[str] = None
    action_context: str = Field("HIGH_RISK_ACTION", description="NEW_DEVICE, PAYMENT_AUTH, SETTINGS_CHANGE")


class StepUpChallengeResponse(BaseModel):
    verified: bool
    challenge_token: Optional[str] = None
    message: str
    device_trust_status: str = "TRUSTED"


# ============================================================
# ACCOUNT LOCK & RECOVERY
# ============================================================

class AccountRecoveryRequest(BaseModel):
    phone: str = Field(..., description="Registered account phone number")
    otp_code: str = Field(..., description="6-digit recovery OTP")
    emergency_contact_phone: Optional[str] = Field(None, description="Optional secondary verification via trusted emergency contact")


class AccountRecoveryResponse(BaseModel):
    success: bool
    message: str
    account_status: str
    restored_at: datetime


# ============================================================
# DEVELOPER MODE SECURITY SIMULATION
# ============================================================

class DevSecuritySimulationRequest(BaseModel):
    scenario: str = Field(
        ...,
        description="NEW_DEVICE, VELOCITY_ANOMALY, ACCOUNT_LOCK, PROMO_FARMING, FAKE_BOOKING, COLLUSION_FLAG, IDOR_PROBE"
    )
    custom_risk_score: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


class DevSecuritySimulationResponse(BaseModel):
    scenario: str
    simulated_risk_score: float
    evaluated_risk_level: str
    action_triggered: str
    message: str
    event_id: UUID
