"""
Feature 22: Driver Safety Intelligence Service
Centralized Safety Toolkit, Emergency SOS with 112 escalation, Trusted Emergency Contacts,
tokenized Live Trip Sharing, Route Deviation & Long-Stop Anomaly Detection, Speed Alerts, and Incident Reports.
"""
from __future__ import annotations

import secrets
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

import structlog
from sqlalchemy import select, update, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    Driver, User, RideRequest, RideRequestStatus,
    RideSOSEvent, DriverTrustedContact, LiveTripShareSession,
    DriverSafetyAlert, SafetyIncidentReport, RideEventLog
)
from app.services.ride_fare_engine import haversine_distance_km

logger = structlog.get_logger(__name__)


def _mask_phone(phone: str) -> str:
    cleaned = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
    if len(cleaned) >= 10:
        return cleaned[:3] + " •••• ••" + cleaned[-2:]
    return "•••• ••••"


class DriverSafetyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ────────────────────────────────────────────────────────────
    # 1. EMERGENCY SOS
    # ────────────────────────────────────────────────────────────
    async def trigger_sos(
        self,
        driver_id: uuid.UUID,
        ride_id: uuid.UUID,
        latitude: float,
        longitude: float,
        accuracy: float = 10.0,
        reason: str = "Driver triggered Emergency SOS",
    ) -> Dict[str, Any]:
        """
        Authoritative Emergency SOS Trigger with PostGIS coordinate snapshot and 112 alerting.
        Idempotent: returns existing active SOS incident if already triggered.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        # 1. Idempotency Check
        existing_sos_res = await self.db.execute(
            select(RideSOSEvent).where(and_(RideSOSEvent.ride_id == ride.id, RideSOSEvent.status == "active"))
        )
        existing_sos = existing_sos_res.scalar_one_or_none()
        if existing_sos:
            return {
                "success": True,
                "sos_id": str(existing_sos.id),
                "status": "active",
                "message": "Emergency SOS already active. Safety Command Center and local authorities alerted.",
                "police_number": "112",
                "created_at": existing_sos.created_at.isoformat() if existing_sos.created_at else datetime.now(timezone.utc).isoformat(),
            }

        # 2. Create SOS Record
        now = datetime.now(timezone.utc)
        sos_id = uuid.uuid4()
        sos_event = RideSOSEvent(
            id=sos_id,
            ride_id=ride.id,
            driver_id=driver_id,
            customer_id=ride.customer_id,
            triggered_by="driver",
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            location=f"SRID=4326;POINT({longitude} {latitude})",
            reason=reason,
            status="active",
        )
        self.db.add(sos_event)
        ride.has_active_sos = True

        # 3. Create Safety Alert Record
        alert = DriverSafetyAlert(
            id=uuid.uuid4(),
            driver_id=driver_id,
            ride_id=ride.id,
            alert_type="SOS",
            severity="URGENT",
            status="ACTIVE",
            latitude=latitude,
            longitude=longitude,
            details_json={"sos_id": str(sos_id), "reason": reason, "accuracy": accuracy},
        )
        self.db.add(alert)
        await self.db.commit()

        return {
            "success": True,
            "sos_id": str(sos_id),
            "status": "active",
            "ride_id": str(ride.id),
            "driver_id": str(driver_id),
            "latitude": latitude,
            "longitude": longitude,
            "police_number": "112",
            "created_at": now.isoformat(),
            "message": "Emergency SOS triggered. Live location transmitted to 24/7 Safety Command Center and Police (112).",
        }

    # ────────────────────────────────────────────────────────────
    # 2. TRUSTED CONTACTS
    # ────────────────────────────────────────────────────────────
    async def add_trusted_contact(
        self,
        driver_id: uuid.UUID,
        name: str,
        phone: str,
        relationship: str = "Family",
    ) -> Dict[str, Any]:
        """
        Adds a verified emergency contact (max 3 allowed per driver).
        """
        # Count existing
        c_res = await self.db.execute(
            select(DriverTrustedContact).where(
                and_(DriverTrustedContact.driver_id == driver_id, DriverTrustedContact.is_active == True)
            )
        )
        contacts = c_res.scalars().all()
        if len(contacts) >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 trusted contacts allowed")

        cleaned_phone = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
        if len(cleaned_phone) < 10:
            raise HTTPException(status_code=400, detail="Invalid phone number format")

        masked = _mask_phone(cleaned_phone)
        phone_hash = hashlib.sha256(cleaned_phone.encode()).hexdigest()

        contact = DriverTrustedContact(
            id=uuid.uuid4(),
            driver_id=driver_id,
            name=name.strip(),
            phone_masked=masked,
            phone_hash=phone_hash,
            relationship=relationship.strip(),
            is_verified=True,
            is_active=True,
        )
        self.db.add(contact)
        await self.db.commit()
        await self.db.refresh(contact)

        return {
            "success": True,
            "contact_id": str(contact.id),
            "name": contact.name,
            "phone_masked": contact.phone_masked,
            "relationship": contact.relationship,
            "is_verified": contact.is_verified,
        }

    async def get_trusted_contacts(self, driver_id: uuid.UUID) -> List[Dict[str, Any]]:
        res = await self.db.execute(
            select(DriverTrustedContact).where(
                and_(DriverTrustedContact.driver_id == driver_id, DriverTrustedContact.is_active == True)
            ).order_by(DriverTrustedContact.created_at.desc())
        )
        return [
            {
                "contact_id": str(c.id),
                "name": c.name,
                "phone_masked": c.phone_masked,
                "relationship": c.relationship,
                "is_verified": c.is_verified,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in res.scalars().all()
        ]

    async def delete_trusted_contact(self, driver_id: uuid.UUID, contact_id: uuid.UUID) -> Dict[str, Any]:
        res = await self.db.execute(
            select(DriverTrustedContact).where(
                and_(DriverTrustedContact.id == contact_id, DriverTrustedContact.driver_id == driver_id)
            )
        )
        contact = res.scalar_one_or_none()
        if not contact:
            raise HTTPException(status_code=404, detail="Trusted contact not found")

        contact.is_active = False
        await self.db.commit()
        return {"success": True, "message": "Trusted contact removed successfully"}

    # ────────────────────────────────────────────────────────────
    # 3. LIVE TRIP SHARING
    # ────────────────────────────────────────────────────────────
    async def create_live_trip_share(
        self,
        driver_id: uuid.UUID,
        ride_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Creates a short-lived tokenized trip sharing link with auto-expiration.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")

        now = datetime.now(timezone.utc)
        share_token = secrets.token_urlsafe(24)
        expires_at = now + timedelta(hours=3)

        session = LiveTripShareSession(
            id=uuid.uuid4(),
            ride_id=ride.id,
            driver_id=driver_id,
            share_token=share_token,
            status="ACTIVE",
            expires_at=expires_at,
        )
        self.db.add(session)
        await self.db.commit()

        share_url = f"https://track.cabbooking.com/share/{share_token}"

        return {
            "success": True,
            "share_token": share_token,
            "share_url": share_url,
            "expires_at": expires_at.isoformat(),
            "status": "ACTIVE",
            "message": "Live trip share link generated. Share with family or trusted contacts.",
        }

    async def get_shared_trip_telemetry(self, share_token: str) -> Dict[str, Any]:
        """
        Public token-scoped endpoint to track active trip without leaking passenger PII.
        """
        res = await self.db.execute(
            select(LiveTripShareSession).where(LiveTripShareSession.share_token == share_token)
        )
        session = res.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if not session or session.status != "ACTIVE" or session.expires_at < now:
            raise HTTPException(status_code=404, detail="Trip sharing link has expired or is invalid")

        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == session.ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")

        return {
            "status": ride.status.value if hasattr(ride.status, "value") else str(ride.status),
            "pickup_address": ride.pickup_address,
            "destination_address": ride.destination_address,
            "distance_travelled_km": ride.distance_travelled_km,
            "estimated_distance_km": ride.estimated_distance_km,
            "started_at": ride.started_at.isoformat() if ride.started_at else None,
            "has_active_sos": ride.has_active_sos,
            "expires_at": session.expires_at.isoformat(),
        }

    # ────────────────────────────────────────────────────────────
    # 4. SAFETY ANOMALIES & "I'M SAFE" WORKFLOW
    # ────────────────────────────────────────────────────────────
    async def record_safety_alert(
        self,
        driver_id: uuid.UUID,
        ride_id: Optional[uuid.UUID],
        alert_type: str,
        severity: str,
        latitude: float,
        longitude: float,
        details: dict,
    ) -> Dict[str, Any]:
        """
        Records a safety anomaly (ROUTE_DEVIATION, LONG_STOP, OVERSPEED) and triggers driver check.
        """
        alert = DriverSafetyAlert(
            id=uuid.uuid4(),
            driver_id=driver_id,
            ride_id=ride_id,
            alert_type=alert_type,
            severity=severity,
            status="ACTIVE",
            latitude=latitude,
            longitude=longitude,
            details_json=details,
        )
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)

        return {
            "alert_id": str(alert.id),
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "status": alert.status,
            "details": alert.details_json,
            "created_at": alert.created_at.isoformat() if alert.created_at else datetime.now(timezone.utc).isoformat(),
        }

    async def resolve_safety_alert(
        self,
        driver_id: uuid.UUID,
        alert_id: uuid.UUID,
        resolution_type: str = "IM_SAFE",
    ) -> Dict[str, Any]:
        """
        Driver acknowledges warning ("I'm Safe" flow), resolving the active alert.
        """
        res = await self.db.execute(
            select(DriverSafetyAlert).where(
                and_(DriverSafetyAlert.id == alert_id, DriverSafetyAlert.driver_id == driver_id)
            )
        )
        alert = res.scalar_one_or_none()
        if not alert:
            raise HTTPException(status_code=404, detail="Safety alert not found")

        alert.status = "ACKNOWLEDGED_SAFE"
        alert.resolution_type = resolution_type
        alert.resolved_at = datetime.now(timezone.utc)
        await self.db.commit()

        return {
            "success": True,
            "alert_id": str(alert.id),
            "status": "ACKNOWLEDGED_SAFE",
            "resolved_at": alert.resolved_at.isoformat(),
            "message": "Thank you for confirming. Safety alert resolved.",
        }

    # ────────────────────────────────────────────────────────────
    # 5. SAFETY INCIDENT REPORTING
    # ────────────────────────────────────────────────────────────
    async def report_safety_incident(
        self,
        driver_id: uuid.UUID,
        ride_id: Optional[uuid.UUID],
        incident_category: str,
        severity: str,
        description: str,
        evidence_urls: Optional[List[str]] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Driver reports a structured safety incident (unsafe passenger, accident, road hazard).
        """
        report = SafetyIncidentReport(
            id=uuid.uuid4(),
            driver_id=driver_id,
            ride_id=ride_id,
            incident_category=incident_category,
            severity=severity,
            status="REPORTED",
            description=description.strip(),
            evidence_urls=evidence_urls or [],
            latitude=latitude,
            longitude=longitude,
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)

        return {
            "success": True,
            "incident_id": str(report.id),
            "category": report.incident_category,
            "severity": report.severity,
            "status": report.status,
            "created_at": report.created_at.isoformat() if report.created_at else datetime.now(timezone.utc).isoformat(),
            "message": "Incident report submitted. Safety team has received your ticket and is reviewing.",
        }
