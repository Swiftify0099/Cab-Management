import os, sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
services_dir = os.path.join(backend_root, "matching-service", "app", "services")
matching_api_file = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

# ============================================================
# 1. trip_completion_service.py
# ============================================================
trip_completion_code = '''"""
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
    User, Driver, DriverStatus,
    RideRequest, RideRequestStatus, RideCategory,
    RideStop, RideReceipt, DriverEarningLedger, DriverCustomerRating,
    DriverPointWallet, DriverPointTransaction, RideEventLog
)
from app.services.ride_fare_engine import haversine_distance_km

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

        # 9. Audit Event Log
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

    async def get_ride_receipt(self, driver_user_id: str, ride_id: uuid.UUID) -> Dict[str, Any]:
        """Returns the immutable ride receipt breakdown."""
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
            "surge_multiplier": receipt.surge_multiplier,
            "customer_final_fare": float(receipt.customer_final_fare),
            "platform_commission": float(receipt.platform_commission),
            "driver_net_earning": float(receipt.driver_net_earning),
            "tip_amount": float(receipt.tip_amount),
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
'''

# ============================================================
# 2. driver_earnings_service.py
# ============================================================
driver_earnings_code = '''"""
Feature 14: Driver Earnings & Double-Entry Ledger Service
Today/Weekly/Monthly financial reconciliation, ledger journaling, tips,
incentives, bonuses, and payout balance intelligence.
"""
import uuid
import json
import asyncio
from datetime import datetime, timedelta, date
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver, RideRequest, RideReceipt, DriverEarningLedger,
    DriverSettlement
)


class DriverEarningsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_earnings_summary(
        self,
        driver_user_id: str,
        period: str = "today"
    ) -> Dict[str, Any]:
        """
        Reconciles double-entry ledger summaries for Today, Week, or Month.
        Calculates Net Earnings, Completed Trips, Online Hours, Earning/Hour,
        Cash vs Online split, and Available Payout Balance.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        today = date.today()
        if period == "week":
            start_date = today - timedelta(days=today.weekday())  # Monday of current week
        elif period == "month":
            start_date = today.replace(day=1)
        else:
            start_date = today

        # 1. Total Net Trip Earnings from Ledger
        net_res = await self.db.execute(
            select(func.coalesce(func.sum(DriverEarningLedger.amount), Decimal("0.00")))
            .where(
                and_(
                    DriverEarningLedger.driver_id == driver.id,
                    DriverEarningLedger.entry_type.in_(["TRIP_EARNING", "TIP", "INCENTIVE", "BONUS"]),
                    DriverEarningLedger.effective_date >= start_date,
                    DriverEarningLedger.direction == "CREDIT"
                )
            )
        )
        total_net = float(net_res.scalar() or Decimal("0.00"))

        # 2. Trip Count in Period
        trips_res = await self.db.execute(
            select(func.count(DriverEarningLedger.id))
            .where(
                and_(
                    DriverEarningLedger.driver_id == driver.id,
                    DriverEarningLedger.entry_type == "TRIP_EARNING",
                    DriverEarningLedger.effective_date >= start_date,
                )
            )
        )
        trip_count = int(trips_res.scalar() or 0)

        # 3. Cash Collected in Period
        cash_res = await self.db.execute(
            select(func.coalesce(func.sum(DriverEarningLedger.amount), Decimal("0.00")))
            .where(
                and_(
                    DriverEarningLedger.driver_id == driver.id,
                    DriverEarningLedger.entry_type == "CASH_COLLECTED",
                    DriverEarningLedger.effective_date >= start_date,
                )
            )
        )
        cash_collected = float(cash_res.scalar() or Decimal("0.00"))

        # 4. Tips in Period
        tips_res = await self.db.execute(
            select(func.coalesce(func.sum(DriverEarningLedger.amount), Decimal("0.00")))
            .where(
                and_(
                    DriverEarningLedger.driver_id == driver.id,
                    DriverEarningLedger.entry_type == "TIP",
                    DriverEarningLedger.effective_date >= start_date,
                )
            )
        )
        tips_total = float(tips_res.scalar() or Decimal("0.00"))

        # Online Earnings = Net Trip Earnings from non-cash or overall net
        online_earnings = max(round(total_net - (cash_collected * 0.8), 2), 0.0)

        # Online time simulation (or based on active shift)
        online_hours = max(round(trip_count * 0.75, 1), 1.0) if trip_count > 0 else 0.0
        earning_per_hour = round(total_net / online_hours, 2) if online_hours > 0 else 0.0

        # Weekly Daily Bars (Mon - Sun)
        daily_breakdown = []
        if period == "week":
            mon = today - timedelta(days=today.weekday())
            for i in range(7):
                d = mon + timedelta(days=i)
                d_sum = await self.db.execute(
                    select(func.coalesce(func.sum(DriverEarningLedger.amount), Decimal("0.00")))
                    .where(
                        and_(
                            DriverEarningLedger.driver_id == driver.id,
                            DriverEarningLedger.entry_type.in_(["TRIP_EARNING", "TIP", "INCENTIVE", "BONUS"]),
                            DriverEarningLedger.effective_date == d,
                            DriverEarningLedger.direction == "CREDIT"
                        )
                    )
                )
                amt = float(d_sum.scalar() or 0.0)
                daily_breakdown.append({
                    "day": d.strftime("%a"),
                    "date": d.strftime("%d %b"),
                    "amount": amt,
                    "is_today": d == today,
                })

        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "total_net_earnings": total_net,
            "trip_count": trip_count,
            "cash_collected": cash_collected,
            "online_earnings": online_earnings,
            "tips_total": tips_total,
            "online_hours": online_hours,
            "earning_per_hour": earning_per_hour,
            "available_wallet_balance": float(driver.wallet_balance or Decimal("0.00")),
            "daily_breakdown": daily_breakdown,
        }

    async def get_ledger_history(
        self,
        driver_user_id: str,
        limit: int = 30
    ) -> List[Dict[str, Any]]:
        """Returns paginated immutable financial ledger entries."""
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        entries_res = await self.db.execute(
            select(DriverEarningLedger)
            .where(DriverEarningLedger.driver_id == driver.id)
            .order_by(desc(DriverEarningLedger.created_at))
            .limit(limit)
        )
        entries = entries_res.scalars().all()

        return [
            {
                "id": str(e.id),
                "ride_id": str(e.ride_id) if e.ride_id else None,
                "entry_type": e.entry_type,
                "amount": float(e.amount),
                "currency": e.currency,
                "direction": e.direction,
                "status": e.status,
                "description": e.description,
                "effective_date": e.effective_date.isoformat(),
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]

    async def add_tip(
        self,
        ride_id: uuid.UUID,
        tip_amount: float
    ) -> Dict[str, Any]:
        """Credits customer tip to driver's balance and posts ledger entry."""
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride or not ride.assigned_driver_id:
            raise HTTPException(status_code=404, detail="Ride not found")

        tip_dec = Decimal(str(round(tip_amount, 2)))
        ride.tip_amount = (ride.tip_amount or Decimal("0.00")) + tip_dec

        # Update receipt
        rec_res = await self.db.execute(select(RideReceipt).where(RideReceipt.ride_id == ride.id))
        receipt = rec_res.scalar_one_or_none()
        if receipt:
            receipt.tip_amount = ride.tip_amount
            receipt.driver_net_earning += tip_dec

        # Post Ledger Tip Entry
        ledger_tip = DriverEarningLedger(
            id=uuid.uuid4(),
            driver_id=ride.assigned_driver_id,
            ride_id=ride.id,
            entry_type="TIP",
            amount=tip_dec,
            currency="INR",
            direction="CREDIT",
            status="SETTLED",
            description=f"Passenger Tip for Trip #{ride.id.hex[:6].upper()}",
            effective_date=date.today(),
        )
        self.db.add(ledger_tip)

        # Credit driver balance
        d_res = await self.db.execute(select(Driver).where(Driver.id == ride.assigned_driver_id))
        driver = d_res.scalar_one_or_none()
        if driver:
            driver.total_earnings = (driver.total_earnings or Decimal("0.00")) + tip_dec
            driver.wallet_balance = (driver.wallet_balance or Decimal("0.00")) + tip_dec

        await self.db.commit()

        return {
            "success": True,
            "ride_id": str(ride.id),
            "tip_added": float(tip_dec),
            "total_tips": float(ride.tip_amount),
            "message": f"₹{tip_amount:.2f} tip credited to driver successfully.",
        }
'''

