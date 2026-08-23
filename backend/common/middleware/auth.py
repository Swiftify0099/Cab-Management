"""
RBAC Auth Dependency  FastAPI Depends() for all protected routes.
Validates JWT, checks blacklist, returns current user.
"""
import uuid
from typing import Optional

import structlog
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.models.all_models import User, UserRole
from common.utils.jwt import decode_token
from common.utils.redis_client import is_token_blacklisted

logger = structlog.get_logger(__name__)

# Bearer token scheme
bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Lightweight user object attached to request state."""

    def __init__(self, user: User, payload: dict):
        self.id: uuid.UUID = user.id
        self.phone: str = user.phone
        self.email: Optional[str] = user.email
        self.role: UserRole = user.role
        self.is_verified: bool = user.is_verified
        self.is_active: bool = user.is_active
        self.is_profile_complete: bool = user.is_profile_complete
        self.device_id: Optional[str] = payload.get("device_id")
        self.jti: str = payload.get("jti", "")
        self._user: User = user

    @property
    def user_id_str(self) -> str:
        return str(self.id)


async def _get_token_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> dict:
    """Extract and validate JWT payload from Authorization header."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = decode_token(token, expected_type="access")
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check blacklist (for logged-out tokens)
    jti = payload.get("jti", "")
    if jti and await is_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
        )

    return payload


async def get_current_user(
    payload: dict = Depends(_get_token_payload),
    db: AsyncSession = Depends(get_db),
) -> AuthenticatedUser:
    """
    Core auth dependency  validates JWT and returns AuthenticatedUser.
    Use as: current_user: AuthenticatedUser = Depends(get_current_user)
    """
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Contact support.",
        )

    return AuthenticatedUser(user=user, payload=payload)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[AuthenticatedUser]:
    """Optional auth dependency — returns AuthenticatedUser if valid token present, otherwise None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = uuid.UUID(user_id_str)
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            return None
        return AuthenticatedUser(user=user, payload=payload)
    except Exception:
        return None


async def get_current_active_customer(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Only allow customer role."""
    if current_user.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )
    return current_user


async def get_current_active_driver(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AuthenticatedUser:
    """Only allow driver role.

    Safety net: if the user's DB role is still 'customer' but they have
    a Driver profile (went through onboarding), auto-upgrade their role to
    'driver' and allow the request.  This heals legacy accounts created
    before the role-enforcement fix without forcing a re-login.
    """
    if current_user.role == UserRole.DRIVER:
        return current_user

    # Blocked — but check for a Driver profile before rejecting
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        from common.models.all_models import Driver
        result = await db.execute(
            select(User).where(User.id == current_user.id)
        )
        user = result.scalar_one_or_none()

        # Check if a Driver profile exists for this user
        driver_result = await db.execute(
            select(Driver).where(Driver.user_id == current_user.id)
        )
        driver_profile = driver_result.scalar_one_or_none()

        if driver_profile and user:
            # User went through driver onboarding — upgrade their role
            user.role = UserRole.DRIVER
            await db.commit()
            current_user.role = UserRole.DRIVER
            return current_user

        # Also allow if the user has NO driver profile but is not admin
        # (they might be a first-time driver who hasn't completed onboarding yet)
        # In that case, upgrade role so they can at least proceed
        if user and user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            user.role = UserRole.DRIVER
            await db.commit()
            current_user.role = UserRole.DRIVER
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Driver access required",
    )


async def get_current_admin(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Only allow admin or super_admin roles."""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_current_super_admin(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Only allow super_admin role."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


def require_profile_complete(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    """Require profile to be complete (customer mandatory fields)."""
    if not current_user.is_profile_complete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Profile setup required. Please complete your profile first.",
        )
    return current_user


# Alias for consistency across services
TokenData = AuthenticatedUser


def require_role(*roles: str):
    allowed_roles = set(roles)
    if 'admin' in allowed_roles:
        allowed_roles.add('super_admin')
    async def _require_role(
        current_user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted.",
            )
        return current_user
    return _require_role

