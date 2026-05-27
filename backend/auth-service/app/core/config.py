"""
Auth Service specific configuration.
Extends the shared BaseAppSettings.
"""
from functools import lru_cache
from common.config import BaseAppSettings


class AuthSettings(BaseAppSettings):
    """Auth service-specific settings."""
    SERVICE_NAME: str = "auth-service"
    SERVICE_PORT: int = 8001


@lru_cache()
def get_auth_settings() -> AuthSettings:
    return AuthSettings()


auth_settings = get_auth_settings()
