"""
Auth Service  FastAPI application entry point.
Handles OTP-based auth for customers/drivers and email+password for admins.
"""
import logging
from contextlib import asynccontextmanager

import sentry_sdk
import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1 import auth_router, admin_auth_router, profile_router, driver_router, kyc_router
from app.core.config import auth_settings
from app.core.startup import create_upload_dirs, seed_admin_user, seed_default_themes
from common.database import engine, Base
from common.utils.redis_client import close_redis

logger = structlog.get_logger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan  startup and shutdown events."""
    logger.info("[START] Auth Service starting up...")

    # Create upload directories
    await create_upload_dirs()

    # Seed default admin user + themes
    await seed_admin_user()
    await seed_default_themes()

    logger.info("[READY] Auth Service ready.")
    yield

    # Shutdown
    logger.info("[STOP] Auth Service shutting down...")
    await close_redis()
    await engine.dispose()


# ============================================================
# FastAPI App
# ============================================================

app = FastAPI(
    title="CabBooking Auth Service",
    description="Authentication & Authorization  OTP, JWT, Admin",
    version="1.0.0",
    docs_url="/docs" if auth_settings.is_development else None,
    redoc_url="/redoc" if auth_settings.is_development else None,
    lifespan=lifespan,
)

# Rate limiter exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ============================================================
# Middleware
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=auth_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
import os
os.makedirs(auth_settings.LOCAL_UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=auth_settings.LOCAL_UPLOAD_DIR), name="uploads")


# ============================================================
# Global Exception Handlers
# ============================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", exc_info=exc, path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error"},
    )


# ============================================================
# Routers
# ============================================================

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(admin_auth_router, prefix="/api/v1/admin/auth", tags=["Admin Auth"])
app.include_router(profile_router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(driver_router, prefix="/api/v1/driver", tags=["Driver Onboarding"])
app.include_router(kyc_router, prefix="/api/v1/driver/kyc", tags=["Driver KYC Lifecycle"])

# ============================================================
# Dynamic Gateway Mounting (Booking & Matching)
# ============================================================
import sys
import os

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Snapshot auth-service app modules so we don't break Python 3.13's import machinery
_auth_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}

# Load Booking Service
try:
    _booking_path = os.path.join(_ROOT, "booking-service")
    if _booking_path not in sys.path:
        sys.path.insert(0, _booking_path)

    for _mod in list(sys.modules.keys()):
        if _mod == "app" or _mod.startswith("app."):
            del sys.modules[_mod]

    from app.api.v1 import booking_router, fare_router, trip_router
    from app.api.v1.subscriptions import router as subscription_router

    app.include_router(trip_router,          prefix="/api/v1/trips",         tags=["Trips"])
    app.include_router(booking_router,       prefix="/api/v1/bookings",      tags=["Bookings"])
    app.include_router(fare_router,          prefix="/api/v1/bookings/fare", tags=["Fare"])
    app.include_router(subscription_router)
    logger.info("[GATEWAY] Successfully mounted Booking Service routers")
except Exception as e:
    logger.error("[GATEWAY] Failed to mount Booking Service", exc_info=True)
finally:
    if _booking_path in sys.path:
        sys.path.remove(_booking_path)

# Load Matching Service
try:
    _matching_path = os.path.join(_ROOT, "matching-service")
    if _matching_path not in sys.path:
        sys.path.insert(0, _matching_path)

    for _mod in list(sys.modules.keys()):
        if _mod == "app" or _mod.startswith("app."):
            del sys.modules[_mod]

    from app.api.v1.matching import router as matching_router
    app.include_router(matching_router, prefix="/api/v1/matching", tags=["Matching"])
    logger.info("[GATEWAY] Successfully mounted Matching Service routers")
except Exception as e:
    logger.error("[GATEWAY] Failed to mount Matching Service", exc_info=True)
finally:
    if _matching_path in sys.path:
        sys.path.remove(_matching_path)

# Load Payment Service
try:
    _payment_path = os.path.join(_ROOT, "payment-service")
    if _payment_path not in sys.path:
        sys.path.insert(0, _payment_path)

    for _mod in list(sys.modules.keys()):
        if _mod == "app" or _mod.startswith("app."):
            del sys.modules[_mod]

    # Load payment env variables so Razorpay keys are available
    import dotenv as _dotenv
    _dotenv.load_dotenv(os.path.join(_payment_path, ".env"), override=False)

    from app.api.v1.payments import router as payment_router
    app.include_router(payment_router, prefix="/api/v1", tags=["Payment"])
    logger.info("[GATEWAY] Successfully mounted Payment Service routers")
except Exception as e:
    logger.error("[GATEWAY] Failed to mount Payment Service", exc_info=True)
finally:
    if _payment_path in sys.path:
        sys.path.remove(_payment_path)

# Restore original sys.modules for auth
for _mod in list(sys.modules.keys()):
    if _mod == "app" or _mod.startswith("app."):
        del sys.modules[_mod]
sys.modules.update(_auth_mods)



# ============================================================
# Health Check & Webhooks
# ============================================================

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "auth-service", "version": "1.0.0"}



