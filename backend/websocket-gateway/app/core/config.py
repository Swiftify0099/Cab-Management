"""
WebSocket Gateway  Configuration
"""
from functools import lru_cache
from pydantic_settings import BaseSettings
from common.config import settings


class WSSettings(BaseSettings):
    SERVICE_NAME: str = "websocket-gateway"
    ENVIRONMENT: str = "production"
    REDIS_URL: str = settings.REDIS_URL or "rediss://default:gQAAAAAAApumAAIgcDJhYWMyMzA5NmNkOTI0MGYzOTYzNDY4YTJkMzU1YjBkMw@stunning-squid-170918.upstash.io:6379"
    CORS_ORIGINS: list = ["*"]
    SECRET_KEY: str = settings.SECRET_KEY or "dev-secret-change-in-production"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_ws_settings() -> WSSettings:
    return WSSettings()


ws_settings = get_ws_settings()

