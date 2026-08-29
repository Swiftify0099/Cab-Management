"""
Fanout Dispatch Engine — Broadcast Offers & Atomic Concurrent Winner Resolution.

Features:
  1. Customer Request Fanout:
     - Generates individual separate RideOffer records for Partner A, B, C, D...
     - Sets offer state to OFFERED (or PENDING).
  2. Partner Reject:
     - Sets specific offer state to REJECTED.
     - Customer RideRequest remains strictly in MATCHING status.
  3. Partner Accept (High-Concurrency Atomic Transaction):
     - PostgreSQL row-level locking via SELECT ... FOR UPDATE on RideRequest.
     - Conditional atomic state transition: exactly ONE winner assigned.
     - Automatically transitions all losing offers to REMOVED.
     - Emits realtime RIDE_REQUEST_REMOVED events to all losing partners.
  4. Offer Expiry & Cancellation:
     - Expired accepts (> expires_at) strictly rejected as EXPIRED.
     - Superseded / late accepts strictly rejected as REMOVED / SUPERSEDED.
"""

from __future__ import annotations

import asyncio
import hashlib
import random
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union

import structlog
from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Driver,
    DriverStatus,
    RideOffer,
    RideOfferStatus,
    RideRequest,
    RideRequestStatus,
    User,
    Vehicle,
)
from common.utils.redis_client import publish_event

logger = structlog.get_logger(__name__)

DEFAULT_OFFER_TIMEOUT_SEC = 180


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _is_expired(dt_val: Optional[datetime]) -> bool:
    if not dt_val:
        return False
    now = datetime.now(timezone.utc)
    if dt_val.tzinfo is None:
        dt_val = dt_val.replace(tzinfo=timezone.utc)
    return now > dt_val


