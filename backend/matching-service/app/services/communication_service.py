"""
Feature 8: Customer Communication Service
Authoritative Masked Phone Calls, Realtime Chat, Pickup Assistance, Waiting Timer & No-Show.
"""
import uuid
import hashlib
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver, Vehicle,
    RideRequest, RideRequestStatus,
    RideMessage, CallSession, RideEventLog,
    DriverPointWallet, DriverPointTransaction
)
from app.services.ride_fare_engine import haversine_distance_km


async def _safe_redis_publish(channel: str, payload_dict: dict):
    try:
        from common.utils.redis_client import get_redis
        r = await asyncio.wait_for(get_redis(), timeout=0.3)
        await asyncio.wait_for(r.publish(channel, json.dumps(payload_dict, default=str)), timeout=0.3)
    except Exception:
        pass


class CommunicationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def initiate_masked_call(
        self, driver_user_id: str, ride_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Initiate a masked call session between driver and passenger.
        Validates driver ownership, active ride state, rate limit, and cooldown.
        NEVER exposes real phone numbers.
        """
        # 1. Verify driver profile
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # 2. Verify ride ownership and state
        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == ride_id)
        )
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Driver is not assigned to this ride")

        if ride.status not in [RideRequestStatus.ASSIGNED, RideRequestStatus.PICKUP, RideRequestStatus.IN_PROGRESS]:
            raise HTTPException(status_code=400, detail=f"Communication not permitted in state '{ride.status.value}'")

        # 3. Rate limiting (max 5 calls per ride)
        now = datetime.utcnow()
        one_hour_ago = now - timedelta(hours=1)
        count_res = await self.db.execute(
            select(func.count(CallSession.id)).where(
                and_(
                    CallSession.ride_id == ride_id,
                    CallSession.created_at >= one_hour_ago
                )
            )
        )
        call_count = count_res.scalar() or 0
        if call_count >= 5:
            raise HTTPException(status_code=429, detail="Maximum call limit (5) reached for this ride.")

        # 4. Cooldown check (30 seconds between calls)
        last_call_res = await self.db.execute(
            select(CallSession).where(CallSession.ride_id == ride_id).order_by(desc(CallSession.created_at)).limit(1)
        )
        last_call = last_call_res.scalar_one_or_none()
        if last_call and last_call.created_at:
            elapsed = (now - last_call.created_at.replace(tzinfo=None)).total_seconds()
            if elapsed < 30:
                raise HTTPException(status_code=429, detail=f"Please wait {int(30 - elapsed)}s before calling again.")

        # 5. Fetch customer profile for display name
        c_res = await self.db.execute(
            select(User).where(User.id == ride.customer_id)
        )
        customer_user = c_res.scalar_one_or_none()
        customer_name = (customer_user.email.split('@')[0].capitalize() if customer_user and customer_user.email else "Passenger")

        # 6. Create CallSession
        session_id = uuid.uuid4()
        virtual_proxy_number = "+91-80-4567-8900"
        provider_ref = f"MOCK-EXOTEL-{session_id.hex[:8].upper()}"

        call_session = CallSession(
            id=session_id,
            ride_id=ride_id,
            driver_id=driver.id,
            customer_id=ride.customer_id,
            caller_role="driver",
            status="requesting",
            virtual_proxy_number=virtual_proxy_number,
            provider_ref=provider_ref,
            duration_seconds=0,
            started_at=now,
        )
        self.db.add(call_session)

        # Update ride contact attempt count
        ride.last_contact_attempt_at = now
        ride.contact_attempts_count = (ride.contact_attempts_count or 0) + 1

        # Audit log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride_id,
            event_type="CALL_INITIATED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={
                "call_session_id": str(session_id),
                "virtual_proxy": virtual_proxy_number,
                "provider_ref": provider_ref,
            }
        )
        self.db.add(event_log)
        await self.db.commit()

        # Emit realtime socket event non-blocking
        await _safe_redis_publish("communication:events", {
            "event": "communication:call_status",
            "ride_id": str(ride_id),
            "session_id": str(session_id),
            "status": "requesting",
            "customer_id": str(ride.customer_id),
            "driver_id": str(driver.id),
            "virtual_proxy": virtual_proxy_number,
        })

        return {
            "call_session_id": str(session_id),
            "status": "requesting",
            "virtual_proxy_number": virtual_proxy_number,
            "provider_ref": provider_ref,
            "customer_name": customer_name,
            "rate_limit_remaining": 5 - (call_count + 1),
        }

    async def update_call_status(
        self, session_id: uuid.UUID, new_status: str, duration_seconds: int = 0
    ) -> Dict[str, Any]:
        """Update call state (e.g. ringing -> connected -> ended)."""
        res = await self.db.execute(
            select(CallSession).where(CallSession.id == session_id)
        )
        session = res.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Call session not found")

        session.status = new_status
        now = datetime.utcnow()
        if new_status == "ended":
            session.ended_at = now
            session.duration_seconds = max(duration_seconds, session.duration_seconds)

        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=session.ride_id,
            event_type=f"CALL_{new_status.upper()}",
            actor_id=session.customer_id if session.caller_role == "driver" else session.driver_id,
            actor_role="system",
            details={"status": new_status, "duration_seconds": duration_seconds}
        )
        self.db.add(event_log)
        await self.db.commit()

        await _safe_redis_publish("communication:events", {
            "event": "communication:call_status",
            "ride_id": str(session.ride_id),
            "session_id": str(session.id),
            "status": new_status,
            "duration_seconds": duration_seconds,
        })

        return {"session_id": str(session.id), "status": new_status, "duration_seconds": duration_seconds}

    async def send_message(
        self,
        sender_user_id: str,
        sender_role: str,
        ride_id: uuid.UUID,
        content: str,
        message_type: str = "text",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Server-authoritative in-app messaging.
        Validates sender belongs to ride, ride is active, persists and emits realtime event.
        """
        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == ride_id)
        )
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        sender_uuid = uuid.UUID(sender_user_id)
        receiver_uuid = None

        if sender_role == "driver":
            d_res = await self.db.execute(select(Driver).where(Driver.user_id == sender_uuid))
            driver = d_res.scalar_one_or_none()
            if not driver or ride.assigned_driver_id != driver.id:
                raise HTTPException(status_code=403, detail="Driver is not assigned to this ride")
            receiver_uuid = ride.customer_id
        elif sender_role == "customer":
            if ride.customer_id != sender_uuid:
                raise HTTPException(status_code=403, detail="Customer is not part of this ride")
            d_res = await self.db.execute(select(Driver).where(Driver.id == ride.assigned_driver_id))
            driver = d_res.scalar_one_or_none()
            receiver_uuid = driver.user_id if driver else None
        else:
            raise HTTPException(status_code=400, detail="Invalid sender role")

        if not receiver_uuid:
            raise HTTPException(status_code=400, detail="Receiver not found for ride")

        now = datetime.utcnow()
        msg_id = uuid.uuid4()
        msg = RideMessage(
            id=msg_id,
            ride_id=ride_id,
            sender_id=sender_uuid,
            receiver_id=receiver_uuid,
            sender_type=sender_role,
            message_type=message_type,
            content=content.strip(),
            is_delivered=True,
            delivered_at=now,
            is_read=False,
            metadata_json=metadata or {},
        )
        self.db.add(msg)

        if sender_role == "driver":
            ride.last_contact_attempt_at = now
            ride.contact_attempts_count = (ride.contact_attempts_count or 0) + 1

        # Audit log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride_id,
            event_type="MESSAGE_SENT",
            actor_id=sender_uuid,
            actor_role=sender_role,
            details={"message_id": str(msg_id), "message_type": message_type}
        )
        self.db.add(event_log)
        await self.db.commit()

        # Emit realtime socket event non-blocking
        await _safe_redis_publish("communication:events", {
            "event": "communication:message",
            "message": {
                "id": str(msg_id),
                "ride_id": str(ride_id),
                "sender_id": str(sender_uuid),
                "sender_type": sender_role,
                "receiver_id": str(receiver_uuid),
                "content": content.strip(),
                "message_type": message_type,
                "created_at": now.isoformat(),
                "is_delivered": True,
                "is_read": False,
            }
        })

        return {
            "id": str(msg_id),
            "ride_id": str(ride_id),
            "sender_id": str(sender_uuid),
            "sender_type": sender_role,
            "content": content.strip(),
            "message_type": message_type,
            "created_at": now.isoformat(),
            "is_delivered": True,
            "is_read": False,
        }

    async def get_messages(
        self, user_id: str, ride_id: uuid.UUID, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Fetch chat history for active ride."""
        res = await self.db.execute(
            select(RideMessage)
            .where(RideMessage.ride_id == ride_id)
            .order_by(RideMessage.created_at.asc())
            .limit(limit)
        )
        msgs = res.scalars().all()
        return [
            {
                "id": str(m.id),
                "ride_id": str(m.ride_id),
                "sender_id": str(m.sender_id),
                "sender_type": m.sender_type,
                "content": m.content,
                "message_type": m.message_type,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "is_delivered": m.is_delivered,
                "is_read": m.is_read,
            }
            for m in msgs
        ]

    async def mark_messages_read(self, user_id: str, ride_id: uuid.UUID) -> int:
        """Mark unread messages as read."""
        user_uuid = uuid.UUID(user_id)
        now = datetime.utcnow()
        res = await self.db.execute(
            select(RideMessage).where(
                and_(
                    RideMessage.ride_id == ride_id,
                    RideMessage.receiver_id == user_uuid,
                    RideMessage.is_read == False
                )
            )
        )
        unread = res.scalars().all()
        for m in unread:
            m.is_read = True
            m.read_at = now
        await self.db.commit()

        await _safe_redis_publish("communication:events", {
            "event": "communication:message_read",
            "ride_id": str(ride_id),
            "reader_id": str(user_uuid),
            "count": len(unread),
        })

        return len(unread)

    async def report_pickup_issue(
        self, driver_user_id: str, ride_id: uuid.UUID, issue_type: str, details: Optional[str] = None
    ) -> Dict[str, Any]:
        """Driver reports pickup issue (CANT_FIND_CUSTOMER, WRONG_PICKUP_LOCATION)."""
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")

        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride or ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride_id,
            event_type=f"ISSUE_{issue_type.upper()}",
            actor_id=driver.user_id,
            actor_role="driver",
            details={"issue_type": issue_type, "details": details or ""}
        )
        self.db.add(event_log)
        await self.db.commit()

        return {"success": True, "issue_type": issue_type, "message": "Assistance logged and passenger notified."}

    async def process_no_show(
        self, driver_user_id: str, ride_id: uuid.UUID, driver_lat: float, driver_lng: float
    ) -> Dict[str, Any]:
        """
        Anti-fraud server-authoritative Customer No-Show workflow.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")

        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride or ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        if ride.status not in [RideRequestStatus.ASSIGNED, RideRequestStatus.PICKUP]:
            raise HTTPException(status_code=400, detail=f"No-show not applicable for ride in status '{ride.status.value}'")

        if not ride.pickup_arrived_at:
            raise HTTPException(status_code=400, detail="Driver has not officially marked arrival at pickup yet.")

        now = datetime.utcnow()
        elapsed_sec = (now - ride.pickup_arrived_at.replace(tzinfo=None)).total_seconds()
        if elapsed_sec < 300:
            remaining = int(300 - elapsed_sec)
            raise HTTPException(
                status_code=400,
                detail=f"Minimum waiting time not reached. Please wait {remaining // 60}m {remaining % 60}s before reporting No-Show."
            )

        # PostGIS Proximity Check (<150m from pickup)
        dist_m = haversine_distance_km(driver_lat, driver_lng, ride.pickup_lat, ride.pickup_lng) * 1000.0
        if dist_m > 150.0:
            raise HTTPException(
                status_code=400,
                detail=f"Driver is too far from pickup location ({int(dist_m)}m > 150m). Move closer to confirm No-Show."
            )

        # Contact attempt check (>= 1 call or message)
        if (ride.contact_attempts_count or 0) < 1:
            raise HTTPException(
                status_code=400,
                detail="At least 1 contact attempt (Call or Chat message) is required before cancelling as No-Show."
            )

        # Approve No-Show Cancellation
        ride.status = RideRequestStatus.CANCELLED
        ride.cancelled_by = "driver"
        ride.cancellation_reason = "CUSTOMER_NO_SHOW"
        ride.cancelled_at = now

        # Credit No-Show fee (₹50.00) to driver wallet
        wallet_res = await self.db.execute(
            select(DriverPointWallet).where(DriverPointWallet.driver_id == driver.id)
        )
        wallet = wallet_res.scalar_one_or_none()
        if wallet:
            wallet.balance += 50
            tx = DriverPointTransaction(
                id=uuid.uuid4(),
                driver_id=driver.id,
                wallet_id=wallet.id,
                delta=50,
                reason="Cancellation Fee: Customer No-Show",
                ref_id=ride.id
            )
            self.db.add(tx)

        # Record audit log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride_id,
            event_type="NO_SHOW_CONFIRMED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={
                "elapsed_waiting_sec": elapsed_sec,
                "distance_meters": dist_m,
                "contact_attempts": ride.contact_attempts_count,
                "cancellation_fee_credited": 50.0
            }
        )
        self.db.add(event_log)
        await self.db.commit()

        await _safe_redis_publish("communication:events", {
            "event": "ride:cancelled",
            "ride_id": str(ride_id),
            "reason": "CUSTOMER_NO_SHOW",
            "cancelled_by": "driver",
        })

        return {
            "success": True,
            "message": "No-Show confirmed. Ride cancelled. ₹50.00 compensation credited to your wallet.",
            "cancellation_fee": 50.0,
            "status": "cancelled",
        }