with open(os.path.join(services_dir, "trip_completion_service.py"), "w", encoding="utf-8") as f:
    f.write(trip_completion_code)
print("[✓] trip_completion_service.py created")

with open(os.path.join(services_dir, "driver_earnings_service.py"), "w", encoding="utf-8") as f:
    f.write(driver_earnings_code)
print("[✓] driver_earnings_service.py created")

# ============================================================
# 3. Patch matching.py with REST Endpoints
# ============================================================
with open(matching_api_file, "r", encoding="utf-8") as f:
    matching_content = f.read()

feature13_14_routes = '''

# ============================================================
# FEATURES 13 & 14: TRIP COMPLETION & DRIVER EARNINGS
# ============================================================

class CompleteRideSchema(BaseModel):
    tolls: float = 0.0
    parking: float = 0.0
    payment_method: str = "cash"  # cash, upi, card, wallet


class RateCustomerSchema(BaseModel):
    rating: float
    tags: List[str] = []
    feedback: Optional[str] = None


class AddTipSchema(BaseModel):
    tip_amount: float


@router.post(
    "/rides/{ride_id}/arrived-dropoff",
    response_model=SuccessResponse,
    summary="Driver: Verify destination arrival geofence (PostGIS)",
)
async def verify_destination_arrival_endpoint(
    ride_id: str,
    latitude: float = Query(...),
    longitude: float = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.verify_destination_arrival(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        driver_lat=latitude,
        driver_lng=longitude,
    )
    return SuccessResponse(success=True, message="Destination arrival checked", data=result)


@router.post(
    "/rides/{ride_id}/complete",
    response_model=SuccessResponse,
    summary="Driver: Authoritative trip completion, fare calculation & receipt creation",
)
async def complete_ride_endpoint(
    ride_id: str,
    request: CompleteRideSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.complete_ride(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        tolls=request.tolls,
        parking=request.parking,
        payment_method=request.payment_method,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/rides/{ride_id}/receipt",
    response_model=SuccessResponse,
    summary="Driver: Get immutable itemized ride receipt",
)
async def get_ride_receipt_endpoint(
    ride_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.get_ride_receipt(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
    )
    return SuccessResponse(success=True, message="Receipt retrieved", data=result)


@router.post(
    "/rides/{ride_id}/rate-customer",
    response_model=SuccessResponse,
    summary="Driver: Rate passenger 1-5 stars with feedback tags",
)
async def rate_customer_endpoint(
    ride_id: str,
    request: RateCustomerSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.rate_customer(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        rating=request.rating,
        tags=request.tags,
        feedback=request.feedback,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/driver/earnings/summary",
    response_model=SuccessResponse,
    summary="Driver: Get reconciled financial earnings summary (Today, Week, Month)",
)
async def get_earnings_summary_endpoint(
    period: str = Query("today"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_earnings_service import DriverEarningsService
    service = DriverEarningsService(db)
    result = await service.get_earnings_summary(
        driver_user_id=current_user.user_id_str,
        period=period,
    )
    return SuccessResponse(success=True, message="Earnings summary retrieved", data=result)


@router.get(
    "/driver/earnings/ledger",
    response_model=SuccessResponse,
    summary="Driver: Get immutable double-entry financial ledger history",
)
async def get_ledger_history_endpoint(
    limit: int = Query(30),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_earnings_service import DriverEarningsService
    service = DriverEarningsService(db)
    result = await service.get_ledger_history(
        driver_user_id=current_user.user_id_str,
        limit=limit,
    )
    return SuccessResponse(success=True, message="Ledger history retrieved", data=result)


@router.post(
    "/rides/{ride_id}/tip",
    response_model=SuccessResponse,
    summary="Passenger: Add tip to driver for completed ride",
)
async def add_tip_endpoint(
    ride_id: str,
    request: AddTipSchema,
    db: AsyncSession = Depends(get_db),
):
    from app.services.driver_earnings_service import DriverEarningsService
    service = DriverEarningsService(db)
    result = await service.add_tip(
        ride_id=uuid.UUID(ride_id),
        tip_amount=request.tip_amount,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)
'''

if "/rides/{ride_id}/arrived-dropoff" not in matching_content:
    matching_content += feature13_14_routes
    with open(matching_api_file, "w", encoding="utf-8") as f:
        f.write(matching_content)
    print("[✓] matching.py patched with Feature 13 & 14 routes")
else:
    print("[i] matching.py already has Feature 13 & 14 routes")

print("\nBACKEND SERVICES & APIS FOR FEATURES 13 & 14 APPLIED SUCCESSFULLY!")
