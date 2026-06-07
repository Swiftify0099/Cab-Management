"""
Auth service Pydantic schemas.
"""
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re

from common.models.all_models import UserRole


class OTPSendRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15, description="Mobile number with country code")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip().replace(" ", "").replace("-", "")
        if not re.match(r"^\+?[0-9]{10,15}$", v):
            raise ValueError("Invalid phone number format")
        return v


class OTPSendResponse(BaseModel):
    phone: str
    expires_in_minutes: int
    dev_otp: Optional[str] = None  # Only in dev mode
    is_existing: Optional[bool] = False
    tokens: Optional['TokenResponse'] = None


class OTPVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    otp_code: str = Field(..., min_length=4, max_length=8)
    role: Optional[UserRole] = UserRole.CUSTOMER
    device_id: Optional[str] = None
    device_name: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return v.strip().replace(" ", "").replace("-", "")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    is_new_user: bool
    profile_complete: bool


class RefreshTokenRequest(BaseModel):
    refresh_token: str
    device_id: Optional[str] = None


class LogoutRequest(BaseModel):
    refresh_token: str
    access_token_jti: Optional[str] = None


class AdminLoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
    totp_code: Optional[str] = None  # For 2FA


class AdminChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v
