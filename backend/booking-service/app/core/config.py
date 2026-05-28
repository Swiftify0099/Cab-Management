"""
Booking Service  Settings
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class BookingSettings(BaseSettings):
    SERVICE_NAME: str = "booking-service"

    # DB
    DATABASE_URL: str = "postgresql+asyncpg://cabooking:cabooking@localhost:5432/cabooking"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Env
    ENVIRONMENT: str = "development"

    # Fare config
    PLATFORM_FEE: float = 10.0
    BASE_FARE_PER_KM: float = 3.0
    WINDOW_SEAT_SURCHARGE: float = 30.0

    # Booking timeouts
    BOOKING_LOCK_TTL_SECONDS: int = 300
    OTP_VERIFY_TTL_SECONDS: int = 600

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT in ("development", "dev", "local")

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_booking_settings() -> BookingSettings:
    return BookingSettings()


booking_settings = get_booking_settings()
