"""
CabBooking Push Notification Service
=====================================
Responsible for delivering push notifications to driver and customer devices
via FCM (Firebase Cloud Messaging) or the Expo Push API.

Architecture:
  - This service subscribes to the Redis 'notification:events' pub/sub channel.
  - All other backend services (matching-service, auth-service, etc.) publish
    notification events to Redis via publish_event("notification:events", {...}).
  - This service picks them up and calls the appropriate push delivery API.

No HTTP endpoints are exposed for notification delivery — the service is
purely event-driven through Redis pub/sub.
"""
from contextlib import asynccontextmanager
import asyncio
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from common.utils.redis_client import close_redis

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("📲 Notification service starting — connecting to Redis pub/sub...")
    tasks = []
    try:
        from notification_service.app.workers.notification_consumer import consume_notifications
        tasks.append(asyncio.create_task(consume_notifications()))
        logger.info("✅ Notification consumer started — listening on notification:events")
    except ImportError as exc:
        logger.warning("Could not import notification consumer (import path issue)", error=str(exc))
        # Try alternate import path
        try:
            from app.workers.notification_consumer import consume_notifications
            tasks.append(asyncio.create_task(consume_notifications()))
            logger.info("✅ Notification consumer started (alternate import path)")
        except ImportError as exc2:
            logger.error("Failed to start notification consumer", error=str(exc2))

    yield

    logger.info("Notification service shutting down...")
    for task in tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    await close_redis()


app = FastAPI(
    title="CabBooking Push Notification Service",
    description="Redis-driven FCM/Expo push notification delivery service",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "notification-service",
        "version": "2.0.0",
        "delivery_modes": ["FCM HTTP v1", "FCM Legacy", "Expo Push"],
    }
