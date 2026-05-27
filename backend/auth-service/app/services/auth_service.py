"""
Auth service — core business logic for user creation, token issuance.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import RefreshToken, User, UserRole
from common.utils.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)
from common.utils.redis_client import blacklist_token
from fastapi import HTTPException, status

logger = structlog.get_logger(__name__)


async def create_user_if_not_exists(
    db: AsyncSession,
    phone: str,
    role: UserRole = UserRole.CUSTOMER,
) -> Tuple[User, bool]:
    """
    Get existing user or create new one.
    Returns (user, is_new).
    """
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if user:
        return user, False

    # New user
    user = User(
        phone=phone,
        role=role,
        is_verified=True,
        is_active=True,
        is_profile_complete=False,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    logger.info("New user created", user_id=str(user.id), phone=phone, role=role.value)
    return user, True


async def issue_tokens(
    db: AsyncSession,
    user: User,
    device_id: Optional[str] = None,
    device_name: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> Tuple[str, str]:
    """
    Issue access + refresh token pair.
    Stores refresh token hash in DB.
    """
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        device_id=device_id,
    )

    raw_refresh, token_hash = create_refresh_token(
        subject=str(user.id),
        device_id=device_id,
    )

    # Store refresh token hash in DB
    from app.core.config import auth_settings
    refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        device_id=device_id,
        device_name=device_name,
        ip_address=ip_address,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=auth_settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_record)
    await db.flush()

    return access_token, raw_refresh


async def rotate_refresh_token(
    db: AsyncSession,
    refresh_token: str,
    device_id: Optional[str] = None,
) -> Tuple[str, str, User]:
    """
    Validate refresh token, revoke old one, issue new pair.
    """
    try:
        payload = decode_token(refresh_token, expected_type="refresh")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    token_hash = hash_token(refresh_token)

    # Look up in DB
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked == False,
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or already revoked",
        )

    # Revoke old token
    record.is_revoked = True
    await db.flush()

    # Get user
    user_result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = user_result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Issue new pair
    access_token, new_refresh = await issue_tokens(
        db=db, user=user, device_id=device_id
    )

    return access_token, new_refresh, user


async def revoke_refresh_token(
    db: AsyncSession,
    refresh_token: str,
    access_token_jti: Optional[str] = None,
) -> None:
    """Revoke refresh token and optionally blacklist access token."""
    token_hash = hash_token(refresh_token)

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    record = result.scalar_one_or_none()

    if record:
        record.is_revoked = True

    # Blacklist access token if JTI provided
    if access_token_jti:
        await blacklist_token(jti=access_token_jti, expire_seconds=900)
