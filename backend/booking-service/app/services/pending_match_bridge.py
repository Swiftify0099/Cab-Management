"""
Pending Match Bridge — calls the matching-service API via HTTP.

booking-service cannot import matching-service directly (separate containers).
This bridge fires an internal HTTP POST to trigger reverse matching
after a customer pre-booking is created.

In monolith mode (single process), falls back to direct DB call.
"""
from __future__ import annotations

import httpx
import structlog

logger = structlog.get_logger(__name__)

# Internal service URLs (Docker compose / K8s service names)
MATCHING_SERVICE_URL = "http://matching-service:8003"


async def run_reverse_match(pending_booking_id: str) -> None:
    """
    Call matching-service to run reverse scan for this pending booking.
    Fire-and-forget: errors are logged but not re-raised.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{MATCHING_SERVICE_URL}/internal/match-pending/{pending_booking_id}"
            )
            if resp.status_code == 200:
                result = resp.json()
                logger.info(
                    "Reverse match completed",
                    pending_booking_id=pending_booking_id,
                    matches=result.get("matches", 0),
                )
            else:
                logger.warning(
                    "Reverse match service error",
                    status=resp.status_code,
                    body=resp.text,
                )
    except Exception as e:
        logger.error("Reverse match bridge failed", exc_info=e)
