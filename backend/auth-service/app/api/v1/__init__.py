from app.api.v1.auth import router as auth_router
from app.api.v1.admin_auth import router as admin_auth_router
from app.api.v1.profile import router as profile_router
from app.api.v1.driver import router as driver_router

__all__ = ["auth_router", "admin_auth_router", "profile_router", "driver_router"]
