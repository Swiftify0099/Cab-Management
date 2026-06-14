"""
Parcel Service  Phase 7.
Intercity parcel delivery booking + tracking through trip lifecycle.

Features:
  - Book parcel on an existing shared trip (adds to trip seat-equivalent)
  - Upload sender/receiver photos and proof images
  - Parcel tracking: PENDING  PICKUP_DONE  IN_TRANSIT  DELIVERED
  - Weight-based pricing
  - OTP-based delivery confirmation
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

import aiofiles
import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Parcel, ParcelStatus, Trip, TripStatus,
)
from common.utils.redis_client import publish_event, cache_set

logger = structlog.get_logger(__name__)

UPLOAD_DIR = "/var/www/uploads/parcels"
MAX_FILE_SIZE_MB = 10
PRICE_PER_KG = 15.0        # 15/kg base
MIN_PARCEL_FARE = 80.0     # minimum 80


class ParcelService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def calculate_fare(
        self,
        weight_kg: float,
        distance_km: float,
        fragile: bool = False,
        urgent: bool = False,
    ) -> Decimal:
        """
        Fare = max(80, weight_kg  15 + distance_based_fee)
        Fragile: +20%  | Urgent: +30%
        """
        base = weight_kg * PRICE_PER_KG
        distance_fee = distance_km * 0.5  # 0.5/km
        total = max(base + distance_fee, MIN_PARCEL_FARE)

        if fragile:
            total *= 1.20
        if urgent:
            total *= 1.30

        return Decimal(str(round(total, 2)))

    async def create_parcel(
        self,
        customer_id: str,
        trip_id: str,
        sender_name: str,
        sender_phone: str,
        receiver_name: str,
        receiver_phone: str,
        receiver_address: str,
        weight_kg: float,
        description: str,
        fragile: bool = False,
        urgent: bool = False,
        declared_value: Optional[float] = None,
    ) -> dict:
        """Book a parcel shipment on a shared trip."""
        # Validate trip is published and has parcel capacity
        trip = await self._get_trip(trip_id)
        if not trip:
            raise ValueError("Trip not found")
        if trip.status not in (TripStatus.PUBLISHED, TripStatus.IN_PROGRESS):
            raise ValueError(f"Trip is not available for parcels (status: {trip.status})")

        # Generate delivery OTP (4-digit)
        delivery_otp = str(uuid.uuid4().int)[:4]
        fare = self.calculate_fare(
            weight_kg=weight_kg,
            distance_km=trip.distance_km or 100.0,
            fragile=fragile,
            urgent=urgent,
        )

        # Generate tracking number: CB + date + random
        tracking_number = f"CB{datetime.utcnow().strftime('%y%m%d')}{uuid.uuid4().hex[:6].upper()}"

        parcel = Parcel(
            customer_id=UUID(customer_id),
            trip_id=UUID(trip_id),
            driver_id=trip.driver_id,
            tracking_number=tracking_number,
            sender_name=sender_name,
            sender_phone=sender_phone,
            receiver_name=receiver_name,
            receiver_phone=receiver_phone,
            receiver_address=receiver_address,
            weight_kg=weight_kg,
            description=description,
            is_fragile=fragile,
            is_urgent=urgent,
            declared_value=Decimal(str(declared_value)) if declared_value else None,
            fare=fare,
            status=ParcelStatus.PENDING,
            delivery_otp=delivery_otp,
        )
        self.db.add(parcel)
        await self.db.commit()
        await self.db.refresh(parcel)

        # Cache tracking info in Redis
        await cache_set(
            f"parcel:tracking:{tracking_number}",
            {"status": "pending", "tracking_number": tracking_number, "trip_id": trip_id},
            expire_seconds=86400 * 7,
        )

        # Notify Driver of new parcel request
        await publish_event(
            f"driver:{trip.driver_id}:events",
            {
                "event": "NEW_PARCEL_REQUEST",
                "parcel_id": str(parcel.id),
                "tracking_number": tracking_number,
                "pickup": "Pickup Area",
                "drop": parcel.receiver_address,
                "weight": parcel.weight_kg,
                "fare": float(fare),
                "sender": parcel.sender_name,
            }
        )

        logger.info(
            "Parcel booked",
            parcel_id=str(parcel.id),
            tracking=tracking_number,
            fare=str(fare),
        )

        return {
            "parcel_id": str(parcel.id),
            "tracking_number": tracking_number,
            "fare": float(fare),
            "status": "pending",
            "delivery_otp": delivery_otp,  # shown only to customer
            "trip": {
                "from": "Pickup Area",
                "to": "Destination Area",
                "departure_time": trip.departure_time.isoformat(),
            },
        }

    async def update_status(
        self,
        parcel_id: str,
        new_status: str,
        driver_id: str,
        delivery_otp: Optional[str] = None,
        image_path: Optional[str] = None,
    ) -> dict:
        """Driver updates parcel status. DELIVERED requires OTP."""
        result = await self.db.execute(
            select(Parcel).where(Parcel.id == UUID(parcel_id))
        )
        parcel = result.scalar_one_or_none()
        if not parcel:
            raise ValueError("Parcel not found")

        if str(parcel.driver_id) != driver_id:
            raise ValueError("You are not the driver for this parcel")

        if new_status == ParcelStatus.DELIVERED.value:
            if delivery_otp != parcel.delivery_otp:
                raise ValueError("Invalid delivery OTP")
            parcel.delivered_at = datetime.utcnow()

        parcel.status = ParcelStatus(new_status)
        if image_path:
            parcel.proof_image = image_path
        await self.db.commit()

        # Notify customer
        await publish_event(
            f"customer:{parcel.customer_id}:events",
            {
                "event": "PARCEL_STATUS_UPDATE",
                "parcel_id": parcel_id,
                "tracking_number": parcel.tracking_number,
                "status": new_status,
            },
        )

        # Update Redis cache
        await cache_set(
            f"parcel:tracking:{parcel.tracking_number}",
            {"status": new_status, "tracking_number": parcel.tracking_number},
            expire_seconds=86400 * 7,
        )

        return {"parcel_id": parcel_id, "status": new_status}

    async def track_parcel(self, tracking_number: str) -> dict:
        """Public tracking  returns parcel status without OTP."""
        result = await self.db.execute(
            select(Parcel).where(Parcel.tracking_number == tracking_number)
        )
        parcel = result.scalar_one_or_none()
        if not parcel:
            raise ValueError("Parcel not found")

        trip = await self._get_trip(str(parcel.trip_id))

        return {
            "tracking_number": tracking_number,
            "status": parcel.status.value,
            "sender_name": parcel.sender_name,
            "receiver_name": parcel.receiver_name,
            "weight_kg": parcel.weight_kg,
            "fare": float(parcel.fare),
            "is_fragile": parcel.is_fragile,
            "trip": {
                "from": "Pickup Area",
                "to": "Destination Area",
                "departure_time": trip.departure_time.isoformat() if trip else None,
                "status": trip.status.value if trip else "unknown",
            },
            "delivered_at": parcel.delivered_at.isoformat() if parcel.delivered_at else None,
        }

    async def get_customer_parcels(self, customer_id: str, page: int = 1) -> list:
        """Get customer's parcel history."""
        result = await self.db.execute(
            select(Parcel)
            .where(Parcel.customer_id == UUID(customer_id))
            .order_by(Parcel.created_at.desc())
            .offset((page - 1) * 20)
            .limit(20)
        )
        parcels = result.scalars().all()
        return [
            {
                "id": str(p.id),
                "tracking_number": p.tracking_number,
                "trip_id": str(p.trip_id),
                "status": p.status.value,
                "sender_name": p.sender_name,
                "receiver_name": p.receiver_name,
                "fare": float(p.fare),
                "weight_kg": p.weight_kg,
                "created_at": p.created_at.isoformat(),
            }
            for p in parcels
        ]

    async def _get_trip(self, trip_id: str) -> Optional[Trip]:
        result = await self.db.execute(
            select(Trip).where(Trip.id == UUID(trip_id))
        )
        return result.scalar_one_or_none()

    async def get_driver_requests(self, driver_id: str) -> list:
        """Get pending parcel requests assigned to this driver's active trips."""
        result = await self.db.execute(
            select(Parcel)
            .where(
                and_(
                    Parcel.driver_id == UUID(driver_id),
                    Parcel.status == ParcelStatus.PENDING,
                )
            )
            .order_by(Parcel.created_at.desc())
        )
        parcels = result.scalars().all()
        
        requests = []
        for p in parcels:
            trip = await self._get_trip(str(p.trip_id))
            requests.append({
                "id": str(p.id),
                "pickup": "Pickup Area",  # Mocked, real app would reverse geocode trip pickup
                "drop": p.receiver_address,
                "weight": p.weight_kg,
                "fare": float(p.fare),
                "distance": trip.distance_km if trip else 0,
                "sender": p.sender_name,
            })
        return requests

    async def respond_to_request(self, parcel_id: str, driver_id: str, action: str) -> dict:
        """Driver accepts or declines a parcel request."""
        result = await self.db.execute(
            select(Parcel).where(Parcel.id == UUID(parcel_id))
        )
        parcel = result.scalar_one_or_none()
        if not parcel:
            raise ValueError("Parcel request not found")

        if str(parcel.driver_id) != driver_id:
            raise ValueError("You are not authorized to respond to this request")
            
        if parcel.status != ParcelStatus.PENDING:
            raise ValueError(f"Parcel is already {parcel.status.value}")

        if action == "accept":
            parcel.status = ParcelStatus.ACCEPTED
        elif action == "decline":
            parcel.status = ParcelStatus.REJECTED
        else:
            raise ValueError("Invalid action. Must be 'accept' or 'decline'")

        await self.db.commit()
        
        # Notify customer
        await publish_event(
            f"customer:{parcel.customer_id}:events",
            {
                "event": "PARCEL_REQUEST_RESPONDED",
                "parcel_id": parcel_id,
                "tracking_number": parcel.tracking_number,
                "status": parcel.status.value,
            },
        )
        
        return {"parcel_id": parcel_id, "status": parcel.status.value}
