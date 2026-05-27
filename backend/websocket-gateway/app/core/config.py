"""
WebSocket Gateway — Configuration
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class WSSettings(BaseSettings):
    SERVICE_NAME: str = "websocket-gateway"
    ENVIRONMENT: str = "development"
    REDIS_URL: str = "redis://redis:6379/0"
    CORS_ORIGINS: list = ["*"]
    SECRET_KEY: str = "dev-secret-change-in-production"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_ws_settings() -> WSSettings:
    return WSSettings()


ws_settings = get_ws_settings()
