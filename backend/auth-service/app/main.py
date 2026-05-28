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

from app.api.v1 import auth_router, admin_auth_router, profile_router, driver_router
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


# ============================================================
# Health Check
# ============================================================

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "auth-service", "version": "1.0.0"}