class FanoutDispatchEngine:
    """
    High-concurrency Fanout Dispatch Engine.
    Handles multi-driver broadcast, partner reject isolation, and atomic PostgreSQL-locked winner resolution.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_fanout_offers(
        self,
        ride_request_id: Union[uuid.UUID, str],
        candidates: List[Dict[str, Any]],
        timeout_sec: int = DEFAULT_OFFER_TIMEOUT_SEC,
    ) -> List[RideOffer]:
        """
        Creates separate RideOffer records for each eligible partner candidate.
        Updates RideRequest status to MATCHING.
        Emits RIDE_REQUEST_NEW event to each partner.
        """
        req_uuid = uuid.UUID(str(ride_request_id))
        ride_res = await self.db.execute(select(RideRequest).where(RideRequest.id == req_uuid))
        ride_req = ride_res.scalar_one_or_none()
        if not ride_req:
            raise ValueError(f"RideRequest {ride_request_id} not found")

        # Set RideRequest to MATCHING status
        ride_req.status = RideRequestStatus.MATCHING
        now = _now_utc()
        expires_at = now + timedelta(seconds=timeout_sec)

        total_fare = float(ride_req.estimated_fare or 0.0)
        commission = round(total_fare * 0.20, 2)
        driver_earning = round(total_fare - commission, 2)

        created_offers: List[RideOffer] = []

        for cand in candidates:
            driver_id_val = uuid.UUID(str(cand["driver_id"]))
            user_id_str = str(cand.get("user_id", cand["driver_id"]))
            dist_km = float(cand.get("distance_km", 1.0))
            eta_min = int(cand.get("eta_min", max(int(dist_km / 25.0 * 60), 2)))

            offer = RideOffer(
                id=uuid.uuid4(),
                ride_request_id=ride_req.id,
                driver_id=driver_id_val,
                status=RideOfferStatus.OFFERED,
                pickup_distance_km=dist_km,
                pickup_eta_min=eta_min,
                estimated_fare=Decimal(str(total_fare)),
                platform_commission=Decimal(str(commission)),
                estimated_earning=Decimal(str(driver_earning)),
                offered_at=now,
                expires_at=expires_at,
                available_seats=int(cand.get("seat_capacity", 4)),
            )
            self.db.add(offer)
            created_offers.append(offer)

            # Publish realtime notification to driver
            offer_payload = {
                "event": "RIDE_REQUEST_NEW",
                "offer_id": str(offer.id),
                "ride_request_id": str(ride_req.id),
                "driver_id": str(driver_id_val),
                "pickup": {
                    "address": ride_req.pickup_address,
                    "lat": ride_req.pickup_lat,
                    "lng": ride_req.pickup_lng,
                    "distance_km": dist_km,
                    "eta_min": eta_min,
                },
                "destination": {
                    "address": ride_req.destination_address,
                    "lat": ride_req.destination_lat,
                    "lng": ride_req.destination_lng,
                },
                "fare": total_fare,
                "driver_earning": driver_earning,
                "expires_at": expires_at.isoformat(),
                "timeout_sec": timeout_sec,
            }
            try:
                await publish_event(f"driver:{user_id_str}:events", offer_payload)
            except Exception as e:
                logger.warning("Failed to publish driver offer event", error=str(e))

        await self.db.commit()

        logger.info(
            "fanout_offers_created",
            ride_request_id=str(ride_req.id),
            offers_count=len(created_offers),
        )
        return created_offers

    async def accept_offer_atomic(
        self,
        driver_identifier: Union[uuid.UUID, str],
        offer_identifier: Union[uuid.UUID, str],
    ) -> Dict[str, Any]:
        """
        Atomic Accept Transaction:
        1. Resolves driver (by driver_id or user_id).
        2. Validates offer existence and expiration.
        3. Acquires row lock on RideRequest via SELECT ... FOR UPDATE.
        4. Conditional check: if RideRequest already has assigned driver -> reject as REMOVED / SUPERSEDED.
        5. Assigns driver, sets OTP, updates winning offer to ACCEPTED.
        6. Updates ALL other active offers for this ride request to REMOVED.
        7. Commits transaction atomically.
        8. Emits RIDE_REQUEST_REMOVED events to all losing partners.
        """
        now = _now_utc()

        # 1. Resolve driver profile
        drv_id_uuid = uuid.UUID(str(driver_identifier))
        d_res = await self.db.execute(
            select(Driver).where(
                (Driver.id == drv_id_uuid) | (Driver.user_id == drv_id_uuid)
            )
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            return {
                "success": False,
                "status": "driver_not_found",
                "message": "Driver profile not found",
            }

        # 2. Lookup Offer
        off_uuid = uuid.UUID(str(offer_identifier))
        off_res = await self.db.execute(
            select(RideOffer).where(
                (RideOffer.id == off_uuid) & (RideOffer.driver_id == driver.id)
            )
        )
        offer = off_res.scalar_one_or_none()

        # Fallback: lookup by ride_request_id
        if not offer:
            off_res2 = await self.db.execute(
                select(RideOffer).where(
                    (RideOffer.ride_request_id == off_uuid) & (RideOffer.driver_id == driver.id)
                ).order_by(RideOffer.created_at.desc())
            )
            offer = off_res2.scalar_one_or_none()

        if not offer:
            return {
                "success": False,
                "status": "offer_not_found",
                "message": "Ride offer not found or does not belong to driver",
            }

        # 3. Check Expiry
        if _is_expired(offer.expires_at):
            offer.status = RideOfferStatus.EXPIRED
            offer.responded_at = now
            await self.db.commit()
            return {
                "success": False,
                "status": "expired",
                "message": "Offer has expired",
                "offer_id": str(offer.id),
            }

        # 4. Check already non-open offer status (e.g. Duplicate accept or already rejected/removed)
        if offer.status in (RideOfferStatus.ACCEPTED,):
            return {
                "success": False,
                "status": "already_accepted",
                "message": "Offer already accepted by you",
                "offer_id": str(offer.id),
            }
        if offer.status in (RideOfferStatus.REMOVED, RideOfferStatus.SUPERSEDED, RideOfferStatus.REJECTED, RideOfferStatus.CANCELLED):
            return {
                "success": False,
                "status": offer.status.value.lower(),
                "message": f"Offer is {offer.status.value.lower()}",
                "offer_id": str(offer.id),
            }

        # 5. ATOMIC ROW-LEVEL LOCK ON RIDEREQUEST (SELECT ... FOR UPDATE)
        req_lock = await self.db.execute(
            select(RideRequest)
            .where(RideRequest.id == offer.ride_request_id)
            .with_for_update()
        )
        ride_req = req_lock.scalar_one_or_none()

        if not ride_req:
            return {
                "success": False,
                "status": "request_not_found",
                "message": "Ride request not found",
            }

        # Check if another driver already won or ride is cancelled/expired
        if ride_req.assigned_driver_id is not None or ride_req.status not in (
            RideRequestStatus.CREATED,
            RideRequestStatus.MATCHING,
            RideRequestStatus.DISPATCHING,
            RideRequestStatus.OFFERED,
        ):
            # Another driver already won! Mark this losing offer as REMOVED
            offer.status = RideOfferStatus.REMOVED
            offer.responded_at = now
            await self.db.commit()

            logger.info(
                "partner_accept_rejected_already_won",
                driver_id=str(driver.id),
                offer_id=str(offer.id),
                ride_request_id=str(ride_req.id),
                winning_driver_id=str(ride_req.assigned_driver_id),
            )
            return {
                "success": False,
                "status": "removed",
                "message": "Ride already assigned to another driver",
                "offer_id": str(offer.id),
            }

        # 6. EXACTLY ONE WINNER: Assign winning driver
        ride_req.status = RideRequestStatus.ASSIGNED
        ride_req.assigned_driver_id = driver.id
        ride_req.assigned_at = now

        # Generate 4-digit start OTP / PIN if not set
        if not getattr(ride_req, "start_pin_plain", None):
            start_pin = f"{random.randint(1000, 9999)}"
            ride_req.start_pin_plain = start_pin
            ride_req.start_pin_hash = hashlib.sha256(start_pin.encode("utf-8")).hexdigest()
        else:
            start_pin = ride_req.start_pin_plain

        # Set winning offer status
        offer.status = RideOfferStatus.ACCEPTED
        offer.responded_at = now

        # 7. Atomically mark all other open offers as REMOVED
        other_offers_res = await self.db.execute(
            select(RideOffer, Driver.user_id)
            .join(Driver, RideOffer.driver_id == Driver.id)
            .where(
                and_(
                    RideOffer.ride_request_id == ride_req.id,
                    RideOffer.id != offer.id,
                    RideOffer.status.in_([RideOfferStatus.OFFERED, RideOfferStatus.PENDING]),
                )
            )
        )
        losing_rows = other_offers_res.all()

        losing_driver_ids: List[str] = []
        losing_user_ids: List[str] = []

        for losing_off, u_id in losing_rows:
            losing_off.status = RideOfferStatus.REMOVED
            losing_off.responded_at = now
            losing_driver_ids.append(str(losing_off.driver_id))
            if u_id:
                losing_user_ids.append(str(u_id))

        # Commit atomic transaction
        await self.db.commit()

        logger.info(
            "fanout_winner_assigned_atomic",
            winner_driver_id=str(driver.id),
            ride_request_id=str(ride_req.id),
            winning_offer_id=str(offer.id),
            losing_offers_count=len(losing_driver_ids),
        )

        # 8. Emit realtime RIDE_REQUEST_REMOVED events to all losing partners
        removed_event = {
            "event": "RIDE_REQUEST_REMOVED",
            "ride_request_id": str(ride_req.id),
            "reason": "ASSIGNED_TO_ANOTHER_DRIVER",
            "winner_assigned_at": now.isoformat(),
        }
        for u_id in losing_user_ids:
            try:
                await publish_event(f"driver:{u_id}:events", removed_event)
            except Exception:
                pass
        for d_id in losing_driver_ids:
            if d_id not in losing_user_ids:
                try:
                    await publish_event(f"driver:{d_id}:events", removed_event)
                except Exception:
                    pass

        # 9. Fetch vehicle details for customer payload
        veh_res = await self.db.execute(
            select(Vehicle).where(and_(Vehicle.driver_id == driver.id, Vehicle.is_active == True))
        )
        active_veh = veh_res.scalar_one_or_none()
        if not active_veh:
            veh_res_any = await self.db.execute(
                select(Vehicle).where(Vehicle.driver_id == driver.id)
            )
            active_veh = veh_res_any.scalar_one_or_none()

        masked_phone = f"+91 •••• ••{driver.phone[-4:]}" if driver.phone and len(driver.phone) >= 4 else "+91 ••••• ••••"
        driver_payload = {
            "id": str(driver.id),
            "driver_id": str(driver.id),
            "full_name": driver.full_name,
            "name": driver.full_name,
            "rating": float(driver.rating or 4.85),
            "total_trips": getattr(driver, "total_trips", 0) or 0,
            "profile_photo": driver.profile_photo,
            "photo": driver.profile_photo,
            "phone": masked_phone,
            "phone_masked": masked_phone,
            "eta_min": offer.pickup_eta_min or 5,
            "distance_km": offer.pickup_distance_km or 2.0,
        }

        vehicle_payload = {
            "make": active_veh.make if active_veh else "Standard",
            "model": active_veh.model if active_veh else "Cab",
            "variant": f"{active_veh.make} {active_veh.model}" if active_veh else "Standard Cab",
            "color": active_veh.color if active_veh else "White",
            "registration_number": active_veh.registration_number if active_veh else "MH-12-CAB",
            "plate": active_veh.registration_number if active_veh else "MH-12-CAB",
            "vehicle_type": str(active_veh.vehicle_type.value) if active_veh and hasattr(active_veh.vehicle_type, "value") else str(active_veh.vehicle_type if active_veh else "SEDAN"),
            "seat_capacity": active_veh.seat_capacity if active_veh else 4,
        }

        # 10. Emit RIDE_ASSIGNED & TRIP_ACCEPTED to customer
        cust_payload = {
            "event": "RIDE_ASSIGNED",
            "ride_request_id": str(ride_req.id),
            "booking_id": str(ride_req.id),
            "trip_id": str(ride_req.id),
            "status": "ASSIGNED",
            "driver": driver_payload,
            "vehicle": vehicle_payload,
            "driver_id": str(driver.id),
            "driver_name": driver.full_name,
            "start_pin": start_pin,
            "start_pin_plain": start_pin,
            "otp": start_pin,
            "pickup_eta_minutes": offer.pickup_eta_min or 5,
            "pickup_eta_min": offer.pickup_eta_min or 5,
            "pickup_address": ride_req.pickup_address,
            "pickup_lat": float(ride_req.pickup_lat),
            "pickup_lng": float(ride_req.pickup_lng),
            "destination_address": ride_req.destination_address,
            "destination_lat": float(ride_req.destination_lat),
            "destination_lng": float(ride_req.destination_lng),
            "fare": float(ride_req.estimated_fare or 0.0),
        }
        trip_accepted_payload = {
            **cust_payload,
            "event": "TRIP_ACCEPTED",
        }

        cust_id_str = str(ride_req.customer_id)
        req_id_str = str(ride_req.id)
        for ch in [
            f"customer:{cust_id_str}:events",
            f"user:{cust_id_str}:events",
            f"trip:{req_id_str}",
            f"ride:{req_id_str}",
            f"trip:{req_id_str}:events",
            f"ride:{req_id_str}:events",
        ]:
            try:
                await publish_event(ch, cust_payload)
                await publish_event(ch, trip_accepted_payload)
            except Exception:
                pass

        return {
            "success": True,
            "status": "accepted",
            "winner_driver_id": str(driver.id),
            "ride_request_id": str(ride_req.id),
            "offer_id": str(offer.id),
            "start_pin": start_pin,
            "removed_offers_count": len(losing_driver_ids),
        }

    async def reject_offer(
        self,
        driver_identifier: Union[uuid.UUID, str],
        offer_identifier: Union[uuid.UUID, str],
        rejection_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Partner Rejection:
        - Updates target offer to REJECTED.
        - Keeps RideRequest strictly in MATCHING status for remaining partners.
        """
        now = _now_utc()
        drv_id_uuid = uuid.UUID(str(driver_identifier))
        d_res = await self.db.execute(
            select(Driver).where(
                (Driver.id == drv_id_uuid) | (Driver.user_id == drv_id_uuid)
            )
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            return {
                "success": False,
                "status": "driver_not_found",
                "message": "Driver profile not found",
            }

        off_uuid = uuid.UUID(str(offer_identifier))
        off_res = await self.db.execute(
            select(RideOffer).where(
                (RideOffer.id == off_uuid) & (RideOffer.driver_id == driver.id)
            )
        )
        offer = off_res.scalar_one_or_none()
        if not offer:
            off_res2 = await self.db.execute(
                select(RideOffer).where(
                    (RideOffer.ride_request_id == off_uuid) & (RideOffer.driver_id == driver.id)
                ).order_by(RideOffer.created_at.desc())
            )
            offer = off_res2.scalar_one_or_none()

        if not offer:
            return {
                "success": False,
                "status": "offer_not_found",
                "message": "Ride offer not found",
            }

        offer.status = RideOfferStatus.REJECTED
        offer.responded_at = now
        offer.response_reason = rejection_reason
        await self.db.commit()

        # Verify RideRequest status remains MATCHING
        req_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == offer.ride_request_id)
        )
        ride_req = req_res.scalar_one_or_none()

        logger.info(
            "partner_offer_rejected",
            driver_id=str(driver.id),
            offer_id=str(offer.id),
            ride_request_id=str(offer.ride_request_id),
            request_status=ride_req.status.value if ride_req else "unknown",
        )

        return {
            "success": True,
            "status": "rejected",
            "offer_id": str(offer.id),
            "ride_request_id": str(offer.ride_request_id),
            "request_status": ride_req.status.value if ride_req else "unknown",
        }

    async def expire_stale_offers(
        self,
        ride_request_id: Optional[Union[uuid.UUID, str]] = None,
    ) -> int:
        """
        Expires open offers past their expires_at deadline.
        """
        now = _now_utc()
        query = (
            update(RideOffer)
            .where(
                and_(
                    RideOffer.status.in_([RideOfferStatus.OFFERED, RideOfferStatus.PENDING]),
                    RideOffer.expires_at <= now,
                )
            )
            .values(status=RideOfferStatus.EXPIRED, responded_at=now)
        )
        if ride_request_id:
            req_uuid = uuid.UUID(str(ride_request_id))
            query = query.where(RideOffer.ride_request_id == req_uuid)

        res = await self.db.execute(query)
        await self.db.commit()
        return res.rowcount or 0

    async def cancel_fanout(
        self,
        ride_request_id: Union[uuid.UUID, str],
        reason: Optional[str] = None,
    ) -> int:
        """
        Cancels all open offers when customer cancels the ride request.
        """
        now = _now_utc()
        req_uuid = uuid.UUID(str(ride_request_id))
        res = await self.db.execute(
            update(RideOffer)
            .where(
                and_(
                    RideOffer.ride_request_id == req_uuid,
                    RideOffer.status.in_([RideOfferStatus.OFFERED, RideOfferStatus.PENDING]),
                )
            )
            .values(
                status=RideOfferStatus.CANCELLED,
                responded_at=now,
                response_reason=reason or "Customer cancelled request",
            )
        )
        await self.db.commit()
        return res.rowcount or 0
