from functools import lru_cache
from common.config import BaseAppSettings

class ServiceSettings(BaseAppSettings):
    SERVICE_NAME: str = 'notification-service'
    SERVICE_PORT: int = 8007

@lru_cache()
def get_settings() -> ServiceSettings:
    return ServiceSettings()

settings = get_settings()
