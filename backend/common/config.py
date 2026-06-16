"""
Centralized configuration using Pydantic Settings.
All microservices import and extend this base config.
"""
from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseAppSettings(BaseSettings):
    """Base settings shared across all microservices."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow",
    )

    # App
    APP_ENV: str = "development"
    APP_NAME: str = "CabBooking SuperApp"
    APP_VERSION: str = "1.0.0"
    SERVICE_PORT: int = 8000
    SECRET_KEY: str = "change-me-in-production-min-32-chars"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://cabooking_user:cabooking_pass@localhost:5432/cabooking"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_TIMEOUT: int = 30
    DB_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_POOL_SIZE: int = 20

    # JWT
    JWT_SECRET_KEY: str = "change-me-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # Extended for development
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # OTP
    OTP_DEV_MODE: bool = True
    OTP_DEFAULT_CODE: str = "123456"
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    OTP_MAX_REQUESTS_PER_HOUR: int = 5

    # Admin
    ADMIN_DEFAULT_EMAIL: str = "admin@cabooking.com"
    ADMIN_DEFAULT_PASSWORD: str = "123456"
    ADMIN_FORCE_PASSWORD_CHANGE: bool = True

    # Google Maps
    GOOGLE_MAPS_API_KEY: str = ""

    # Storage
    STORAGE_BACKEND: str = "local"
    LOCAL_UPLOAD_DIR: str = "./uploads"
    LOCAL_UPLOAD_URL: str = "http://localhost:8000/uploads"

    # Platform Fees
    PLATFORM_FEE_PER_SEAT: int = 10
    DEFAULT_COMMISSION_PERCENT: float = 15.0

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Sentry
    SENTRY_DSN: Optional[str] = None

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:8001",
        "http://127.0.0.1:8010",
        "http://localhost:8001",
        "http://localhost:8010",
        # Android emulator → host machine
        "http://10.0.2.2:8001",
        "http://10.0.2.2:3000",
        # Current Wi-Fi LAN IP (physical Android device) — updated 2026-06-16
        "http://192.168.43.127:8001",
        "http://192.168.43.96:3000",
        "http://192.168.43.96:5173",
        "http://192.168.43.96:8010",
        # Keep old IP as fallback (can be removed when stable)
        "http://192.168.43.157:8001",
    ]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    # Firebase
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache()
def get_settings() -> BaseAppSettings:
    """Cached settings instance."""
    return BaseAppSettings()


settings = get_settings()
