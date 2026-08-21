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
    GoogleSignInRequest,
)
from app.services.auth_service import (
    create_user_if_not_exists,
    issue_tokens,
    rotate_refresh_token,
    revoke_refresh_token,
    create_or_get_google_user,
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
from common.middleware.auth import AuthenticatedUser, get_current_user
from pydantic import BaseModel

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

    # Check if user already exists
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        # Existing active user → Bypass OTP and auto-verify.
        # Honour the requested role: if the user is logging in via the driver
        # app (role=driver) but was originally created as a customer, upgrade
        # the role in DB before issuing the token.  Never allow upgrading to
        # admin via this path.
        requested_role = payload.role or UserRole.CUSTOMER
        if requested_role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            if user.role != requested_role and user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
                user.role = requested_role
                await db.flush()
                logger.info("User role updated on auto-verify", user_id=str(user.id), new_role=requested_role.value)

        access_token, refresh_token = await issue_tokens(
            db=db,
            user=user,
            device_id=None,
            device_name=None,
        )
        logger.info("User auto-verified (OTP bypassed)", user_id=str(user.id), phone=phone)
        
        response_data = OTPSendResponse(
            phone=phone,
            expires_in_minutes=auth_settings.OTP_EXPIRE_MINUTES,
            dev_otp=None,
            is_existing=True,
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                user_id=str(user.id),
                role=user.role.value,
                is_new_user=False,
                profile_complete=user.is_profile_complete,
            )
        )
        return APIResponse(
            message="Auto-verified existing user",
            data=response_data,
        )

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

    # Real Dove SMS Gateway Integration
    try:
        import httpx
        import urllib.parse
        cleaned = "".join(filter(str.isdigit, phone))[-10:]
        sms_user = os.getenv("SMS_USERNAME", "Experts")
        sms_key = os.getenv("SMS_AUTH_KEY", "ba9dcdcdfcXX")
        sms_sender = os.getenv("SMS_SENDER_ID", "EXTSKL")
        sms_accusage = os.getenv("SMS_ACCUSAGE", "1")
        sms_template = os.getenv("SMS_TEMPLATE", "Your Verification Code for login is {otp}. - intracity cab booking")
        msg = sms_template.replace("{otp}", otp_code) if "{otp}" in sms_template else f"Your Verification Code for login is {otp_code}. - intracity cab booking"
        encoded_msg = urllib.parse.quote(msg)
        gateway_url = (
            f"https://mobicomm.dove-sms.com//submitsms.jsp?"
            f"user={urllib.parse.quote(sms_user)}"
            f"&key={urllib.parse.quote(sms_key)}"
            f"&mobile=+91{cleaned}"
            f"&message={encoded_msg}"
            f"&accusage={sms_accusage}"
            f"&senderid={urllib.parse.quote(sms_sender)}"
        )
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(gateway_url)
            logger.info("Dove SMS gateway sent from backend", status=resp.status_code, response=resp.text)
    except Exception as sms_err:
        logger.warning("Dove SMS dispatch error in backend", error=str(sms_err))


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

    # In DEV mode, allow "123456" as a universal OTP bypass
    if auth_settings.OTP_DEV_MODE and payload.otp_code == "123456":
        pass  # Bypass verification
    else:
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
# GOOGLE SIGN-IN
# ============================================================

import httpx

@router.post(
    "/google/verify",
    response_model=APIResponse[TokenResponse],
    summary="Verify Google ID Token and login/register",
)
async def google_verify(
    payload: GoogleSignInRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify Google id_token with Google tokeninfo endpoint.
    If valid, get or create the user and issue JWT.
    """
    # 1. Verify token with Google
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.id_token}"
            )
            if resp.status_code != 200:
                raise ValueError("Invalid id_token")
            token_info = resp.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token. Please try again."
        )

    # 2. Extract info
    email = token_info.get("email")
    sub = token_info.get("sub")
    if not sub:
        raise HTTPException(status_code=400, detail="Token missing subject ID")

    # 3. Create or get user
    user, is_new = await create_or_get_google_user(
        db=db,
        email=email,
        sub=sub,
        role=payload.role or UserRole.CUSTOMER,
    )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Contact support.",
        )

    # 4. Issue tokens
    access_token, refresh_token = await issue_tokens(
        db=db,
        user=user,
        device_id=payload.device_id,
        device_name=payload.device_name,
    )

    return APIResponse(
        message="Google Login successful",
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


# ============================================================
# DEVICE TOKEN (PUSH NOTIFICATIONS)
# ============================================================

class DeviceTokenRequest(BaseModel):
    token: str

@router.post(
    "/device-token",
    response_model=MessageResponse,
    summary="Register FCM Device Token",
)
async def register_device_token(
    payload: DeviceTokenRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save the FCM push token to the user's profile."""
    # Since we need to update the User object, we get it from DB
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.device_token = payload.token
    await db.commit()
    
    return MessageResponse(message="Device token registered successfully")
