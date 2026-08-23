"""
Common Communication Layer — Master Core Architecture
════════════════════════════════════════════════════════════════════════════════
Unified virtual number masking, in-app messaging, and call-session management
for customer <-> driver communication across ALL services:
- Rides
- Parcels (sender <-> courier, recipient <-> courier)
- Freight Transport
- Rentals & Outstations

Ensures real customer and driver phone numbers are NEVER exposed to each other.
"""
from __future__ import annotations

import time
import uuid
from typing import Optional, Dict, Any

import structlog

logger = structlog.get_logger(__name__)

# Simulated virtual numbers pool for telephony masking
VIRTUAL_PROXY_POOL = [
    "+91 20 6700 1100",
    "+91 20 6700 1101",
    "+91 20 6700 1102",
    "+91 20 6700 1103",
]


class CommonCommunicationService:
    """
    Manages privacy-safe communication channels between customer and driver.
    """

    @classmethod
    def create_masked_call_session(
        cls,
        job_id: str,
        job_type: str,
        customer_phone: str,
        driver_phone: str,
        ttl_seconds: int = 3600,
    ) -> Dict[str, Any]:
        """
        Creates an encrypted/masked bridge session.
        Returns the virtual number to dial and session token.
        """
        # Pick virtual number deterministically based on hash
        idx = hash(job_id) % len(VIRTUAL_PROXY_POOL)
        virtual_number = VIRTUAL_PROXY_POOL[idx]

        session_id = f"call-sess-{uuid.uuid4().hex[:12]}"
        expires_at = time.time() + ttl_seconds

        logger.info(
            "masked_call_session_created",
            session_id=session_id,
            job_id=job_id,
            job_type=job_type,
            virtual_number=virtual_number,
        )

        return {
            "session_id": session_id,
            "job_id": job_id,
            "job_type": job_type,
            "virtual_number": virtual_number,
            "pin_extension": str(abs(hash(job_id)) % 9000 + 1000),
            "expires_at": expires_at,
            "status": "ACTIVE",
        }

    @classmethod
    def mask_phone_for_display(cls, phone: str) -> str:
        """Standardized phone masking utility: +91 98••••2345"""
        if not phone or len(phone) < 6:
            return phone or ""
        cleaned = phone.replace(" ", "").replace("-", "")
        if len(cleaned) <= 6:
            return cleaned
        return f"{cleaned[:4]} •••• {cleaned[-4:]}"
