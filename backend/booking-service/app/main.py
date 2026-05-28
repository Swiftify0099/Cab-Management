"""
Booking Service  FastAPI entrypoint.
Handles: Trip CRUD, Fare Engine, Seat Booking lifecycle.
"""
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1 import booking_router, fare_router, trip_router
from app.core.config import booking_settings
from common.database import engine
from common.utils.redis_client import close_redis

logger = structlog.get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[START] Booking Service starting", env=booking_settings.ENVIRONMENT)
    yield
    logger.info(" Booking Service shutting down")
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title="CabBooking  Booking Service",
    description="Trip creation, fare calculation, seat booking, lifecycle management",
    version="1.0.0",
    docs_url="/docs" if booking_settings.is_development else None,
    redoc_url="/redoc" if booking_settings.is_development else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=booking_settings.CORS_ORIGINS,
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


#  Mount all routers 
from app.api.v1.subscriptions import router as subscription_router

app.include_router(trip_router,    prefix="/api/v1/trips",         tags=["Trips"])
app.include_router(booking_router, prefix="/api/v1/bookings",      tags=["Seat Booking"])
app.include_router(fare_router,    prefix="/api/v1/bookings/fare", tags=["Fare Engine"])
app.include_router(subscription_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "service": "booking-service", "version": "1.0.0"}
