"""
JWT utility — token creation, verification, and management.
"""
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from common.config import settings


# ============================================================
# Token Generation
# ============================================================

def create_access_token(
    subject: str,
    role: str,
    device_id: str | None = None,
    extra_data: dict[str, Any] | None = None,
) -> str:
    """Create a signed JWT access token (15-min expiry)."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": now,
        "exp": expire,
        "jti": str(uuid.uuid4()),
        "type": "access",
    }

    if device_id:
        payload["device_id"] = device_id
    if extra_data:
        payload.update(extra_data)

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(
    subject: str,
    device_id: str | None = None,
) -> tuple[str, str]:
    """
    Create a refresh token.
    Returns (raw_token, token_hash).
    Only the hash is stored in DB.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "jti": str(uuid.uuid4()),
        "type": "refresh",
    }

    if device_id:
        payload["device_id"] = device_id

    raw_token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    token_hash = hash_token(raw_token)
    return raw_token, token_hash


def hash_token(token: str) -> str:
    """SHA-256 hash of a token for secure DB storage."""
    return hashlib.sha256(token.encode()).hexdigest()


# ============================================================
# Token Verification
# ============================================================

def decode_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    """Decode and validate a JWT token. Raises JWTError on failure."""
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )

    token_type = payload.get("type")
    if token_type != expected_type:
        raise JWTError(f"Invalid token type: expected {expected_type}, got {token_type}")

    return payload


def get_subject_from_token(token: str) -> str:
    """Extract user ID (sub claim) from token without full validation."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False},
        )
        return payload.get("sub", "")
    except JWTError:
        return ""
