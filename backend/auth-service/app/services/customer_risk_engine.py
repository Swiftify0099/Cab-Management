"""
Customer Risk Engine — Phase 2 & 3 Centralized Multi-Factor Evaluation.
Evaluates velocity anomalies, device reputation, booking spam, promo farming,
and customer-driver collusion signals.
Zero PII exposure; strictly server-side authoritative.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple, Optional
import structlog
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    CustomerDevice,
    CustomerRiskSignal,
    CustomerSecurityEvent,
    User,
)
from common.utils.redis_client import get_redis

logger = structlog.get_logger(__name__)


class CustomerRiskEngine:
    """
    Centralized risk calculation service for Customer App ecosystem.
    Computes adaptive risk score (0-100) and dictates security actions.
    """

    @staticmethod
    def classify_severity(score: float) -> Tuple[str, str]:
        """
        Maps numeric score (0-100) to severity and recommended security action.
        Returns (severity, action_taken).
        """
        if score < 30.0:
            return "LOW", "ALLOW"
        elif score < 70.0:
            return "MEDIUM", "CHALLENGE"
        elif score < 90.0:
            return "HIGH", "RESTRICT"
        else:
            return "CRITICAL", "LOCK"

    @staticmethod
    async def evaluate_login_risk(
        db: AsyncSession,
        user_id: uuid.UUID,
        device_id: Optional[str] = None,
        ip_hash: Optional[str] = None,
    ) -> Tuple[float, str, str]:
        """
        Evaluates risk on customer login / OTP verification.
        Factors:
        - Unknown / new hardware (+30 pts)
        - Device marked RESTRICTED (+60 pts)
        - Failed attempts velocity from Redis (+15 pts per failed attempt in 15m)
        """
        risk_score = 0.0

        if device_id:
            # Check device trust status
            stmt = select(CustomerDevice).where(
                CustomerDevice.user_id == user_id,
                CustomerDevice.device_id == device_id,
            )
            res = await db.execute(stmt)
            dev = res.scalar_one_or_none()

            if not dev:
                # Unregistered / new device
                risk_score += 25.0
            elif dev.trust_status == "RESTRICTED":
                risk_score += 65.0
            elif dev.trust_status == "REVOKED":
                risk_score += 90.0
            elif dev.trust_status == "NEW":
                risk_score += 20.0

        # Check Redis velocity for recent failed OTP attempts
        try:
            r = await get_redis()
            failed_key = f"sec:failed_otp:{str(user_id)}"
            failed_count_raw = await r.get(failed_key)
            failed_count = int(failed_count_raw) if failed_count_raw else 0
            if failed_count > 0:
                risk_score += min(failed_count * 15.0, 45.0)
        except Exception:
            pass

        risk_score = min(risk_score, 100.0)
        severity, action = CustomerRiskEngine.classify_severity(risk_score)

        # Record signal if MEDIUM or higher
        if severity in ("MEDIUM", "HIGH", "CRITICAL"):
            signal = CustomerRiskSignal(
                user_id=user_id,
                signal_type="VELOCITY_LOGIN",
                risk_score=risk_score,
                severity=severity,
                status="ACTIVE",
                details_json={"device_id": device_id, "ip_hash": ip_hash},
            )
            db.add(signal)
            await db.flush()

        return risk_score, severity, action

    @staticmethod
    async def evaluate_booking_risk(
        db: AsyncSession,
        user_id: uuid.UUID,
        service_type: str = "RIDE",
    ) -> Tuple[float, str, str]:
        """
        Evaluates booking creation risk against rapid fake booking cycles.
        Checks for cancellation velocity spikes within last 1 hour.
        """
        risk_score = 10.0  # baseline safe
        try:
            r = await get_redis()
            cancel_key = f"sec:cancel_velocity:{str(user_id)}"
            cancel_count_raw = await r.get(cancel_key)
            cancel_count = int(cancel_count_raw) if cancel_count_raw else 0

            if cancel_count >= 4:
                risk_score += 75.0
            elif cancel_count >= 2:
                risk_score += 35.0
        except Exception:
            pass

        risk_score = min(risk_score, 100.0)
        severity, action = CustomerRiskEngine.classify_severity(risk_score)

        if severity in ("HIGH", "CRITICAL"):
            signal = CustomerRiskSignal(
                user_id=user_id,
                signal_type="BOOKING_CANCEL_SURGE",
                risk_score=risk_score,
                severity=severity,
                status="ACTIVE",
                details_json={"service_type": service_type},
            )
            db.add(signal)
            await db.flush()

        return risk_score, severity, action

    @staticmethod
    async def evaluate_promo_abuse(
        db: AsyncSession,
        user_id: uuid.UUID,
        device_id: Optional[str],
        coupon_code: str,
    ) -> Tuple[float, str, str]:
        """
        Detects multi-account coupon farming on the same hardware fingerprint.
        """
        risk_score = 5.0

        if device_id:
            # Check if this device_id was used by other user accounts for same coupon
            stmt = select(CustomerDevice.user_id).where(
                CustomerDevice.device_id == device_id,
                CustomerDevice.user_id != user_id,
            )
            res = await db.execute(stmt)
            other_users = res.scalars().all()

            if len(other_users) >= 2:
                risk_score += 70.0
            elif len(other_users) == 1:
                risk_score += 35.0

        risk_score = min(risk_score, 100.0)
        severity, action = CustomerRiskEngine.classify_severity(risk_score)

        if severity in ("HIGH", "CRITICAL"):
            signal = CustomerRiskSignal(
                user_id=user_id,
                signal_type="PROMO_FARMING",
                risk_score=risk_score,
                severity=severity,
                status="ACTIVE",
                details_json={"coupon_code": coupon_code, "device_id": device_id},
            )
            db.add(signal)
            await db.flush()

        return risk_score, severity, action

    @staticmethod
    async def evaluate_collusion_risk(
        db: AsyncSession,
        customer_id: uuid.UUID,
        driver_id: uuid.UUID,
    ) -> Tuple[float, str, str]:
        """
        Detects abnormal customer-driver repeated pairing clusters (>4 in 24h).
        """
        risk_score = 10.0
        try:
            r = await get_redis()
            pair_key = f"sec:collusion_pair:{str(customer_id)}:{str(driver_id)}"
            pair_count = await r.incr(pair_key)
            if pair_count == 1:
                await r.expire(pair_key, 86400)  # 24h window

            if pair_count > 5:
                risk_score += 75.0
            elif pair_count > 3:
                risk_score += 40.0
        except Exception:
            pass

        risk_score = min(risk_score, 100.0)
        severity, action = CustomerRiskEngine.classify_severity(risk_score)

        if severity in ("HIGH", "CRITICAL"):
            signal = CustomerRiskSignal(
                user_id=customer_id,
                signal_type="COLLUSION_REPEATED_DRIVER",
                risk_score=risk_score,
                severity=severity,
                status="ACTIVE",
                details_json={"driver_id": str(driver_id)},
            )
            db.add(signal)
            await db.flush()

        return risk_score, severity, action
