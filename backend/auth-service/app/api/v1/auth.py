"""
Auth API endpoints  OTP flow for customers/drivers.
Includes rate limiting and mock OTP (123456 in dev mode).
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import structlog
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import auth_settings
from app.schemas.auth import (
    OTPSendRequest,
    OTPSendResponse,
    OTPVerifyRequest,
    TokenResponse,
    RefreshTokenRequest,
    LogoutRequest,
)
from app.services.auth_service import (
    create_user_if_not_exists,
    issue_tokens,
    rotate_refresh_token,
    revoke_refresh_token,
)
from common.database import get_db
from common.models.all_models import OTPRecord, User, UserRole
from common.schemas.response import APIResponse, MessageResponse
from common.utils.redis_client import (
    delete_otp,
    get_otp,
    increment_otp_requests,
    store_otp,
    blacklist_token,
)
from common.utils.security import generate_otp

logger = structlog.get_logger(__name__)
router = APIRouter()


# ============================================================
# OTP SEND
# ============================================================

@router.post(
    "/otp/send",
    response_model=APIResponse[OTPSendResponse],
    summary="Send OTP to phone number",
)
async def send_otp(
    request: Request,
    payload: OTPSendRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Send OTP to the given phone number.
    - Rate limited to 5 requests per phone per hour.
    - In DEV mode, OTP is always 123456.
    - No real SMS gateway  stub for production integration.
    """
    phone = payload.phone.strip()

    # Rate limit: 5 OTP requests per phone per hour
    count = await increment_otp_requests(phone)
    if count > auth_settings.OTP_MAX_REQUESTS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many OTP requests. Try again after 1 hour.",
        )

    # Generate OTP (always 123456 in dev)
    otp_code = generate_otp(6)

    # Store in Redis with expiry
    await store_otp(
        phone=phone,
        otp=otp_code,
        expire_seconds=auth_settings.OTP_EXPIRE_MINUTES * 60,
    )

    # TODO: Production  integrate real SMS gateway here
    # await sms_gateway.send(phone, f"Your CabBooking OTP is {otp_code}")

    logger.info("OTP sent", phone=phone, dev_mode=auth_settings.OTP_DEV_MODE)

    response_data = OTPSendResponse(
        phone=phone,
        expires_in_minutes=auth_settings.OTP_EXPIRE_MINUTES,
        dev_otp=otp_code if auth_settings.OTP_DEV_MODE else None,
    )

    return APIResponse(
        message="OTP sent successfully",
        data=response_data,
    )


# ============================================================
# OTP VERIFY
# ============================================================

@router.post(
    "/otp/verify",
    response_model=APIResponse[TokenResponse],
    summary="Verify OTP and get JWT tokens",
)
async def verify_otp(
    payload: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify OTP and return JWT access + refresh tokens.
    Creates user account if first-time login.
    Sets is_profile_complete=False for new users (redirect to profile setup).
    """
    phone = payload.phone.strip()

    # Get stored OTP from Redis
    stored_otp = await get_otp(phone)
    if not stored_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or not found. Please request a new OTP.",
        )

    if stored_otp != payload.otp_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Please try again.",
        )

    # OTP verified  delete from Redis
    await delete_otp(phone)

    # Get or create user
    user, is_new = await create_user_if_not_exists(
        db=db,
        phone=phone,
        role=payload.role or UserRole.CUSTOMER,
    )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Contact support.",
        )

    # Issue JWT tokens
    access_token, refresh_token = await issue_tokens(
        db=db,
        user=user,
        device_id=payload.device_id,
        device_name=payload.device_name,
    )

    logger.info("OTP verified  user authenticated", user_id=str(user.id), is_new=is_new)

    return APIResponse(
        message="Login successful",
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_id=str(user.id),
            role=user.role.value,
            is_new_user=is_new,
            profile_complete=user.is_profile_complete,
        ),
    )


# ============================================================
# REFRESH TOKEN
# ============================================================

@router.post(
    "/token/refresh",
    response_model=APIResponse[TokenResponse],
    summary="Rotate refresh token and get new access token",
)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Rotate the refresh token and issue a new access token."""
    access_token, new_refresh_token, user = await rotate_refresh_token(
        db=db,
        refresh_token=payload.refresh_token,
        device_id=payload.device_id,
    )

    return APIResponse(
        message="Token refreshed",
        data=TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            user_id=str(user.id),
            role=user.role.value,
            is_new_user=False,
            profile_complete=user.is_profile_complete,
        ),
    )


# ============================================================
# LOGOUT
# ============================================================

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout and revoke tokens",
)
async def logout(
    payload: LogoutRequest,
    db: AsyncSession = Depends(get_db),
):
    """Revoke refresh token and blacklist access token."""
    await revoke_refresh_token(
        db=db,
        refresh_token=payload.refresh_token,
        access_token_jti=payload.access_token_jti,
    )
    return MessageResponse(message="Logged out successfully")
