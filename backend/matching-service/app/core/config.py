"""
Matching Service  Core Configuration
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class MatchingSettings(BaseSettings):
    # Service
    SERVICE_NAME: str = "matching-service"
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8003

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://cabuser:cabpass@postgres:5432/cabdb"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_POOL_SIZE: int = 20

    # Matching Config
    MAX_SEARCH_RADIUS_KM: float = 50.0       # Max geo radius
    INITIAL_SEARCH_RADIUS_KM: float = 5.0    # Start narrow, expand
    RADIUS_EXPAND_STEPS: list = [5, 15, 30, 50]
    DRIVER_ACCEPT_TIMEOUT_SEC: int = 45       # Driver must respond in 45s
    MAX_RETRY_DRIVERS: int = 5               # Try up to 5 drivers
    PENALTY_THRESHOLD: int = 3               # 3 rejected = suspension

    # CORS
    CORS_ORIGINS: list = ["*"]

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> MatchingSettings:
    return MatchingSettings()


matching_settings = get_settings()
