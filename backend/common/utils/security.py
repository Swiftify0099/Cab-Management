"""
Security utilities - password hashing, OTP generation.
"""
import random
import secrets
import string
import bcrypt

from common.config import settings


# ============================================================
# Password Hashing (Direct bcrypt, avoiding passlib 72-byte bug)
# ============================================================

def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    pwd_bytes = password[:72].encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    try:
        pwd_bytes = plain_password[:72].encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


# ============================================================
# OTP Generation
# ============================================================

def generate_otp(length: int = 6) -> str:
    """
    Generate a numeric OTP.
    In DEV mode (OTP_DEV_MODE=true), always returns OTP_DEFAULT_CODE (123456).
    """
    if settings.OTP_DEV_MODE:
        return settings.OTP_DEFAULT_CODE
    return "".join(random.choices(string.digits, k=length))


# ============================================================
# Secure Tokens & Codes
# ============================================================

def generate_referral_code(length: int = 8) -> str:
    """Generate a unique referral code (alphanumeric uppercase)."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(length)


def generate_coupon_code(prefix: str = "CAB", length: int = 8) -> str:
    """Generate a coupon code like CAB-ABCD1234."""
    suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))
    return f"{prefix}-{suffix}"