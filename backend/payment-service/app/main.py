"""
Payment Service  FastAPI entrypoint. Phase 6.
"""
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.v1.payments import router as payments_router
from app.core.config import payment_settings
from common.database import engine
from common.utils.redis_client import close_redis

logger = structlog.get_logger(__name__)
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[CARD] Payment Service starting", env=payment_settings.ENVIRONMENT)
    yield
    logger.info(" Payment Service shutting down")
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title="CabBooking  Payment Service",
    description="Razorpay integration, wallet, rewards, coupons, referrals",
    version="1.0.0",
    docs_url="/docs" if payment_settings.is_development else None,
    redoc_url="/redoc" if payment_settings.is_development else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=payment_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exc(request: Request, exc: Exception):
    logger.error("Unhandled error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error"},
    )


app.include_router(payments_router, prefix="/api/v1", tags=["Payments"])


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "service": "payment-service",
        "version": "1.0.0",
        "razorpay_mode": "test" if "test" in payment_settings.RAZORPAY_KEY_ID else "live",
    }
