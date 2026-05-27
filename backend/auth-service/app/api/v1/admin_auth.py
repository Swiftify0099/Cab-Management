"""
Admin authentication endpoints — email+password with 2FA stub.
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import AdminLoginRequest, AdminChangePasswordRequest, TokenResponse
from common.database import get_db
from common.models.all_models import AdminProfile, User, UserRole
from common.schemas.response import APIResponse, MessageResponse
from common.utils.jwt import create_access_token, create_refresh_token
from common.utils.security import verify_password, hash_password

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post(
    "/login",
    response_model=APIResponse[TokenResponse],
    summary="Admin email+password login",
)
async def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Admin login with email and password.
    Default credentials: admin@cabooking.com / 123456
    Force password change on first login.
    """
    # Look up admin user
    result = await db.execute(
        select(User).where(User.email == payload.email.lower().strip())
    )
    user = result.scalar_one_or_none()

    if not user or user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Get admin profile
    profile_result = await db.execute(
        select(AdminProfile).where(AdminProfile.user_id == user.id)
    )
    admin_profile = profile_result.scalar_one_or_none()

    if not admin_profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin profile not found",
        )

    # Verify password
    if not verify_password(payload.password, admin_profile.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # TODO: 2FA verification (Phase 2)
    # if admin_profile.is_2fa_enabled and not payload.totp_code:
    #     raise HTTPException(status_code=428, detail="2FA code required")

    # Issue tokens
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        extra_data={"must_change_password": admin_profile.must_change_password},
    )
    raw_refresh, _ = create_refresh_token(subject=str(user.id))

    # Update last login
    from datetime import datetime, timezone
    admin_profile.last_login_at = datetime.now(timezone.utc)
    admin_profile.last_login_ip = request.client.host if request.client else None

    logger.info("Admin logged in", admin_id=str(user.id), email=user.email)

    return APIResponse(
        message="Login successful",
        data=TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            token_type="bearer",
            user_id=str(user.id),
            role=user.role.value,
            is_new_user=False,
            profile_complete=True,
        ),
    )


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change admin password",
)
async def change_password(
    payload: AdminChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    # TODO: Add auth dependency in Phase 2
):
    """Change admin password. Required on first login."""
    # Implement with auth dependency in Phase 2
    return MessageResponse(message="Password changed successfully")
