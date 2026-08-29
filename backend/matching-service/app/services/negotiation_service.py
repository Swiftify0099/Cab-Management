"""
Feature 14: Own Fare & Dynamic Negotiation Engine.

Customer-Suggested Fare, Multi-Partner Bidding, Interactive Multi-Round Counter-Offers,
Authoritative Booking Settlement, and Immutable Audit Trails.

Architecture Invariants:
1. Every offer / counter-offer is an IMMUTABLE row in `negotiation_offers`.
2. Previous offers are never overwritten; status transitions to ACCEPTED, REJECTED, SUPERSEDED, EXPIRED, or CANCELLED.
3. Once a winning offer is ACCEPTED (by either Customer or Partner), the backend atomically:
   - Sets the ride's authoritative `final_fare` / `estimated_fare` = accepted offer amount.
   - Assigns the driver (`status = ASSIGNED`, `assigned_driver_id = driver.id`).
   - Calculates platform commission (10%) and driver net earnings (90%).
   - Closes the negotiation session, invalidating/superseding all competing offers.
   - Emits `NEGOTIATION_ASSIGNED` and `ride:assigned` events.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

import structlog
from fastapi import HTTPException
from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Driver,
    DriverStatus,
    NegotiationOffer,
    RideEventLog,
    RideOffer,
    RideOfferStatus,
    RideRequest,
    RideRequestStatus,
    User,
    Vehicle,
)
from common.utils.redis_client import publish_event

logger = structlog.get_logger(__name__)

DEFAULT_OFFER_TTL_SECONDS = 120  # 2 minutes per offer round
PLATFORM_COMMISSION_RATE = Decimal("0.10")  # 10% platform commission


class NegotiationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_customer_initial_offer(
        self,
        customer_user_id: str,
        ride_request_id: uuid.UUID,
        suggested_amount: float,
        candidate_driver_user_ids: Optional[List[str]] = None,
        ttl_seconds: int = DEFAULT_OFFER_TTL_SECONDS,
    ) -> List[Dict[str, Any]]:
        """
        Customer sends initial suggested fare offer to candidate partners.
        Creates an immutable NegotiationOffer for each candidate driver.
        """
        cust_uuid = uuid.UUID(str(customer_user_id))
        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == ride_request_id).with_for_update()
        )
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.customer_id != cust_uuid:
            raise HTTPException(status_code=403, detail="Unauthorized for this ride request")

        if ride.status not in (RideRequestStatus.MATCHING, RideRequestStatus.CREATED, RideRequestStatus.DISPATCHING):
            raise HTTPException(status_code=400, detail=f"Cannot negotiate on ride in {ride.status.value} status")

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=ttl_seconds)
        amount_dec = Decimal(str(round(suggested_amount, 2)))

        ride.pricing_mode = "NEGOTIATED"
        ride.estimated_fare = amount_dec
        if hasattr(ride, "customer_offer_amount"):
            try:
                setattr(ride, "customer_offer_amount", float(amount_dec))
            except Exception:
                pass

        created_offers: List[NegotiationOffer] = []
        driver_uids = candidate_driver_user_ids or []

        if not driver_uids:
            # Broadcast to a global pool offer placeholder
            off = NegotiationOffer(
                id=uuid.uuid4(),
                ride_request_id=ride.id,
                sender_type="CUSTOMER",
                sender_id=cust_uuid,
                receiver_type="PARTNER",
                receiver_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),  # Global broadcast
                amount=amount_dec,
                round_number=1,
                status="OFFERED",
                expires_at=expires_at,
            )
            self.db.add(off)
            created_offers.append(off)
        else:
            for d_uid_str in driver_uids:
                d_uid = uuid.UUID(d_uid_str)
                off = NegotiationOffer(
                    id=uuid.uuid4(),
                    ride_request_id=ride.id,
                    sender_type="CUSTOMER",
                    sender_id=cust_uuid,
                    receiver_type="PARTNER",
                    receiver_id=d_uid,
                    amount=amount_dec,
                    round_number=1,
                    status="OFFERED",
                    expires_at=expires_at,
                )
                self.db.add(off)
                created_offers.append(off)

        # Audit Log
        self.db.add(
            RideEventLog(
                id=uuid.uuid4(),
                ride_id=ride.id,
                event_type="NEGOTIATION_CUSTOMER_OFFER_SENT",
                actor_id=cust_uuid,
                actor_role="customer",
                details={
                    "amount": float(amount_dec),
                    "offers_count": len(created_offers),
                    "expires_at": expires_at.isoformat(),
                },
            )
        )

        await self.db.commit()

        # Emit realtime events to candidate drivers
        for off in created_offers:
            payload = {
                "event": "NEGOTIATION_CUSTOMER_OFFER",
                "offer_id": str(off.id),
                "ride_request_id": str(ride.id),
                "amount": float(off.amount),
                "pickup_address": ride.pickup_address,
                "destination_address": ride.destination_address,
                "expires_at": off.expires_at.isoformat(),
            }
            if str(off.receiver_id) != "00000000-0000-0000-0000-000000000000":
                try:
                    await publish_event(f"driver:{str(off.receiver_id)}:events", payload)
                except Exception:
                    pass

        return [
            {
                "offer_id": str(o.id),
                "ride_request_id": str(o.ride_request_id),
                "sender_type": o.sender_type,
                "receiver_id": str(o.receiver_id),
                "amount": float(o.amount),
                "round_number": o.round_number,
                "status": o.status,
                "expires_at": o.expires_at.isoformat(),
            }
            for o in created_offers
        ]

    async def partner_accept_offer(
        self,
        driver_user_id: str,
        offer_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Partner accepts customer's offer.
        Atomically assigns partner, invalidates competing offers, calculates commission, and closes negotiation.
        """
        drv_uid = uuid.UUID(str(driver_user_id))
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == drv_uid))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # Atomic Row Lock on Offer
        o_res = await self.db.execute(
            select(NegotiationOffer).where(NegotiationOffer.id == offer_id).with_for_update()
        )
        offer = o_res.scalar_one_or_none()
        if not offer:
            raise HTTPException(status_code=404, detail="Negotiation offer not found")

        # Atomic Row Lock on RideRequest
        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == offer.ride_request_id).with_for_update()
        )
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.status in (RideRequestStatus.ASSIGNED, RideRequestStatus.PICKUP, RideRequestStatus.IN_PROGRESS, RideRequestStatus.COMPLETED):
            return {
                "success": False,
                "message": "Ride has already been assigned to another driver.",
                "assigned": False,
            }

        if ride.status == RideRequestStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Ride request has been cancelled.")

        now = datetime.now(timezone.utc)
        exp_ts = offer.expires_at
        if exp_ts.tzinfo is None:
            exp_ts = exp_ts.replace(tzinfo=timezone.utc)

        if now > exp_ts:
            offer.status = "EXPIRED"
            await self.db.commit()
            raise HTTPException(status_code=400, detail="Offer has expired.")

        if offer.status != "OFFERED":
            raise HTTPException(status_code=400, detail=f"Offer is already in {offer.status} status.")

        # Accept Offer
        offer.status = "ACCEPTED"
        offer.responded_at = now

        # Invalidate / Supersede all competing offers for this ride
        all_comp_res = await self.db.execute(
            select(NegotiationOffer).where(
                and_(
                    NegotiationOffer.ride_request_id == ride.id,
                    NegotiationOffer.id != offer.id,
                    NegotiationOffer.status.in_(["OFFERED", "PENDING"]),
                )
            ).with_for_update()
        )
        comp_offers = all_comp_res.scalars().all()
        for comp in comp_offers:
            comp.status = "SUPERSEDED"
            comp.responded_at = now
            comp.rejection_reason = "Another offer accepted"

        # Authoritative Financial Reconciliation
        final_fare = offer.amount
        commission = round(final_fare * PLATFORM_COMMISSION_RATE, 2)
        driver_net = round(final_fare - commission, 2)

        # Update Ride Request State
        ride.status = RideRequestStatus.ASSIGNED
        ride.assigned_driver_id = driver.id
        ride.assigned_at = now
        ride.pricing_mode = "NEGOTIATED"
        ride.final_fare = final_fare
        ride.estimated_fare = final_fare
        ride.platform_commission = commission
        ride.driver_earning = driver_net

        # Audit Event Log
        self.db.add(
            RideEventLog(
                id=uuid.uuid4(),
                ride_id=ride.id,
                event_type="NEGOTIATION_ACCEPTED_BY_PARTNER",
                actor_id=drv_uid,
                actor_role="driver",
                details={
                    "offer_id": str(offer.id),
                    "final_fare": float(final_fare),
                    "commission": float(commission),
                    "driver_earning": float(driver_net),
                },
            )
        )

        await self.db.commit()

        # Emit Realtime Events to Customer and Partner
        assigned_payload = {
            "event": "NEGOTIATION_ASSIGNED",
            "ride_request_id": str(ride.id),
            "driver_id": str(driver.id),
            "driver_name": driver.full_name,
            "final_fare": float(final_fare),
            "commission": float(commission),
            "driver_earning": float(driver_net),
        }
        try:
            await publish_event(f"customer:{str(ride.customer_id)}:events", assigned_payload)
            await publish_event(f"driver:{str(drv_uid)}:events", assigned_payload)
            await publish_event(f"trip:{str(ride.id)}:events", assigned_payload)
        except Exception:
            pass

        return {
            "success": True,
            "ride_id": str(ride.id),
            "offer_id": str(offer.id),
            "status": "ACCEPTED",
            "final_fare": float(final_fare),
            "commission": float(commission),
            "driver_earning": float(driver_net),
            "message": "Offer accepted and ride successfully assigned.",
        }

    async def partner_send_counter_offer(
        self,
        driver_user_id: str,
        parent_offer_id: uuid.UUID,
        counter_amount: float,
        ttl_seconds: int = DEFAULT_OFFER_TTL_SECONDS,
    ) -> Dict[str, Any]:
        """
        Partner sends counter-offer to customer.
        Marks parent offer SUPERSEDED and creates new immutable NegotiationOffer.
        """
        drv_uid = uuid.UUID(str(driver_user_id))
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == drv_uid))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        p_res = await self.db.execute(
            select(NegotiationOffer).where(NegotiationOffer.id == parent_offer_id).with_for_update()
        )
        parent_offer = p_res.scalar_one_or_none()
        if not parent_offer:
            raise HTTPException(status_code=404, detail="Parent offer not found")

        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == parent_offer.ride_request_id).with_for_update()
        )
        ride = r_res.scalar_one_or_none()
        if not ride or ride.status not in (RideRequestStatus.MATCHING, RideRequestStatus.CREATED, RideRequestStatus.DISPATCHING):
            raise HTTPException(status_code=400, detail="Ride is no longer open for negotiation.")

        now = datetime.now(timezone.utc)
        parent_offer.status = "SUPERSEDED"
        parent_offer.responded_at = now

        amount_dec = Decimal(str(round(counter_amount, 2)))
        expires_at = now + timedelta(seconds=ttl_seconds)

        # Create New Immutable Counter-Offer
        counter_offer = NegotiationOffer(
            id=uuid.uuid4(),
            ride_request_id=ride.id,
            sender_type="PARTNER",
            sender_id=drv_uid,
            receiver_type="CUSTOMER",
            receiver_id=ride.customer_id,
            amount=amount_dec,
            round_number=parent_offer.round_number + 1,
            parent_offer_id=parent_offer.id,
            status="OFFERED",
            expires_at=expires_at,
        )
        self.db.add(counter_offer)

        # Audit Event Log
        self.db.add(
            RideEventLog(
                id=uuid.uuid4(),
                ride_id=ride.id,
                event_type="NEGOTIATION_PARTNER_COUNTER_SENT",
                actor_id=drv_uid,
                actor_role="driver",
                details={
                    "parent_offer_id": str(parent_offer.id),
                    "counter_offer_id": str(counter_offer.id),
                    "amount": float(amount_dec),
                    "round_number": counter_offer.round_number,
                },
            )
        )

        await self.db.commit()

        # Emit realtime event to customer
        try:
            await publish_event(
                f"customer:{str(ride.customer_id)}:events",
                {
                    "event": "NEGOTIATION_DRIVER_OFFER",
                    "offer_id": str(counter_offer.id),
                    "driver_id": str(driver.id),
                    "driver_name": driver.full_name,
                    "rating": float(driver.rating or 5.0),
                    "offer_amount": float(amount_dec),
                    "offer_type": "COUNTER_OFFER",
                    "round_number": counter_offer.round_number,
                    "expires_at": expires_at.isoformat(),
                },
            )
        except Exception:
            pass

        return {
            "success": True,
            "offer_id": str(counter_offer.id),
            "parent_offer_id": str(parent_offer.id),
            "amount": float(amount_dec),
            "round_number": counter_offer.round_number,
            "status": "OFFERED",
            "expires_at": expires_at.isoformat(),
        }

    async def customer_accept_counter_offer(
        self,
        customer_user_id: str,
        offer_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Customer accepts partner's counter-offer.
        Atomically assigns partner at counter price, supersedes competing offers, and closes negotiation.
        """
        cust_uid = uuid.UUID(str(customer_user_id))
        o_res = await self.db.execute(
            select(NegotiationOffer).where(NegotiationOffer.id == offer_id).with_for_update()
        )
        offer = o_res.scalar_one_or_none()
        if not offer:
            raise HTTPException(status_code=404, detail="Negotiation offer not found")

        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == offer.ride_request_id).with_for_update()
        )
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.customer_id != cust_uid:
            raise HTTPException(status_code=403, detail="Unauthorized for this ride request")

        if ride.status in (RideRequestStatus.ASSIGNED, RideRequestStatus.PICKUP, RideRequestStatus.IN_PROGRESS, RideRequestStatus.COMPLETED):
            return {
                "success": False,
                "message": "Ride has already been assigned.",
                "assigned": False,
            }

        now = datetime.now(timezone.utc)
        exp_ts = offer.expires_at
        if exp_ts.tzinfo is None:
            exp_ts = exp_ts.replace(tzinfo=timezone.utc)

        if now > exp_ts:
            offer.status = "EXPIRED"
            await self.db.commit()
            raise HTTPException(status_code=400, detail="Counter-offer has expired.")

        # Find Driver
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == offer.sender_id))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # Mark accepted
        offer.status = "ACCEPTED"
        offer.responded_at = now

        # Supersede all competing offers
        all_comp_res = await self.db.execute(
            select(NegotiationOffer).where(
                and_(
                    NegotiationOffer.ride_request_id == ride.id,
                    NegotiationOffer.id != offer.id,
                    NegotiationOffer.status.in_(["OFFERED", "PENDING"]),
                )
            ).with_for_update()
        )
        comp_offers = all_comp_res.scalars().all()
        for comp in comp_offers:
            comp.status = "SUPERSEDED"
            comp.responded_at = now

        # Authoritative Financial Reconciliation
        final_fare = offer.amount
        commission = round(final_fare * PLATFORM_COMMISSION_RATE, 2)
        driver_net = round(final_fare - commission, 2)

        # Update Ride Request State
        ride.status = RideRequestStatus.ASSIGNED
        ride.assigned_driver_id = driver.id
        ride.assigned_at = now
        ride.pricing_mode = "NEGOTIATED"
        ride.final_fare = final_fare
        ride.estimated_fare = final_fare
        ride.platform_commission = commission
        ride.driver_earning = driver_net

        # Audit Event Log
        self.db.add(
            RideEventLog(
                id=uuid.uuid4(),
                ride_id=ride.id,
                event_type="NEGOTIATION_ACCEPTED_BY_CUSTOMER",
                actor_id=cust_uid,
                actor_role="customer",
                details={
                    "offer_id": str(offer.id),
                    "driver_id": str(driver.id),
                    "final_fare": float(final_fare),
                    "commission": float(commission),
                    "driver_earning": float(driver_net),
                },
            )
        )

        await self.db.commit()

        # Emit Realtime Events
        assigned_payload = {
            "event": "NEGOTIATION_ASSIGNED",
            "ride_request_id": str(ride.id),
            "driver_id": str(driver.id),
            "driver_name": driver.full_name,
            "final_fare": float(final_fare),
            "commission": float(commission),
            "driver_earning": float(driver_net),
        }
        try:
            await publish_event(f"customer:{str(cust_uid)}:events", assigned_payload)
            await publish_event(f"driver:{str(offer.sender_id)}:events", assigned_payload)
            await publish_event(f"trip:{str(ride.id)}:events", assigned_payload)
        except Exception:
            pass

        return {
            "success": True,
            "ride_id": str(ride.id),
            "offer_id": str(offer.id),
            "status": "ACCEPTED",
            "final_fare": float(final_fare),
            "commission": float(commission),
            "driver_earning": float(driver_net),
            "message": "Counter-offer accepted and ride assigned.",
        }

    async def customer_send_counter_offer(
        self,
        customer_user_id: str,
        parent_offer_id: uuid.UUID,
        counter_amount: float,
        ttl_seconds: int = DEFAULT_OFFER_TTL_SECONDS,
    ) -> Dict[str, Any]:
        """
        Customer sends counter-offer back to partner.
        Creates immutable NegotiationOffer for the partner.
        """
        cust_uid = uuid.UUID(str(customer_user_id))
        p_res = await self.db.execute(
            select(NegotiationOffer).where(NegotiationOffer.id == parent_offer_id).with_for_update()
        )
        parent_offer = p_res.scalar_one_or_none()
        if not parent_offer:
            raise HTTPException(status_code=404, detail="Parent offer not found")

        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == parent_offer.ride_request_id).with_for_update()
        )
        ride = r_res.scalar_one_or_none()
        if not ride or ride.customer_id != cust_uid:
            raise HTTPException(status_code=403, detail="Unauthorized for this ride request")

        now = datetime.now(timezone.utc)
        parent_offer.status = "SUPERSEDED"
        parent_offer.responded_at = now

        amount_dec = Decimal(str(round(counter_amount, 2)))
        expires_at = now + timedelta(seconds=ttl_seconds)

        counter_offer = NegotiationOffer(
            id=uuid.uuid4(),
            ride_request_id=ride.id,
            sender_type="CUSTOMER",
            sender_id=cust_uid,
            receiver_type="PARTNER",
            receiver_id=parent_offer.sender_id,  # send back to partner
            amount=amount_dec,
            round_number=parent_offer.round_number + 1,
            parent_offer_id=parent_offer.id,
            status="OFFERED",
            expires_at=expires_at,
        )
        self.db.add(counter_offer)

        self.db.add(
            RideEventLog(
                id=uuid.uuid4(),
                ride_id=ride.id,
                event_type="NEGOTIATION_CUSTOMER_COUNTER_SENT",
                actor_id=cust_uid,
                actor_role="customer",
                details={
                    "parent_offer_id": str(parent_offer.id),
                    "counter_offer_id": str(counter_offer.id),
                    "amount": float(amount_dec),
                    "round_number": counter_offer.round_number,
                },
            )
        )

        await self.db.commit()

        try:
            await publish_event(
                f"driver:{str(parent_offer.sender_id)}:events",
                {
                    "event": "NEGOTIATION_CUSTOMER_COUNTER",
                    "offer_id": str(counter_offer.id),
                    "ride_request_id": str(ride.id),
                    "counter_amount": float(amount_dec),
                    "round_number": counter_offer.round_number,
                    "expires_at": expires_at.isoformat(),
                },
            )
        except Exception:
            pass

        return {
            "success": True,
            "offer_id": str(counter_offer.id),
            "amount": float(amount_dec),
            "round_number": counter_offer.round_number,
            "status": "OFFERED",
            "expires_at": expires_at.isoformat(),
        }

    async def reject_offer(
        self,
        user_id: str,
        offer_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Rejects an offer or counter-offer."""
        u_uid = uuid.UUID(str(user_id))
        o_res = await self.db.execute(
            select(NegotiationOffer).where(NegotiationOffer.id == offer_id).with_for_update()
        )
        offer = o_res.scalar_one_or_none()
        if not offer:
            raise HTTPException(status_code=404, detail="Negotiation offer not found")

        now = datetime.now(timezone.utc)
        offer.status = "REJECTED"
        offer.responded_at = now
        offer.rejection_reason = reason or "Rejected by user"

        await self.db.commit()

        return {
            "success": True,
            "offer_id": str(offer.id),
            "status": "REJECTED",
            "message": "Offer rejected.",
        }

    async def cancel_negotiation(
        self,
        customer_user_id: str,
        ride_request_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Customer cancels negotiation session.
        Cancels the ride request and invalidates all active negotiation offers.
        """
        cust_uid = uuid.UUID(str(customer_user_id))
        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == ride_request_id).with_for_update()
        )
        ride = r_res.scalar_one_or_none()
        if not ride or ride.customer_id != cust_uid:
            raise HTTPException(status_code=403, detail="Unauthorized for this ride request")

        if ride.status in (RideRequestStatus.IN_PROGRESS, RideRequestStatus.COMPLETED):
            raise HTTPException(status_code=400, detail="Cannot cancel an in-progress or completed ride.")

        now = datetime.now(timezone.utc)
        ride.status = RideRequestStatus.CANCELLED
        ride.cancelled_by = "customer"
        ride.cancelled_at = now
        ride.cancellation_reason = reason or "Customer cancelled negotiation"

        # Invalidate all active negotiation offers
        o_res = await self.db.execute(
            select(NegotiationOffer).where(
                and_(
                    NegotiationOffer.ride_request_id == ride.id,
                    NegotiationOffer.status.in_(["OFFERED", "PENDING"]),
                )
            ).with_for_update()
        )
        active_offers = o_res.scalars().all()
        for off in active_offers:
            off.status = "CANCELLED"
            off.responded_at = now
            off.rejection_reason = "Negotiation cancelled by customer"

        await self.db.commit()

        # Emit cancellation event
        try:
            await publish_event(
                f"customer:{str(cust_uid)}:events",
                {
                    "event": "NEGOTIATION_CANCELLED",
                    "ride_request_id": str(ride.id),
                    "reason": ride.cancellation_reason,
                },
            )
        except Exception:
            pass

        return {
            "success": True,
            "ride_id": str(ride.id),
            "status": "CANCELLED",
            "message": "Negotiation session and ride cancelled.",
        }

    async def get_negotiation_state(
        self,
        ride_request_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Returns full immutable negotiation history, active driver bids, and session status.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_request_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        o_res = await self.db.execute(
            select(NegotiationOffer)
            .where(NegotiationOffer.ride_request_id == ride_request_id)
            .order_by(NegotiationOffer.created_at.asc())
        )
        offers = o_res.scalars().all()

        offers_data = []
        for o in offers:
            offers_data.append({
                "id": str(o.id),
                "ride_request_id": str(o.ride_request_id),
                "sender_type": o.sender_type,
                "sender_id": str(o.sender_id),
                "receiver_type": o.receiver_type,
                "receiver_id": str(o.receiver_id),
                "amount": float(o.amount),
                "round_number": o.round_number,
                "parent_offer_id": str(o.parent_offer_id) if o.parent_offer_id else None,
                "status": o.status,
                "expires_at": o.expires_at.isoformat() if o.expires_at else None,
                "created_at": o.created_at.isoformat() if o.created_at else None,
                "responded_at": o.responded_at.isoformat() if o.responded_at else None,
            })

        suggested_amt = float(getattr(ride, "customer_offer_amount", None) or ride.estimated_fare or 0.0)
        return {
            "ride_id": str(ride.id),
            "status": ride.status.value if hasattr(ride.status, "value") else str(ride.status),
            "pricing_mode": ride.pricing_mode,
            "suggested_amount": suggested_amt,
            "assigned_driver_id": str(ride.assigned_driver_id) if ride.assigned_driver_id else None,
            "final_fare": float(ride.final_fare) if ride.final_fare else None,
            "offers_count": len(offers_data),
            "offers": offers_data,
        }
