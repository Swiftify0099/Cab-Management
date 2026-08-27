"""
On-Demand Ride Dispatch Engine — Fanout + PostGIS Radar Model.

Architecture:
  Customer Request
    ↓
  PostGIS + H3 Spatial Resolution (City / Zone / Hex)
    ↓
  Eligible Driver Pool Filter (ALL_CITY / SPECIFIC_CITY / SPECIFIC_HEX + Physical Proximity)
    ↓
  Fanout: Create Individual RideOffer for Each Eligible Driver
    ↓
  Socket.IO Broadcast (RIDE_REQUEST_NEW) → Drivers' Radar
    ↓
  Driver Accept / Reject
    - Reject: ONLY that offer → REJECTED (RideRequest remains MATCHING for other drivers)
    - Accept: Atomic SELECT FOR UPDATE → Winner assigned, other offers → REMOVED (RIDE_REQUEST_REMOVED broadcast)
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _is_expired(dt_val: Optional[datetime]) -> bool:
    if not dt_val:
        return False
    now = datetime.now(timezone.utc)
    if dt_val.tzinfo is None:
        dt_val = dt_val.replace(tzinfo=timezone.utc)
    return now > dt_val
from decimal import Decimal
import json
from typing import List, Optional
import uuid

import structlog
from sqlalchemy import select, update, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Driver, DriverStatus, DriverLocation, Vehicle,
    RideRequest, RideRequestStatus, RideOffer, RideOfferStatus,
    RideCategory, User,
)
from common.utils.redis_client import get_redis, publish_event
from app.services.ride_fare_engine import estimate_ride_fare, haversine_distance_km
from app.services.route_cache import RouteCacheService
from app.services.spatial_resolver import SpatialResolverService

logger = structlog.get_logger(__name__)

# Config
OFFER_TIMEOUT_SEC = 180
DEFAULT_MAX_PICKUP_RADIUS_KM = 15.0


def _mask_phone(phone: Optional[str]) -> str:
    """Mask phone for operational privacy: +91 98••••2345"""
    if not phone or len(phone) < 6:
        return phone or ""
    return phone[:6] + "••••" + phone[-4:]


class RideDispatchService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.spatial = SpatialResolverService(db)

    async def create_ride_request(
        self,
        customer_id: str,
        pickup_lat: float,
        pickup_lng: float,
        pickup_address: str,
        dest_lat: float,
        dest_lng: float,
        dest_address: str,
        category_name: str = "economy",
        seats_requested: int = 1,
        seat_preferences: Optional[dict] = None,
        preferred_driver_ids: Optional[List[str]] = None,
        service_type: str = "local",
        rider_type: str = "SELF",
        rider_name: Optional[str] = None,
        rider_phone: Optional[str] = None,
        is_booked_for_other: bool = False,
        stops: Optional[List[dict]] = None,
        pickup_notes: Optional[str] = None,
        payment_method: Optional[str] = "CASH",
        is_scheduled: bool = False,
        scheduled_pickup_time: Optional[str] = None,
        pricing_mode: Optional[str] = "STANDARD",
        customer_offer_amount: Optional[float] = None,
    ) -> RideRequest:
        """
        Customer creates an on-demand ride request.
        Resolves spatial hierarchy (City, Zone, Hex) via PostGIS and initiates fanout dispatch.
        """
        # 1. Fetch category
        cat_res = await self.db.execute(
            select(RideCategory).where(
                and_(RideCategory.name == category_name.lower(), RideCategory.is_active == True)
            )
        )
        category = cat_res.scalar_one_or_none()

        # 2. Compute route
        route_info = await RouteCacheService.get_route(pickup_lat, pickup_lng, dest_lat, dest_lng)
        dist_km = route_info["distance_km"]
        dur_min = route_info["duration_min"]
        polyline = route_info.get("polyline", "")

        # 3. Calculate fare & commission
        fare_est = estimate_ride_fare(
            distance_km=dist_km,
            duration_min=dur_min,
            category=category,
            surge_multiplier=category.surge_multiplier if category else 1.0,
        )

        final_fare = Decimal(str(round(customer_offer_amount if (pricing_mode == "NEGOTIATED" and customer_offer_amount) else fare_est.total_fare, 2)))

        # 4. Resolve spatial hierarchy (City / Zone / Hex) via PostGIS
        spatial_info = await self.spatial.resolve_pickup(pickup_lat, pickup_lng)

        # 5. Insert RideRequest
        pickup_wkt = f"SRID=4326;POINT({pickup_lng} {pickup_lat})"
        dest_wkt = f"SRID=4326;POINT({dest_lng} {dest_lat})"

        pref_data = seat_preferences or {}
        if pricing_mode:
            pref_data["pricing_mode"] = pricing_mode
        if customer_offer_amount:
            pref_data["customer_offer_amount"] = customer_offer_amount
        if stops:
            pref_data["stops"] = stops
        if pickup_notes:
            pref_data["pickup_notes"] = pickup_notes
        if payment_method:
            pref_data["payment_method"] = payment_method
        if is_scheduled:
            pref_data["is_scheduled"] = is_scheduled
            pref_data["scheduled_pickup_time"] = scheduled_pickup_time

        ride_req = RideRequest(
            customer_id=uuid.UUID(customer_id),
            booking_owner_id=uuid.UUID(customer_id),
            rider_type=rider_type,
            rider_name=rider_name,
            rider_phone=rider_phone,
            is_booked_for_other=is_booked_for_other,
            pickup_location=pickup_wkt,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_address=pickup_address,
            destination_location=dest_wkt,
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address=dest_address,
            pickup_city_id=spatial_info.city_id,
            pickup_zone_id=spatial_info.zone_id,
            pickup_hex_id=spatial_info.hex_id,
            ride_category_id=category.id if category else None,
            estimated_distance_km=dist_km,
            estimated_duration_min=dur_min,
            estimated_fare=final_fare,
            surge_multiplier=fare_est.surge_multiplier,
            seats_requested=seats_requested,
            seat_preferences=pref_data,
            route_polyline=polyline,
            route_distance_km=dist_km,
            route_duration_min=dur_min,
            status=RideRequestStatus.MATCHING,
            expires_at=_now_utc() + timedelta(minutes=15),
        )
        self.db.add(ride_req)
        await self.db.commit()
        await self.db.refresh(ride_req)

        # 6. Execute Fanout Dispatch (preferred drivers first)
        await self.dispatch_ride_request(
            str(ride_req.id),
            preferred_driver_ids=preferred_driver_ids,
        )

        return ride_req

    async def dispatch_ride_request(
        self,
        ride_request_id: str,
        excluded_driver_ids: Optional[List[str]] = None,
        preferred_driver_ids: Optional[List[str]] = None,
        max_pickup_radius_km: float = DEFAULT_MAX_PICKUP_RADIUS_KM,
        wave: int = 1,
    ) -> int:
        """
        Multi-Wave Fanout Dispatch Engine:
        Finds ALL eligible online drivers matching coverage mode (NEARBY / ALL_CITY, SPECIFIC_CITY, SPECIFIC_HEX)
        and physical proximity, creates an individual RideOffer for each, broadcasts simultaneously to their radars,
        and dispatches background push notifications.
        """
        req_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == uuid.UUID(ride_request_id))
        )
        ride_req = req_res.scalar_one_or_none()
        if not ride_req or ride_req.status not in (RideRequestStatus.CREATED, RideRequestStatus.MATCHING, RideRequestStatus.DISPATCHING):
            return 0

        ride_req.status = RideRequestStatus.MATCHING
        await self.db.commit()

        # Step 1: Find eligible drivers using 3-mode Spatial Candidate Provider
        service_type_val = getattr(ride_req, "service_type", "cab") or "cab"
        candidates = await self.spatial.find_eligible_drivers_for_request(
            pickup_lat=ride_req.pickup_lat,
            pickup_lng=ride_req.pickup_lng,
            pickup_city_id=ride_req.pickup_city_id,
            pickup_hex_id=ride_req.pickup_hex_id,
            ride_request_id=ride_req.id,
            max_pickup_radius_km=max_pickup_radius_km,
            excluded_driver_ids=excluded_driver_ids,
            service_type=service_type_val,
        )

        if not candidates and wave == 1 and max_pickup_radius_km < 25.0:
            # Immediate Wave 2 fallback if Wave 1 pool is empty
            logger.info("Wave 1 empty, expanding radius to Wave 2", ride_request_id=ride_request_id)
            return await self.dispatch_ride_request(
                ride_request_id=ride_request_id,
                excluded_driver_ids=excluded_driver_ids,
                preferred_driver_ids=preferred_driver_ids,
                max_pickup_radius_km=25.0,
                wave=2,
            )

        if not candidates:
            logger.warning("No eligible drivers found for ride request", ride_request_id=ride_request_id, wave=wave)
            return 0

        # Sort preferred/favourite drivers to the front of the candidate list
        if preferred_driver_ids:
            pref_set = set(str(pid) for pid in preferred_driver_ids)
            candidates.sort(
                key=lambda c: (0 if str(c["driver_id"]) in pref_set else 1, c.get("distance_km", 999))
            )
            logger.info(
                "Favourite driver priority applied",
                preferred_count=len(pref_set),
                total_candidates=len(candidates),
            )

        dispatched_count = 0
        offered_at = _now_utc()
        expires_at = offered_at + timedelta(seconds=OFFER_TIMEOUT_SEC)

        total_fare = float(ride_req.estimated_fare)
        commission = total_fare * 0.20
        driver_earning = total_fare - commission

        for cand in candidates:
            driver_id_str = cand["driver_id"]
            user_id_str = cand["user_id"]

            pickup_eta = cand.get("eta_min", max(int(cand["distance_km"] / 25.0 * 60), 2))

            # Create individual RideOffer
            offer = RideOffer(
                ride_request_id=ride_req.id,
                driver_id=uuid.UUID(driver_id_str),
                status=RideOfferStatus.PENDING,
                pickup_distance_km=cand["distance_km"],
                pickup_eta_min=pickup_eta,
                estimated_fare=Decimal(str(round(total_fare, 2))),
                platform_commission=Decimal(str(round(commission, 2))),
                estimated_earning=Decimal(str(round(driver_earning, 2))),
                offered_at=offered_at,
                expires_at=expires_at,
                available_seats=cand.get("seat_capacity", 4),
                available_seat_labels=["Front Window", "Rear Left", "Rear Right", "Rear Middle"],
            )
            self.db.add(offer)
            await self.db.commit()
            await self.db.refresh(offer)

            # Build production payload for Driver Radar / Incoming Request screen
            offer_payload = {
                "event": "RIDE_REQUEST_NEW",
                "offer_id": str(offer.id),
                "booking_id": str(ride_req.id),  # compatibility
                "ride_request_id": str(ride_req.id),
                "driver_id": driver_id_str,
                "match_mode": cand.get("match_mode", "NEARBY"),
                "pickup": {
                    "address": ride_req.pickup_address,
                    "lat": ride_req.pickup_lat,
                    "lng": ride_req.pickup_lng,
                    "distance_km": cand["distance_km"],
                    "eta_min": pickup_eta,
                },
                "destination": {
                    "address": ride_req.destination_address,
                    "lat": ride_req.destination_lat,
                    "lng": ride_req.destination_lng,
                },
                "trip": {
                    "from": ride_req.pickup_address,
                    "to": ride_req.destination_address,
                    "distance_km": ride_req.estimated_distance_km,
                    "duration_min": ride_req.estimated_duration_min,
                    "fare": float(ride_req.estimated_fare),
                    "earning": round(driver_earning, 2),
                    "seats": ride_req.seats_requested,
                },
                "customer": {
                    "id": str(ride_req.customer_id),
                    "name": ride_req.rider_name or "Rider",
                    "phone_masked": _mask_phone(ride_req.rider_phone) if ride_req.rider_phone else "+91 98••••2345",
                    "rider_type": ride_req.rider_type or "SELF",
                    "is_booked_for_other": ride_req.is_booked_for_other,
                    "special_notes": (ride_req.seat_preferences or {}).get("pickup_notes", "") if isinstance(ride_req.seat_preferences, dict) else "",
                },
                "category": {
                    "name": "Economy",
                    "icon": "car",
                },
                "seat_info": {
                    "total_seats": cand.get("seat_capacity", 4),
                    "available_seats": cand.get("seat_capacity", 4),
                    "available_labels": ["Front Window", "Rear Left", "Rear Right", "Rear Middle"],
                    "requested_seats": ride_req.seats_requested,
                },
                "common_job": {
                    "job_type": "RIDE",
                    "job_id": str(ride_req.id),
                    "domain_id": str(ride_req.id),
                    "status": "OFFERED",
                    "pickup": {
                        "latitude": ride_req.pickup_lat,
                        "longitude": ride_req.pickup_lng,
                        "address": ride_req.pickup_address,
                    },
                    "dropoff": {
                        "latitude": ride_req.destination_lat,
                        "longitude": ride_req.destination_lng,
                        "address": ride_req.destination_address,
                    },
                    "fare_snapshot": {
                        "total_fare": float(ride_req.estimated_fare),
                        "driver_earning": round(driver_earning, 2),
                        "currency": "INR",
                        "payment_method": (ride_req.seat_preferences or {}).get("payment_method", "CASH") if isinstance(ride_req.seat_preferences, dict) else "CASH",
                    },
                    "customer": {
                        "name": ride_req.rider_name or "Rider",
                        "phone_masked": _mask_phone(ride_req.rider_phone) if ride_req.rider_phone else "+91 98••••2345",
                        "special_notes": (ride_req.seat_preferences or {}).get("pickup_notes", "") if isinstance(ride_req.seat_preferences, dict) else "",
                    },
                },
                "expires_at": expires_at.isoformat(),
                "timeout_sec": OFFER_TIMEOUT_SEC,
                "paid": True,
            }

            # 1. Publish to driver's personal Socket.IO room via Redis
            await publish_event(f"driver:{user_id_str}:events", offer_payload)
            driver_id_str = str(cand.get("driver_id", ""))
            if driver_id_str and driver_id_str != user_id_str:
                await publish_event(f"driver:{driver_id_str}:events", offer_payload)
            dispatched_count += 1

            # 2. Push Notification (FCM / Expo) for background/offline driver if token present
            dev_token = cand.get("device_token")
            if dev_token:
                async def _send_driver_push(token_str: str, payload: dict):
                    try:
                        from common.utils.push import send_push_notification
                        await send_push_notification(
                            token=token_str,
                            title=f"🚖 New Ride Request: ₹{payload['trip']['fare']}",
                            body=f"Pickup: {payload['pickup']['address'][:40]} → {payload['destination']['address'][:40]}",
                            data={
                                "categoryIdentifier": "INCOMING_RIDE",
                                "offer_id": payload["offer_id"],
                                "ride_request_id": payload["ride_request_id"],
                                "booking_id": payload["booking_id"],
                                "fare": payload["trip"]["fare"],
                            },
                        )
                    except Exception as ex:
                        logger.warning("Background push notification failed", error=str(ex))

                asyncio.create_task(_send_driver_push(dev_token, offer_payload))

        logger.info(
            "Fanout dispatch complete",
            ride_request_id=ride_request_id,
            wave=wave,
            dispatched_count=dispatched_count,
        )
        return dispatched_count

    async def check_driver_proximity_and_deliver_otp(
        self,
        ride_request_id: str,
        driver_lat: float,
        driver_lng: float,
        proximity_threshold_m: float = 3000.0,
    ) -> Optional[dict]:
        """
        3 KM OTP Proximity Trigger:
        When assigned driver moves within configured threshold (default 3000m) of pickup,
        generates/ensures 4-digit OTP and publishes OTP_READY to customer.
        """
        try:
            req_uuid = uuid.UUID(str(ride_request_id))
        except (ValueError, TypeError):
            return None

        req_res = await self.db.execute(select(RideRequest).where(RideRequest.id == req_uuid))
        ride_req = req_res.scalar_one_or_none()
        if not ride_req or ride_req.status not in (RideRequestStatus.ASSIGNED, RideRequestStatus.PICKUP):
            return None

        dist_km = haversine_distance_km(driver_lat, driver_lng, ride_req.pickup_lat, ride_req.pickup_lng)
        dist_m = dist_km * 1000.0

        if dist_m <= proximity_threshold_m:
            from app.services.ride_start_service import RideStartService
            start_svc = RideStartService(self.db)
            otp = await start_svc.ensure_ride_pin(ride_req)

            otp_payload = {
                "event": "OTP_READY",
                "ride_request_id": str(ride_req.id),
                "otp": otp,
                "distance_km": round(dist_km, 2),
                "eta_min": max(int(dist_km / 25.0 * 60), 1),
                "message": f"Driver is nearby (~{round(dist_km, 1)} km). Your ride OTP is {otp}.",
            }
            await publish_event(f"customer:{str(ride_req.customer_id)}:events", otp_payload)
            logger.info("3km OTP delivered to customer", ride_request_id=str(ride_req.id), dist_km=dist_km)
            return otp_payload

        return None

    async def respond_to_offer(
        self,
        driver_user_id: str,
        offer_id: str,
        accepted: bool,
        rejection_reason: Optional[str] = None,
    ) -> dict:
        """
        Handle driver response to a ride offer:
        - On REJECT:
            1. Mark this driver's offer as REJECTED.
            2. Customer request stays MATCHING! (Reject != Cancel)
            3. Other drivers keep seeing the request.
        - On ACCEPT:
            1. Atomic SELECT FOR UPDATE on RideRequest.
            2. Guarantee exactly ONE driver is assigned.
            3. Mark winning offer as ACCEPTED.
            4. Mark other drivers' offers as REMOVED.
            5. Broadcast RIDE_REQUEST_REMOVED to all other drivers.
            6. Broadcast RIDE_ASSIGNED to Customer with complete driver & vehicle details.
        """
        # Resolve driver
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise ValueError("Driver profile not found")

        # Load offer
        offer_res = await self.db.execute(
            select(RideOffer).where(
                and_(RideOffer.id == uuid.UUID(offer_id), RideOffer.driver_id == driver.id)
            )
        )
        offer = offer_res.scalar_one_or_none()
        if not offer:
            raise ValueError("Ride offer not found or not assigned to this driver")

        now = _now_utc()

        # Check server-side expiration
        if _is_expired(offer.expires_at):
            offer.status = RideOfferStatus.EXPIRED
            await self.db.commit()
            return {"success": False, "message": "Offer expired", "status": "expired"}

        r = await get_redis()

        # ── CASE 1: REJECT ───────────────────────────────────────────
        if not accepted:
            offer.status = RideOfferStatus.REJECTED
            offer.responded_at = now
            offer.response_reason = rejection_reason
            await self.db.commit()

            logger.info(
                "Driver rejected offer — Customer request remains MATCHING",
                driver_id=str(driver.id),
                offer_id=str(offer.id),
                ride_request_id=str(offer.ride_request_id),
            )

            # Check if there are any remaining pending offers for this ride request
            remaining_res = await self.db.execute(
                select(RideOffer).where(
                    and_(
                        RideOffer.ride_request_id == offer.ride_request_id,
                        RideOffer.status == RideOfferStatus.PENDING,
                        RideOffer.expires_at > now,
                    )
                )
            )
            remaining_offers = remaining_res.scalars().all()

            # If all current offers are exhausted and ride is still matching, try expanding search
            if not remaining_offers:
                logger.info(
                    "All current offers exhausted, checking for more drivers",
                    ride_request_id=str(offer.ride_request_id),
                )
                async def _bg_dispatch(req_id: str):
                    from common.database import async_session_maker
                    async with async_session_maker() as bg_db:
                        bg_svc = RideDispatchService(bg_db)
                        await bg_svc.dispatch_ride_request(req_id)

                asyncio.create_task(_bg_dispatch(str(offer.ride_request_id)))

            return {
                "success": True,
                "message": "Offer rejected",
                "status": "rejected",
                "ride_request_id": str(offer.ride_request_id),
            }

        # ── CASE 2: ACCEPT (ATOMIC LOCK VIA SELECT FOR UPDATE) ─────────
        req_lock = await self.db.execute(
            select(RideRequest)
            .where(RideRequest.id == offer.ride_request_id)
            .with_for_update()
        )
        ride_req = req_lock.scalar_one_or_none()

        # If ride already assigned, cancelled, or expired:
        if not ride_req or ride_req.status not in (RideRequestStatus.CREATED, RideRequestStatus.MATCHING, RideRequestStatus.DISPATCHING, RideRequestStatus.OFFERED) or ride_req.assigned_driver_id is not None:
            offer.status = RideOfferStatus.SUPERSEDED
            offer.responded_at = now
            await self.db.commit()
            return {
                "success": False,
                "message": "Ride already assigned to another driver",
                "status": "superseded",
            }

        # 1. Assign Driver to RideRequest
        ride_req.status = RideRequestStatus.ASSIGNED
        ride_req.assigned_driver_id = driver.id
        ride_req.assigned_at = now

        # 2. Mark this offer as ACCEPTED
        offer.status = RideOfferStatus.ACCEPTED
        offer.responded_at = now

        # 3. Mark all other pending offers for this ride as REMOVED
        other_offers_res = await self.db.execute(
            select(RideOffer).where(
                and_(
                    RideOffer.ride_request_id == ride_req.id,
                    RideOffer.id != offer.id,
                    RideOffer.status == RideOfferStatus.PENDING,
                )
            )
        )
        other_offers = other_offers_res.scalars().all()

        other_driver_user_ids = []
        other_driver_ids = []
        for other_off in other_offers:
            other_off.status = RideOfferStatus.REMOVED
            other_off.responded_at = now
            other_driver_ids.append(str(other_off.driver_id))
            # Fetch user_id to notify via socket
            d_other_res = await self.db.execute(
                select(Driver.user_id).where(Driver.id == other_off.driver_id)
            )
            d_uid = d_other_res.scalar_one_or_none()
            if d_uid:
                other_driver_user_ids.append(str(d_uid))

        await self.db.commit()

        # 4. Broadcast RIDE_REQUEST_REMOVED to all other drivers
        removed_payload = {
            "event": "RIDE_REQUEST_REMOVED",
            "ride_request_id": str(ride_req.id),
            "reason": "ASSIGNED_TO_ANOTHER_DRIVER",
        }
        for other_user_id in other_driver_user_ids:
            await publish_event(f"driver:{other_user_id}:events", removed_payload)
        for other_d_id in other_driver_ids:
            if other_d_id not in other_driver_user_ids:
                await publish_event(f"driver:{other_d_id}:events", removed_payload)

        # 5. Fetch vehicle details for customer payload
        veh_res = await self.db.execute(
            select(Vehicle).where(Vehicle.driver_id == driver.id)
        )
        vehicle = veh_res.scalar_one_or_none()

        # 6. Broadcast RIDE_ASSIGNED to Customer and Assigned Driver
        customer_payload = {
            "event": "RIDE_ASSIGNED",
            "ride_request_id": str(ride_req.id),
            "booking_id": str(ride_req.id),
            "status": "ASSIGNED",
            "driver": {
                "driver_id": str(driver.id),
                "full_name": driver.full_name,
                "rating": float(driver.rating or 4.85),
                "phone": driver.phone,
                "profile_photo": driver.profile_photo,
                "distance_km": offer.pickup_distance_km,
                "eta_min": offer.pickup_eta_min,
            },
            "vehicle": {
                "make": vehicle.make if vehicle else "",
                "model": vehicle.model if vehicle else "",
                "color": vehicle.color if vehicle else "",
                "registration_number": vehicle.registration_number if vehicle else "",
                "vehicle_type": str(vehicle.vehicle_type.value) if vehicle and hasattr(vehicle.vehicle_type, 'value') else "",
            } if vehicle else None,
        }
        await publish_event(f"customer:{str(ride_req.customer_id)}:events", customer_payload)
        await publish_event(f"user:{str(ride_req.customer_id)}:events", customer_payload)

        # Notify winning driver
        driver_winner_payload = {
            "event": "RIDE_ASSIGNED",
            "ride_request_id": str(ride_req.id),
            "booking_id": str(ride_req.id),
            "status": "ASSIGNED",
            "offer_id": str(offer.id),
            "customer": {
                "id": str(ride_req.customer_id),
                "name": ride_req.rider_name or "Rider",
                "phone_masked": _mask_phone(ride_req.rider_phone) if ride_req.rider_phone else "+91 98••••2345",
            },
            "pickup": {
                "address": ride_req.pickup_address,
                "lat": ride_req.pickup_lat,
                "lng": ride_req.pickup_lng,
            },
            "destination": {
                "address": ride_req.destination_address,
                "lat": ride_req.destination_lat,
                "lng": ride_req.destination_lng,
            },
            "fare": float(ride_req.estimated_fare or 0),
            "earning": float(offer.estimated_earning or 0),
        }
        await publish_event(f"driver:{driver_user_id}:events", driver_winner_payload)
        if str(driver.id) != driver_user_id:
            await publish_event(f"driver:{str(driver.id)}:events", driver_winner_payload)

        logger.info(
            "Ride assigned successfully (First accept wins)",
            ride_request_id=str(ride_req.id),
            winner_driver_id=str(driver.id),
            other_drivers_removed=len(other_driver_user_ids),
        )

        return {
            "success": True,
            "message": "Ride assigned successfully",
            "status": "assigned",
            "ride_request_id": str(ride_req.id),
        }

    async def cancel_ride_request(
        self,
        customer_user_id: str,
        ride_request_id: str,
        reason: Optional[str] = None,
    ) -> dict:
        """
        Customer cancels a ride request while MATCHING or ASSIGNED.
        Marks ride CANCELLED, invalidates pending offers, and removes request from all driver radars.
        """
        try:
            req_uuid = uuid.UUID(str(ride_request_id))
            cust_uuid = uuid.UUID(str(customer_user_id))
        except (ValueError, TypeError, AttributeError):
            return {"success": False, "message": "Invalid or mock ride request ID"}

        req_res = await self.db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.id == req_uuid,
                    RideRequest.customer_id == cust_uuid,
                )
            )
        )
        ride_req = req_res.scalar_one_or_none()
        if not ride_req:
            return {"success": False, "message": "Ride request not found"}

        if ride_req.status in (RideRequestStatus.COMPLETED, RideRequestStatus.CANCELLED):
            return {"success": False, "message": f"Cannot cancel ride in {ride_req.status.value} status"}

        now = _now_utc()
        ride_req.status = RideRequestStatus.CANCELLED
        ride_req.cancelled_at = now
        ride_req.cancellation_reason = reason
        ride_req.cancelled_by = "customer"

        # Invalidate all pending offers
        offers_res = await self.db.execute(
            select(RideOffer).where(
                and_(
                    RideOffer.ride_request_id == ride_req.id,
                    RideOffer.status == RideOfferStatus.PENDING,
                )
            )
        )
        pending_offers = offers_res.scalars().all()

        driver_user_ids = []
        for off in pending_offers:
            off.status = RideOfferStatus.CANCELLED
            off.responded_at = now
            d_res = await self.db.execute(
                select(Driver.user_id).where(Driver.id == off.driver_id)
            )
            d_uid = d_res.scalar_one_or_none()
            if d_uid:
                driver_user_ids.append(str(d_uid))

        # If driver was already assigned, also notify assigned driver
        if ride_req.assigned_driver_id:
            assigned_d_res = await self.db.execute(
                select(Driver.user_id).where(Driver.id == ride_req.assigned_driver_id)
            )
            assigned_uid = assigned_d_res.scalar_one_or_none()
            if assigned_uid and str(assigned_uid) not in driver_user_ids:
                driver_user_ids.append(str(assigned_uid))

        await self.db.commit()

        # Broadcast RIDE_REQUEST_REMOVED to all drivers who had the request on their radar
        for uid in driver_user_ids:
            await publish_event(f"driver:{uid}:events", {
                "event": "RIDE_REQUEST_REMOVED",
                "ride_request_id": str(ride_req.id),
                "reason": "CUSTOMER_CANCELLED",
            })

        logger.info("Ride request cancelled by customer", ride_request_id=ride_request_id)
        return {"success": True, "message": "Ride request cancelled successfully"}

    async def get_pending_offers_for_driver(self, driver_user_id: str) -> List[dict]:
        """
        Pending Request Recovery Endpoint Service:
        Fetches all valid, unexpired offers for the authenticated driver.
        Used on Driver App startup, reconnect, and push notification tap.
        Filters:
          - Authenticated driver exists and is active/online
          - Offer status == PENDING
          - Offer not expired (expires_at > now)
          - RideRequest status in (CREATED, MATCHING, DISPATCHING, OFFERED)
          - RideRequest assigned_driver_id is None
        Returns list of structured IncomingRequest payloads.
        """
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            return []

        now = _now_utc()
        offers_res = await self.db.execute(
            select(RideOffer, RideRequest)
            .join(RideRequest, RideOffer.ride_request_id == RideRequest.id)
            .where(
                and_(
                    RideOffer.driver_id == driver.id,
                    RideOffer.status == RideOfferStatus.PENDING,
                    RideOffer.expires_at > now,
                    RideRequest.status.in_([
                        RideRequestStatus.CREATED,
                        RideRequestStatus.MATCHING,
                        RideRequestStatus.DISPATCHING,
                        RideRequestStatus.OFFERED,
                    ]),
                    RideRequest.assigned_driver_id == None,
                )
            )
            .order_by(RideOffer.created_at.desc())
        )
        rows = offers_res.all()

        pending_list = []
        for offer, req in rows:
            time_left_sec = max(int((offer.expires_at - now).total_seconds()), 0) if offer.expires_at else OFFER_TIMEOUT_SEC
            if time_left_sec <= 0:
                continue

            pending_list.append({
                "offer_id": str(offer.id),
                "ride_request_id": str(req.id),
                "booking_id": str(req.id),
                "driver_id": str(driver.id),
                "pickup": {
                    "address": req.pickup_address,
                    "lat": req.pickup_lat,
                    "lng": req.pickup_lng,
                    "distance_km": offer.pickup_distance_km or 2.4,
                    "eta_min": offer.pickup_eta_min or 5,
                },
                "destination": {
                    "address": req.destination_address,
                    "lat": req.destination_lat,
                    "lng": req.destination_lng,
                },
                "trip": {
                    "from": req.pickup_address,
                    "to": req.destination_address,
                    "distance_km": req.estimated_distance_km or 0,
                    "duration_min": req.estimated_duration_min or 0,
                    "fare": float(req.estimated_fare or 0),
                    "earning": float(offer.estimated_earning or round(float(req.estimated_fare or 0) * 0.8, 2)),
                    "seats": req.seats_requested,
                },
                "category": {
                    "name": "Economy",
                    "icon": "car",
                },
                "seat_info": {
                    "total_seats": offer.available_seats or 4,
                    "available_seats": offer.available_seats or 4,
                    "available_labels": offer.available_seat_labels or ["Front Window", "Rear Left", "Rear Right", "Rear Middle"],
                    "requested_seats": req.seats_requested,
                },
                "customer": {
                    "id": str(req.customer_id),
                    "name": req.rider_name or "Rider",
                    "phone_masked": _mask_phone(req.rider_phone) if req.rider_phone else "+91 98••••2345",
                },
                "is_preferred": bool(offer.is_preferred),
                "timeout_sec": time_left_sec,
                "expires_at": offer.expires_at.isoformat() if offer.expires_at else None,
                "paid": True,
                "service_type": req.service_type or "local",
            })

        return pending_list

    async def get_active_ride_for_driver(self, driver_user_id: str) -> Optional[dict]:
        """
        Fetches current active assigned ride or single active pending offer for a driver (used for reconnect sync).
        """
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            return None

        # 1. Check for active assigned ride
        ride_res = await self.db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.assigned_driver_id == driver.id,
                    RideRequest.status.in_([
                        RideRequestStatus.ASSIGNED,
                        RideRequestStatus.PICKUP,
                        RideRequestStatus.IN_PROGRESS
                    ])
                )
            )
        )
        active_ride = ride_res.scalar_one_or_none()
        if active_ride:
            return {
                "ride_id": str(active_ride.id),
                "ride_request_id": str(active_ride.id),
                "booking_id": str(active_ride.id),
                "status": active_ride.status.value,
                "pickup_address": active_ride.pickup_address,
                "pickup_lat": active_ride.pickup_lat,
                "pickup_lng": active_ride.pickup_lng,
                "destination_address": active_ride.destination_address,
                "destination_lat": active_ride.destination_lat,
                "destination_lng": active_ride.destination_lng,
                "fare": float(active_ride.estimated_fare or 0),
                "distance_km": active_ride.estimated_distance_km,
                "duration_min": active_ride.estimated_duration_min,
                "seats_requested": active_ride.seats_requested,
                "is_active": True,
            }

        # 2. Check for active pending offers
        now = _now_utc()
        offer_res = await self.db.execute(
            select(RideOffer).where(
                and_(
                    RideOffer.driver_id == driver.id,
                    RideOffer.status == RideOfferStatus.PENDING,
                    RideOffer.expires_at > now
                )
            ).order_by(RideOffer.created_at.desc())
        )
        pending_offer = offer_res.scalar_one_or_none()
        if pending_offer:
            req_res = await self.db.execute(
                select(RideRequest).where(RideRequest.id == pending_offer.ride_request_id)
            )
            req = req_res.scalar_one_or_none()
            if req and req.status in (RideRequestStatus.CREATED, RideRequestStatus.MATCHING, RideRequestStatus.DISPATCHING, RideRequestStatus.OFFERED) and req.assigned_driver_id is None:
                return {
                    "offer_id": str(pending_offer.id),
                    "ride_id": str(req.id),
                    "ride_request_id": str(req.id),
                    "booking_id": str(req.id),
                    "status": "OFFERED",
                    "pickup_address": req.pickup_address,
                    "pickup_lat": req.pickup_lat,
                    "pickup_lng": req.pickup_lng,
                    "destination_address": req.destination_address,
                    "destination_lat": req.destination_lat,
                    "destination_lng": req.destination_lng,
                    "fare": float(req.estimated_fare or 0),
                    "earning": float(pending_offer.estimated_earning or 0),
                    "distance_km": req.estimated_distance_km,
                    "duration_min": req.estimated_duration_min,
                    "seats_requested": req.seats_requested,
                    "expires_at": pending_offer.expires_at.isoformat() if pending_offer.expires_at else None,
                    "is_active": False,
                    "is_offer": True,
                }

        return None

    async def get_categories(self) -> List[dict]:
        """Returns all active ride categories."""
        res = await self.db.execute(
            select(RideCategory).where(RideCategory.is_active == True).order_by(RideCategory.sort_order.asc())
        )
        cats = res.scalars().all()
        return [
            {
                "id": str(c.id),
                "name": c.name,
                "display_name": c.display_name,
                "base_fare": float(c.base_fare),
                "per_km_rate": float(c.per_km_rate),
                "per_min_rate": float(c.per_min_rate),
                "min_fare": float(c.min_fare),
                "platform_commission_pct": c.platform_commission_pct,
                "icon_name": c.icon_name,
            }
            for c in cats
        ]
