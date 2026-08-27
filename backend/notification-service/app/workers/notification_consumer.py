"""
Notification Consumer — Redis Pub/Sub Worker
============================================
Listens on the 'notification:events' Redis channel and dispatches
FCM push notifications to the appropriate devices.

Event schema expected on the channel:
{
    "event":        str,          # e.g. "TRIP_ACCEPTED", "DRIVER_NEARBY"
    "user_id":      str,          # UUID of the recipient user
    "user_type":    str,          # "customer" | "driver"
    "device_token": str | null,   # FCM or Expo push token
    "title":        str,
    "body":         str,
    "data":         dict,         # Extra payload forwarded to the app
    "idempotency_key": str | null # Optional — prevents duplicate sends
}

Supported events and their notification priority/channel:
  HIGH PRIORITY (ride_requests channel):
    INCOMING_TRIP_REQUEST     — Driver: new ride request incoming
    ORG_STUDENT_APPROACHING   — Student: bus is 3KM away
    DAILY_TRIP_RENEWAL        — Driver: today's scheduled trip needs confirmation

  STANDARD (default channel):
    TRIP_ACCEPTED             — Customer: driver confirmed
    TRIP_REJECTED             — Customer: driver passed, retrying
    TRIP_STARTED              — Customer/Driver: trip underway
    TRIP_COMPLETED            — Customer/Driver: trip done
    ARRIVAL_ALERT             — Customer: driver is nearby
    MATCH_FOUND               — Customer: a matching trip was found
    TRIP_FULL                 — Customer: their booked trip is now full
    SCHEDULE_REMINDER         — Driver/Customer: upcoming scheduled trip reminder
    DRIVER_APPROACHING        — Legacy alias for ORG_STUDENT_APPROACHING
"""
from __future__ import annotations

import asyncio
import json
from typing import Optional

import structlog
from common.utils.redis_client import get_redis

from notification_service.app.services.fcm_service import send_push

logger = structlog.get_logger(__name__)

# Events that must be delivered with maximum priority (ride_requests channel)
HIGH_PRIORITY_EVENTS = {
    "INCOMING_TRIP_REQUEST",
    "ORG_STUDENT_APPROACHING",
    "DRIVER_APPROACHING",
    "DAILY_TRIP_RENEWAL",
}

# Map from event type → (title_override, body_override) — None means use payload values
EVENT_DEFAULTS: dict[str, tuple[Optional[str], Optional[str]]] = {
    "TRIP_ACCEPTED":      (None, None),
    "TRIP_REJECTED":      (None, None),
    "TRIP_STARTED":       (None, None),
    "TRIP_COMPLETED":     (None, None),
    "ARRIVAL_ALERT":      ("Driver is nearby!", None),
    "MATCH_FOUND":        ("Trip found for you!", None),
    "TRIP_FULL":          ("Trip is now full", None),
    "SCHEDULE_REMINDER":  (None, None),
}

# Idempotency TTL in seconds (24 hours)
IDEMPOTENCY_TTL = 86400


async def _handle_event(payload: dict) -> None:
    """Process a single notification event payload."""
    event = payload.get("event", "UNKNOWN")
    device_token = payload.get("device_token") or payload.get("token")
    user_id = payload.get("user_id", "")
    title = payload.get("title", "")
    body = payload.get("body", "")
    data = payload.get("data") or {}
    idempotency_key = payload.get("idempotency_key", "")

    # Apply event-level title/body defaults
    defaults = EVENT_DEFAULTS.get(event)
    if defaults:
        if defaults[0] and not title:
            title = defaults[0]
        if defaults[1] and not body:
            body = defaults[1]

    if not title:
        title = "CabBooking"
    if not body:
        body = event.replace("_", " ").title()

    # Idempotency check
    if idempotency_key:
        r = await get_redis()
        already_sent_key = f"notif:sent:{idempotency_key}"
        if await r.exists(already_sent_key):
            logger.debug("Duplicate notification suppressed", event=event, key=idempotency_key)
            return
        await r.setex(already_sent_key, IDEMPOTENCY_TTL, "1")

    if not device_token:
        logger.debug("No device token — push skipped", event=event, user_id=user_id)
        return

    is_high_priority = event in HIGH_PRIORITY_EVENTS
    channel_id = "ride_requests" if is_high_priority else "default"
    priority = "high" if is_high_priority else "normal"

    # Add event type to data so the app can route on notification tap
    data["event"] = event
    data["user_id"] = user_id

    success = await send_push(
        device_token=device_token,
        title=title,
        body=body,
        data=data,
        priority=priority,
        channel_id=channel_id,
    )

    if success:
        logger.info(
            "Notification delivered",
            event=event,
            user_id=user_id,
            priority=priority,
        )
    else:
        logger.warning(
            "Notification delivery failed",
            event=event,
            user_id=user_id,
            token_prefix=(device_token or "")[:10],
        )


async def consume_notifications() -> None:
    """
    Main consumer loop. Subscribes to 'notification:events' Redis channel
    and processes every incoming push notification event.

    Runs indefinitely — cancelled only on service shutdown.
    Automatically reconnects if the Redis connection drops.
    """
    logger.info("Notification consumer started — listening on notification:events")

    while True:
        try:
            r = await get_redis()
            pubsub = r.pubsub()
            await pubsub.subscribe("notification:events")
            logger.info("Subscribed to notification:events")

            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue

                raw = message.get("data", "")
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8")

                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON in notification event", raw=raw[:100])
                    continue

                # Process each event in a separate task so one failure doesn't block the queue
                asyncio.create_task(_handle_event(payload))

        except asyncio.CancelledError:
            logger.info("Notification consumer shutting down")
            break
        except Exception as exc:
            logger.exception("Notification consumer error — reconnecting in 5s", error=str(exc))
            await asyncio.sleep(5)
