"""
Centralized Notification Dispatcher — common/services
======================================================
All services should call this dispatcher to send push notifications
instead of calling publish_event("notification:events", ...) directly.

Benefits:
  1. Idempotency — prevents duplicate pushes via Redis key deduplication
  2. Centralized event schema — consistent payload structure
  3. Single point of logging — audit trail in Redis and optionally DB
  4. Easy to add rate limiting, user preferences, and DND windows

Usage:
    from common.services.notification_dispatcher import dispatch_notification

    await dispatch_notification(
        event_type="TRIP_ACCEPTED",
        user_id=str(customer_user_id),
        device_token=cust_user.device_token,
        title="Your ride is confirmed!",
        body=f"Driver {driver.full_name} is on the way.",
        data={"screen": "TrackDriver", "booking_id": booking_id},
        idempotency_key=f"trip_accepted:{booking_id}",
    )

If idempotency_key is omitted, a key is auto-generated from event_type + user_id + timestamp (minute-level).
"""
from __future__ import annotations

import hashlib
import time
from typing import Any, Dict, Optional

import structlog

from common.utils.redis_client import get_redis, publish_event

logger = structlog.get_logger(__name__)

# How long the idempotency key stays in Redis (24 hours)
IDEMPOTENCY_TTL = 86400


async def dispatch_notification(
    event_type: str,
    user_id: str,
    device_token: Optional[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    idempotency_key: Optional[str] = None,
    user_type: str = "customer",  # "customer" | "driver"
) -> bool:
    """
    Dispatch a push notification event to the notification-service via Redis.

    Returns:
        True  — event published to Redis (delivery is async via notification-service)
        False — suppressed due to duplicate idempotency key or missing token
    """
    if not device_token:
        logger.debug(
            "Notification skipped — no device token",
            event=event_type,
            user_id=user_id,
        )
        return False

    # Build idempotency key if not provided
    if not idempotency_key:
        minute_bucket = str(int(time.time()) // 60)  # minute-level dedup
        raw = f"{event_type}:{user_id}:{minute_bucket}"
        idempotency_key = hashlib.sha256(raw.encode()).hexdigest()[:32]

    # Check for duplicate
    r = await get_redis()
    redis_key = f"notif:sent:{idempotency_key}"
    if await r.exists(redis_key):
        logger.debug(
            "Duplicate notification suppressed",
            event=event_type,
            user_id=user_id,
            key=idempotency_key,
        )
        return False

    # Mark as sent immediately (before publishing) to prevent races
    await r.setex(redis_key, IDEMPOTENCY_TTL, "1")

    payload = {
        "event": event_type,
        "user_id": user_id,
        "user_type": user_type,
        "device_token": device_token,
        "title": title,
        "body": body,
        "data": data or {},
        "idempotency_key": idempotency_key,
    }

    await publish_event("notification:events", payload)

    logger.debug(
        "Notification dispatched",
        event=event_type,
        user_id=user_id,
        token_prefix=device_token[:10],
    )
    return True


async def dispatch_notification_bulk(
    notifications: list[dict],
) -> int:
    """
    Dispatch multiple notifications in bulk.
    Each item in notifications should be a dict with the same kwargs as dispatch_notification.
    Returns count of notifications actually dispatched (non-duplicates).
    """
    count = 0
    for notif in notifications:
        sent = await dispatch_notification(**notif)
        if sent:
            count += 1
    return count
