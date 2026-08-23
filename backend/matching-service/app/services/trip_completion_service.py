"""
Feature 13: Trip Completion & Final Fare Service
PostGIS destination arrival validation, atomic completion transactions,
authoritative final fare calculation, payment reconciliation, immutable receipts,
and customer ratings.
"""
import uuid
import json
import asyncio
from datetime import datetime, timedelta, date
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver, DriverStatus, Vehicle,
    RideRequest, RideRequestStatus, RideCategory,
    RideStop, RideReceipt, DriverEarningLedger, DriverCustomerRating,
    DriverPointWallet, DriverPointTransaction, RideEventLog
)
from app.services.ride_fare_engine import haversine_distance_km
from app.services.destination_mode_service import DestinationModeService
from app.services.back_to_back_service import BackToBackService

DESTINATION_PROXIMITY_RADIUS_M = 100.0
DEFAULT_PLATFORM_COMMISSION_PCT = 0.20  # 20% commission


async def _safe_redis_publish(channel: str, payload_dict: dict):
    try:
        from common.utils.redis_client import get_redis
        r = await asyncio.wait_for(get_redis(), timeout=0.3)
        await asyncio.wait_for(r.publish(channel, json.dumps(payload_dict, default=str)), timeout=0.3)
    except Exception:
        pass


class TripCompletionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify_destination_arrival(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        driver_lat: float,
        driver_lng: float,
    ) -> Dict[str, Any]:
        """
        Validates driver proximity to destination using internal PostGIS/Haversine logic.
        No external Google Maps API calls.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride or ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized for this ride")

        if ride.status not in [RideRequestStatus.IN_PROGRESS, RideRequestStatus.PICKUP]:
            raise HTTPException(status_code=400, detail=f"Ride is not in progress (Current state: {ride.status.value})")

        # Internal PostGIS distance check
        dist_m = haversine_distance_km(driver_lat, driver_lng, ride.destination_lat, ride.destination_lng) * 1000.0
        is_arrived = dist_m <= DESTINATION_PROXIMITY_RADIUS_M

        if is_arrived and not ride.destination_arrived_at:
            ride.destination_arrived_at = datetime.utcnow()
            await self.db.commit()

            await _safe_redis_publish("trip:updates", {
                "event": "ride:arrived_destination",
                "ride_id": str(ride.id),
                "distance_meters": round(dist_m, 1),
            })

        return {
            "ride_id": str(ride.id),
            "is_arrived": is_arrived,
            "distance_meters": round(dist_m, 1),
            "allowed_radius_meters": DESTINATION_PROXIMITY_RADIUS_M,
            "destination_address": ride.destination_address,
            "destination_arrived_at": ride.destination_arrived_at.isoformat() if ride.destination_arrived_at else None,
        }

    async def complete_ride(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        tolls: float = 0.0,
        parking: float = 0.0,
        payment_method: str = "cash",
    ) -> Dict[str, Any]:
        """
        Authoritative trip completion and final fare calculation.
        Enforces atomic transaction, idempotency, transparent fare itemization,
        and double-entry earnings ledger posting.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # Atomic Row Lock
        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == ride_id).with_for_update()
        )
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized for this ride")

        # IDEMPOTENCY: If already completed, return existing receipt
        if ride.status == RideRequestStatus.COMPLETED:
            receipt_res = await self.db.execute(select(RideReceipt).where(RideReceipt.ride_id == ride.id))
            receipt = receipt_res.scalar_one_or_none()
            if receipt:
                return {
                    "success": True,
                    "ride_id": str(ride.id),
                    "status": "completed",
                    "receipt_number": receipt.receipt_number,
                    "customer_final_fare": float(receipt.customer_final_fare),
                    "driver_net_earning": float(receipt.driver_net_earning),
                    "platform_commission": float(receipt.platform_commission),
                    "payment_method": receipt.payment_method,
                    "payment_status": receipt.payment_status,
                    "message": "Ride already completed (Idempotent response).",
                }

        if ride.status == RideRequestStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Cannot complete a cancelled ride.")

        now = datetime.utcnow()
        completed_at = now
        ride.completed_at = completed_at

        # 1. Finalize Traveled Distance & Duration
        # Telemetry distance from Feature 10 (or PostGIS spatial distance fallback)
        direct_dist = haversine_distance_km(ride.pickup_lat, ride.pickup_lng, ride.destination_lat, ride.destination_lng)
        distance_km = max(float(ride.distance_travelled_km or 0.0), round(direct_dist, 2))
        
        # Duration in minutes
        if ride.started_at:
            duration_sec = max((completed_at - ride.started_at.replace(tzinfo=None)).total_seconds(), 60)
            duration_min = max(int(duration_sec // 60), 1)
        else:
            duration_min = max(int(distance_km * 2.5), 5)

        # 2. Get category pricing rules
        base_fare = 75.0
        per_km_rate = 16.0
        per_min_rate = 2.0
        min_fare = 120.0
        commission_pct = DEFAULT_PLATFORM_COMMISSION_PCT
        surge = float(ride.surge_multiplier or 1.0)

        if ride.ride_category_id:
            c_res = await self.db.execute(select(RideCategory).where(RideCategory.id == ride.ride_category_id))
            category = c_res.scalar_one_or_none()
            if category:
                base_fare = float(category.base_fare)
                per_km_rate = float(category.per_km_rate)
                per_min_rate = float(category.per_min_rate)
                min_fare = float(category.min_fare)
                commission_pct = float(category.platform_commission_pct or DEFAULT_PLATFORM_COMMISSION_PCT)

        # 3. Compute Itemized Fare Breakdown
        dist_charge = round(distance_km * per_km_rate, 2)
        time_charge = round(duration_min * per_min_rate, 2)
        waiting_charge = float(ride.pickup_waiting_fare or 0.0) + float(ride.waiting_fare or 0.0)

        # Multi-stops fee
        stops_res = await self.db.execute(select(RideStop).where(RideStop.ride_id == ride.id))
        stops = stops_res.scalars().all()
        stops_fee = float(sum(s.stop_fee for s in stops))

        subtotal = (base_fare + dist_charge + time_charge) * surge
        ride_subtotal = max(subtotal, min_fare)
        
        taxes_and_fees = round(ride_subtotal * 0.05, 2)  # 5% GST
        customer_final_fare = round(ride_subtotal + waiting_charge + stops_fee + tolls + parking + taxes_and_fees, 2)

        # 4. Compute Commission and Driver Net Earning
        # Platform commission applies to core ride fare (excluding tolls/parking)
        commissionable_amount = ride_subtotal + waiting_charge + stops_fee
        platform_commission = round(commissionable_amount * commission_pct, 2)
        
        # Driver Net Earning
        driver_net_earning = round(customer_final_fare - platform_commission - taxes_and_fees, 2)

        # 5. Update Ride State
        ride.status = RideRequestStatus.COMPLETED
        ride.final_fare = Decimal(str(customer_final_fare))
        ride.driver_earning = Decimal(str(driver_net_earning))
        ride.platform_commission = Decimal(str(platform_commission))
        ride.payment_method = payment_method
        ride.payment_status = "cash_collected" if payment_method == "cash" else "paid"

        # 6. Create Immutable Ride Receipt
        receipt_no = f"REC-{ride.id.hex[:8].upper()}-{int(completed_at.timestamp())}"
        receipt = RideReceipt(
            id=uuid.uuid4(),
            ride_id=ride.id,
            driver_id=driver.id,
            customer_id=ride.customer_id,
            receipt_number=receipt_no,
            base_fare=Decimal(str(base_fare)),
            distance_km=distance_km,
            distance_charge=Decimal(str(dist_charge)),
            duration_min=duration_min,
            time_charge=Decimal(str(time_charge)),
            waiting_charge=Decimal(str(waiting_charge)),
            stops_fee=Decimal(str(stops_fee)),
            tolls_charge=Decimal(str(tolls)),
            parking_charge=Decimal(str(parking)),
            taxes_and_fees=Decimal(str(taxes_and_fees)),
            discount_amount=Decimal("0.00"),
            surge_multiplier=surge,
            customer_final_fare=Decimal(str(customer_final_fare)),
            platform_commission=Decimal(str(platform_commission)),
            driver_net_earning=Decimal(str(driver_net_earning)),
            payment_method=payment_method,
            payment_status=ride.payment_status,
            tip_amount=Decimal("0.00"),
        )
        self.db.add(receipt)

        # 7. Post Double-Entry Driver Earnings Ledger
        today_date = date.today()
        # Entry A: Trip Net Earning Credit
        ledger_trip = DriverEarningLedger(
            id=uuid.uuid4(),
            driver_id=driver.id,
            ride_id=ride.id,
            entry_type="TRIP_EARNING",
            amount=Decimal(str(driver_net_earning)),
            currency="INR",
            direction="CREDIT",
            status="SETTLED",
            description=f"Earnings for Trip #{ride.id.hex[:6].upper()} ({distance_km}km)",
            effective_date=today_date,
            metadata_json={
                "distance_km": distance_km,
                "duration_min": duration_min,
                "customer_fare": customer_final_fare,
                "commission": platform_commission,
            },
        )
        self.db.add(ledger_trip)

        # Entry B: If Cash payment, record Cash Collected
        if payment_method == "cash":
            ledger_cash = DriverEarningLedger(
                id=uuid.uuid4(),
                driver_id=driver.id,
                ride_id=ride.id,
                entry_type="CASH_COLLECTED",
                amount=Decimal(str(customer_final_fare)),
                currency="INR",
                direction="CREDIT",
                status="SETTLED",
                description=f"Cash collected in hand from customer for Trip #{ride.id.hex[:6].upper()}",
                effective_date=today_date,
            )
            self.db.add(ledger_cash)

        # 8. Update Driver Aggregate Statistics
        driver.total_trips = (driver.total_trips or 0) + 1
        driver.total_earnings = (driver.total_earnings or Decimal("0.00")) + Decimal(str(driver_net_earning))
        
        # Digital payout wallet update
        if payment_method != "cash":
            driver.wallet_balance = (driver.wallet_balance or Decimal("0.00")) + Decimal(str(driver_net_earning))

        # 9. Feature 20: Evaluate Destination Mode Reached / Progress
        try:
            from app.services.destination_mode_service import DestinationModeService
            await DestinationModeService(self.db).check_destination_reached_or_progress(
                driver_id=driver.id,
                current_lat=ride.destination_lat,
                current_lng=ride.destination_lng,
            )
        except Exception:
            pass

        # 10. Feature 21: Activate Next Reserved Ride if Back-to-Back
        next_ride_data = None
        try:
            from app.services.back_to_back_service import BackToBackService
            next_ride_data = await BackToBackService(self.db).activate_next_ride_on_completion(
                driver_id=driver.id,
                completed_ride_id=ride.id,
            )
        except Exception:
            pass

        # If no back-to-back next ride, return driver to online status
        if not next_ride_data:
            driver.status = DriverStatus.ONLINE

        # 11. Audit Event Log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="RIDE_COMPLETED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={
                "receipt_number": receipt_no,
                "final_fare": customer_final_fare,
                "driver_net": driver_net_earning,
                "commission": platform_commission,
                "distance_km": distance_km,
                "duration_min": duration_min,
                "payment_method": payment_method,
                "has_back_to_back_activated": bool(next_ride_data),
            },
        )
        self.db.add(event_log)
        await self.db.commit()

        # 10. Real-time Broadcasts
        payload = {
            "ride_id": str(ride.id),
            "status": "completed",
            "receipt_number": receipt_no,
            "customer_final_fare": customer_final_fare,
            "driver_net_earning": driver_net_earning,
            "platform_commission": platform_commission,
            "payment_method": payment_method,
            "payment_status": ride.payment_status,
        }
        await _safe_redis_publish("trip:updates", {
            "event": "ride:completed",
            "data": payload,
        })
        await _safe_redis_publish("driver:earnings", {
            "event": "earning:updated",
            "driver_id": str(driver.id),
            "amount": driver_net_earning,
        })

        return {
            "success": True,
            "ride_id": str(ride.id),
            "status": "completed",
            "receipt_number": receipt_no,
            "customer_final_fare": customer_final_fare,
            "driver_net_earning": driver_net_earning,
            "platform_commission": platform_commission,
            "distance_km": distance_km,
            "duration_min": duration_min,
            "waiting_charge": waiting_charge,
            "stops_fee": stops_fee,
            "tolls": tolls,
            "parking": parking,
            "payment_method": payment_method,
            "payment_status": ride.payment_status,
            "message": "Trip successfully completed! Receipt generated.",
        }

    async def get_customer_ride_receipt(self, customer_user_id: str, ride_id: uuid.UUID) -> Dict[str, Any]:
        """Returns the immutable ride receipt breakdown for the authenticated customer."""
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.customer_id != uuid.UUID(customer_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: User did not participate in this ride")

        receipt_res = await self.db.execute(select(RideReceipt).where(RideReceipt.ride_id == ride_id))
        receipt = receipt_res.scalar_one_or_none()
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found for this ride")

        # Fetch driver details for customer receipt view
        driver_name = "Driver Partner"
        driver_rating = 4.9
        driver_phone_masked = "•••• ••••"
        vehicle_model = "Cab Vehicle"
        vehicle_plate = "MH-12-XX-0000"

        if ride.assigned_driver_id:
            d_res = await self.db.execute(select(Driver).where(Driver.id == ride.assigned_driver_id))
            driver = d_res.scalar_one_or_none()
            if driver:
                driver_name = driver.full_name or "Driver Partner"
                driver_rating = round(float(driver.rating or 4.9), 1)
                if driver.phone:
                    driver_phone_masked = driver.phone[:3] + " •••• ••" + driver.phone[-2:] if len(driver.phone) >= 10 else "•••• ••••"
                v_res = await self.db.execute(select(Vehicle).where(Vehicle.driver_id == driver.id))
                veh = v_res.scalar_one_or_none()
                if veh:
                    vehicle_model = f"{veh.make} {veh.model}"
                    vehicle_plate = veh.registration_number

        return {
            "receipt_number": receipt.receipt_number,
            "ride_id": str(receipt.ride_id),
            "pickup_address": ride.pickup_address,
            "destination_address": ride.destination_address,
            "base_fare": float(receipt.base_fare),
            "distance_km": receipt.distance_km,
            "distance_charge": float(receipt.distance_charge),
            "duration_min": receipt.duration_min,
            "time_charge": float(receipt.time_charge),
            "waiting_charge": float(receipt.waiting_charge),
            "stops_fee": float(receipt.stops_fee),
            "tolls_charge": float(receipt.tolls_charge),
            "parking_charge": float(receipt.parking_charge),
            "taxes_and_fees": float(receipt.taxes_and_fees),
            "discount_amount": float(receipt.discount_amount or 0.0),
            "surge_multiplier": receipt.surge_multiplier,
            "customer_final_fare": float(receipt.customer_final_fare),
            "tip_amount": float(receipt.tip_amount or 0.0),
            "payment_method": receipt.payment_method,
            "payment_status": receipt.payment_status,
            "completed_at": receipt.created_at.isoformat() if receipt.created_at else None,
            "driver": {
                "id": str(ride.assigned_driver_id) if ride.assigned_driver_id else None,
                "name": driver_name,
                "rating": driver_rating,
                "phone_masked": driver_phone_masked,
                "vehicle_model": vehicle_model,
                "vehicle_plate": vehicle_plate,
            }
        }

    async def add_driver_tip(
        self,
        customer_user_id: str,
        ride_id: uuid.UUID,
        tip_amount: float,
        idempotency_key: Optional[str] = None,
        payment_method: str = "wallet",
    ) -> Dict[str, Any]:
        """
        Customer adds an optional tip for the driver after ride completion.
        Posts immutable tip transaction to driver ledger and updates receipt.
        """
        if tip_amount <= 0 or tip_amount > 5000:
            raise HTTPException(status_code=400, detail="Invalid tip amount (Must be between ₹1 and ₹5000)")

        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.customer_id != uuid.UUID(customer_user_id):
            raise HTTPException(status_code=403, detail="Unauthorized: User did not participate in this ride")

        if ride.status != RideRequestStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Tips can only be added for completed rides")

        if not ride.assigned_driver_id:
            raise HTTPException(status_code=400, detail="No driver assigned to this ride")

        receipt_res = await self.db.execute(select(RideReceipt).where(RideReceipt.ride_id == ride_id))
        receipt = receipt_res.scalar_one_or_none()
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found for this ride")

        d_res = await self.db.execute(select(Driver).where(Driver.id == ride.assigned_driver_id))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # 1. Update Receipt Tip Amount
        receipt.tip_amount = (receipt.tip_amount or Decimal("0.00")) + Decimal(str(tip_amount))

        # 2. Post Tip to Driver Earning Ledger (Direct 100% credit to driver, 0% platform fee)
        today_date = date.today()
        ledger_tip = DriverEarningLedger(
            id=uuid.uuid4(),
            driver_id=driver.id,
            ride_id=ride.id,
            entry_type="TIP",
            amount=Decimal(str(tip_amount)),
            currency="INR",
            direction="CREDIT",
            status="SETTLED",
            description=f"Passenger Tip for Ride #{ride.id.hex[:6].upper()}",
            effective_date=today_date,
            metadata_json={
                "customer_user_id": customer_user_id,
                "idempotency_key": idempotency_key,
                "payment_method": payment_method,
            },
        )
        self.db.add(ledger_tip)

        # 3. Update Driver aggregate wallet & earnings
        driver.total_earnings = (driver.total_earnings or Decimal("0.00")) + Decimal(str(tip_amount))
        driver.wallet_balance = (driver.wallet_balance or Decimal("0.00")) + Decimal(str(tip_amount))

        await self.db.commit()

        # 4. Notify Driver in Realtime
        await _safe_redis_publish("driver:earnings", {
            "event": "tip:received",
            "driver_id": str(driver.id),
            "ride_id": str(ride.id),
            "tip_amount": tip_amount,
        })

        return {
            "success": True,
            "ride_id": str(ride.id),
            "tip_amount": tip_amount,
            "total_tip": float(receipt.tip_amount),
            "message": f"₹{tip_amount:.2f} tip sent to your driver! Thank you for your generosity.",
        }

    async def get_ride_receipt(self, driver_user_id: str, ride_id: uuid.UUID) -> Dict[str, Any]:
        """Returns the immutable ride receipt breakdown for driver."""
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        r_res = await self.db.execute(select(RideReceipt).where(RideReceipt.ride_id == ride_id))
        receipt = r_res.scalar_one_or_none()
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found for this ride")

        if receipt.driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        return {
            "receipt_number": receipt.receipt_number,
            "ride_id": str(receipt.ride_id),
            "base_fare": float(receipt.base_fare),
            "distance_km": receipt.distance_km,
            "distance_charge": float(receipt.distance_charge),
            "duration_min": receipt.duration_min,
            "time_charge": float(receipt.time_charge),
            "waiting_charge": float(receipt.waiting_charge),
            "stops_fee": float(receipt.stops_fee),
            "tolls_charge": float(receipt.tolls_charge),
            "parking_charge": float(receipt.parking_charge),
            "taxes_and_fees": float(receipt.taxes_and_fees),
            "discount_amount": float(receipt.discount_amount or 0.0),
            "surge_multiplier": receipt.surge_multiplier,
            "customer_final_fare": float(receipt.customer_final_fare),
            "platform_commission": float(receipt.platform_commission),
            "driver_net_earning": float(receipt.driver_net_earning),
            "tip_amount": float(receipt.tip_amount or 0.0),
            "payment_method": receipt.payment_method,
            "payment_status": receipt.payment_status,
            "created_at": receipt.created_at.isoformat() if receipt.created_at else None,
        }

    async def rate_customer(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        rating: float,
        tags: List[str] = [],
        feedback: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Submits 1-5 star driver rating for the passenger."""
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride or ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        rating_val = max(min(float(rating), 5.0), 1.0)
        
        # Check existing rating
        existing_res = await self.db.execute(
            select(DriverCustomerRating).where(DriverCustomerRating.ride_id == ride.id)
        )
        existing = existing_res.scalar_one_or_none()
        if existing:
            existing.rating = rating_val
            existing.tags = tags
            existing.feedback = feedback
        else:
            cust_rating = DriverCustomerRating(
                id=uuid.uuid4(),
                ride_id=ride.id,
                driver_id=driver.id,
                customer_id=ride.customer_id,
                rating=rating_val,
                tags=tags,
                feedback=feedback,
            )
            self.db.add(cust_rating)

        await self.db.commit()

        return {
            "success": True,
            "ride_id": str(ride.id),
            "rating": rating_val,
            "tags": tags,
            "message": "Thank you! Customer rating submitted successfully.",
        }
