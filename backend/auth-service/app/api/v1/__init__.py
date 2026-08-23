from app.api.v1.auth import router as auth_router
from app.api.v1.profile import router as profile_router
from app.api.v1.driver import router as driver_router
from app.api.v1.kyc import router as kyc_router
from app.api.v1.admin_auth import router as admin_auth_router
from app.api.v1.family import router as family_router
from app.api.v1.emergency import router as emergency_router
from app.api.v1.customer_settings import router as customer_settings_router
from app.api.v1.customer_home import router as customer_home_router
from app.api.v1.services import router as services_router
from app.api.v1.customer_security import router as customer_security_router
from app.api.v1.smart import router as smart_router
from app.api.v1.orchestration import router as orchestration_router

__all__ = [
    "auth_router",
    "profile_router",
    "driver_router",
    "kyc_router",
    "admin_auth_router",
    "family_router",
    "emergency_router",
    "customer_settings_router",
    "customer_home_router",
    "services_router",
    "customer_security_router",
    "smart_router",
    "orchestration_router",
]
