"""
Matching Service — FastAPI entrypoint.
Handles: Geo-search, driver dispatch queue, accept/reject, penalty.
"""
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1.matching import router as matching_router
from app.api.v1.tracking import router as tracking_router
from app.core.config import matching_settings
from common.database import engine
from common.utils.redis_client import close_redis

logger = structlog.get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🎯 Matching Service starting", env=matching_settings.ENVIRONMENT)
    yield
    logger.info("🛑 Matching Service shutting down")
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title="CabBooking — Matching Service",
    description="PostGIS geo-search, driver dispatch, accept/reject, penalty system",
    version="1.0.0",
    docs_url="/docs" if matching_settings.is_development else None,
    redoc_url="/redoc" if matching_settings.is_development else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=matching_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exc(request: Request, exc: Exception):
    logger.error("Unhandled error", exc_info=exc, path=str(request.url))
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error"},
    )


# Mount routers
app.include_router(matching_router, prefix="/api/v1/matching", tags=["Matching"])
app.include_router(tracking_router, prefix="/api/v1/tracking", tags=["Tracking"])


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "service": "matching-service",
        "version": "1.0.0",
        "config": {
            "max_search_radius_km": matching_settings.MAX_SEARCH_RADIUS_KM,
            "driver_accept_timeout_sec": matching_settings.DRIVER_ACCEPT_TIMEOUT_SEC,
            "max_retry_drivers": matching_settings.MAX_RETRY_DRIVERS,
        },
    }
