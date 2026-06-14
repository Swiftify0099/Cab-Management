"""
Pending Match Bridge — calls the matching-service API via HTTP.

In local dev (monolith/gateway mode), calls localhost:8001 (local_gateway).
In Docker/production, calls the matching-service container directly.

Falls back to direct in-process DB call if both HTTP attempts fail.
"""
from __future__ import annotations

import os
import httpx
import structlog

logger = structlog.get_logger(__name__)

# Local dev gateway URL (all services merged into one process on 8001)
# In Docker, override with MATCHING_SERVICE_URL env var pointing to container.
MATCHING_SERVICE_URL = os.environ.get(
    "MATCHING_SERVICE_URL",
    "http://localhost:8001"   # local_gateway default
)

# Internal endpoint exposed by the gateway (matching router mounted at /api/v1/matching)
_INTERNAL_MATCH_PATH = "/api/v1/matching/internal/match-pending"


async def run_reverse_match(pending_booking_id: str) -> None:
    """
    Trigger reverse matching for a freshly created pending booking.

    Strategy:
      1. HTTP POST to the gateway/matching-service internal endpoint.
      2. On failure (connection refused, timeout, etc.) fall back to a
         direct in-process call so local dev keeps working without Docker.
    """
    url = f"{MATCHING_SERVICE_URL}{_INTERNAL_MATCH_PATH}/{pending_booking_id}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url)
            if resp.status_code in (200, 201):
                result = resp.json()
                logger.info(
                    "Reverse match completed via HTTP",
                    pending_booking_id=pending_booking_id,
                    matches=result.get("matches", 0),
                )
                return
            else:
                logger.warning(
                    "Reverse match HTTP returned non-200",
                    status=resp.status_code,
                    body=resp.text[:200],
                )
    except Exception as http_err:
        logger.warning(
            "Reverse match HTTP failed — falling back to direct DB call",
            error=str(http_err),
        )

    # ── Fallback: direct in-process call ─────────────────────────────────────
    # Works when booking-service and matching-service share the same Python
    # process (local_gateway.py monolith mode).
    # We add matching-service to sys.path so 'app.services.pending_matching'
    # resolves to the matching-service module, not booking-service.
    try:
        import sys
        _root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        _matching_path = os.path.join(_root, "matching-service")
        _added = False
        if _matching_path not in sys.path:
            sys.path.insert(0, _matching_path)
            _added = True

        from common.database import async_session_maker
        # Import from the matching-service module explicitly
        import importlib.util as _ilu
        _spec = _ilu.spec_from_file_location(
            "_pending_matching_svc",
            os.path.join(_matching_path, "app", "services", "pending_matching.py"),
        )
        _pm_mod = _ilu.module_from_spec(_spec)
        _spec.loader.exec_module(_pm_mod)
        PendingMatchingServiceDirect = _pm_mod.PendingMatchingService

        if _added and _matching_path in sys.path:
            sys.path.remove(_matching_path)

        async with async_session_maker() as db:
            svc = PendingMatchingServiceDirect(db)
            matches = await svc.scan_trips_for_customer(pending_booking_id)
            logger.info(
                "Reverse match completed via direct DB call",
                pending_booking_id=pending_booking_id,
                matches=len(matches),
            )
    except Exception as db_err:
        logger.error("Reverse match direct DB fallback failed", exc_info=db_err)
