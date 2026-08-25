"""
Feature 19 — Rental / Hourly Service
Backend-authoritative time + KM based vehicle rental engine.
Timer start time is recorded in PostgreSQL — never trusted from phone clock.
Extra KM and Extra Hour computed server-side at completion.
"""
import uuid
import random
import string
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    CustomerProfile, Driver, Vehicle,
    RentalPlan, RentalBooking, RentalStop, RentalUsageEvent,
    RentalBookingStatus, WalletTransaction, LedgerType,
)

log = structlog.get_logger()


def _generate_reference() -> str:
    """RNT-YYMMDD-XXXX"""
    today = datetime.now(timezone.utc).strftime("%y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"RNT-{today}-{suffix}"


class RentalService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── 1. Plans ──────────────────────────────────────────────────────────────

    async def list_rental_plans(self, vehicle_category: Optional[str] = None):
        """List active backend-configured rental plans."""
        q = select(RentalPlan).where(RentalPlan.is_active == True)
        if vehicle_category:
            q = q.where(RentalPlan.vehicle_category == vehicle_category.upper())
        q = q.order_by(RentalPlan.sort_order, RentalPlan.duration_minutes)
        result = await self.db.execute(q)
        plans = result.scalars().all()
        return [
            {
                "plan_id": str(p.id),
                "name": p.name,
                "duration_minutes": p.duration_minutes,
                "duration_label": f"{p.duration_minutes // 60}h" if p.duration_minutes < 480 else "8h",
                "included_km": p.included_km,
                "base_price": float(p.base_price),
                "extra_km_rate": float(p.extra_km_rate),
                "extra_hour_rate": float(p.extra_hour_rate),
                "vehicle_category": p.vehicle_category,
                "gst_percentage": p.gst_percentage,
                "min_custom_minutes": p.min_custom_minutes,
                "max_custom_minutes": p.max_custom_minutes,
            }
            for p in plans
        ]

    # ── 2. Estimate ───────────────────────────────────────────────────────────

    async def estimate_rental(
        self,
        plan_id: str,
        vehicle_category: str,
        custom_duration_minutes: Optional[int] = None,
        promo_code: Optional[str] = None,
    ) -> dict:
        """Calculate fare estimate for a rental plan."""
        plan = await self.db.get(RentalPlan, uuid.UUID(plan_id))
        if not plan:
            raise ValueError(f"Rental plan {plan_id} not found")

        # Use custom duration if valid
        effective_minutes = custom_duration_minutes or plan.duration_minutes
        if custom_duration_minutes:
            if plan.min_custom_minutes and custom_duration_minutes < plan.min_custom_minutes:
                raise ValueError(f"Minimum duration is {plan.min_custom_minutes} minutes")
            if plan.max_custom_minutes and custom_duration_minutes > plan.max_custom_minutes:
                raise ValueError(f"Maximum duration is {plan.max_custom_minutes} minutes")

        base_price = float(plan.base_price)
        # Scale base price for custom duration vs standard plan
        if custom_duration_minutes and custom_duration_minutes != plan.duration_minutes:
            scale = custom_duration_minutes / plan.duration_minutes
            base_price = round(base_price * scale, 2)

        discount = 0.0
        if promo_code and promo_code.upper() in ("RENTAL10", "CORP20"):
            pct = 10 if promo_code.upper() == "RENTAL10" else 20
            discount = round(base_price * pct / 100, 2)

        taxable = base_price - discount
        gst = round(taxable * plan.gst_percentage / 100, 2)
        total = round(taxable + gst, 2)

        return {
            "plan_id": str(plan.id),
            "plan_name": plan.name,
            "vehicle_category": vehicle_category,
            "effective_duration_minutes": effective_minutes,
            "included_km": plan.included_km,
            "base_price": base_price,
            "extra_km_rate": float(plan.extra_km_rate),
            "extra_hour_rate": float(plan.extra_hour_rate),
            "discount_amount": discount,
            "gst_amount": gst,
            "estimated_fare": total,
            "breakdown": {
                "Plan Base": base_price,
                "Promo Discount": f"-{discount}" if discount else None,
                f"GST ({plan.gst_percentage}%)": gst,
                "Total": total,
            },
        }

    # ── 3. Create Booking ──────────────────────────────────────────────────────

    async def create_rental_booking(
        self,
        customer_id: str,
        plan_id: str,
        vehicle_category: str,
        pickup_address: str,
        pickup_lat: float,
        pickup_lng: float,
        custom_duration_minutes: Optional[int] = None,
        promo_code: Optional[str] = None,
        payment_method: str = "WALLET",
        company_id: Optional[str] = None,
        membership_id: Optional[str] = None,
        department_id: Optional[str] = None,
        is_business_trip: bool = False,
        business_purpose: Optional[str] = None,
    ) -> dict:
        """
        Create confirmed rental booking with priority driver assignment.
        Debit customer wallet (estimated fare hold).
        """
        # Load customer profile
        cust_q = select(CustomerProfile).where(
            CustomerProfile.user_id == uuid.UUID(customer_id)
        )
        cust_res = await self.db.execute(cust_q)
        customer = cust_res.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer profile not found")

        # Calculate estimate
        est = await self.estimate_rental(
            plan_id, vehicle_category, custom_duration_minutes, promo_code
        )

        plan = await self.db.get(RentalPlan, uuid.UUID(plan_id))
        effective_minutes = custom_duration_minutes or plan.duration_minutes

        # Wallet debit
        if payment_method == "WALLET":
            if customer.wallet_balance < Decimal(str(est["estimated_fare"])):
                raise ValueError("Insufficient wallet balance")
            customer.wallet_balance -= Decimal(str(est["estimated_fare"]))

        # Assign nearest available driver (simplified — production uses matching service)
        driver_q = select(Driver).where(
            Driver._is_online == True,
            Driver._is_active == True,
            Driver.status.in_(["online"]),
        ).limit(3)
        driver_res = await self.db.execute(driver_q)
        drivers = driver_res.scalars().all()
        assigned_driver = drivers[0] if drivers else None
        assigned_vehicle = None
        if assigned_driver:
            veh_q = select(Vehicle).where(Vehicle.driver_id == assigned_driver.id)
            veh_res = await self.db.execute(veh_q)
            assigned_vehicle = veh_res.scalar_one_or_none()

        # Create booking
        reference = _generate_reference()
        booking = RentalBooking(
            id=uuid.uuid4(),
            reference=reference,
            customer_id=customer.id,
            driver_id=assigned_driver.id if assigned_driver else None,
            vehicle_id=assigned_vehicle.id if assigned_vehicle else None,
            plan_id=plan.id,
            vehicle_category=vehicle_category.upper(),
            custom_duration_minutes=custom_duration_minutes,
            pickup_address=pickup_address,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            included_km=plan.included_km,
            planned_duration_minutes=effective_minutes,
            planned_end_time=None,  # set on actual start
            base_plan_fare=Decimal(str(est["base_price"])),
            discount_amount=Decimal(str(est["discount_amount"])),
            gst_amount=Decimal(str(est["gst_amount"])),
            estimated_fare=Decimal(str(est["estimated_fare"])),
            payment_method=payment_method,
            payment_status="PAID" if payment_method == "WALLET" else "PENDING",
            promo_code=promo_code,
            company_id=uuid.UUID(company_id) if company_id else None,
            membership_id=uuid.UUID(membership_id) if membership_id else None,
            department_id=uuid.UUID(department_id) if department_id else None,
            is_business_trip=is_business_trip,
            business_purpose=business_purpose,
            status=RentalBookingStatus.DRIVER_ASSIGNED if assigned_driver else RentalBookingStatus.PENDING,
        )
        self.db.add(booking)

        # Record wallet transaction
        if payment_method == "WALLET":
            txn = WalletTransaction(
                id=uuid.uuid4(),
                user_id=uuid.UUID(customer_id),
                amount=Decimal(str(est["estimated_fare"])),
                transaction_type=LedgerType.WALLET_DEBIT,
                direction="DEBIT",
                bucket="CASH",
                balance_after=customer.wallet_balance,
                description=f"Rental Booking {reference} — Hold",
            )
            self.db.add(txn)

        await self.db.commit()

        log.info(
            "Rental booking created",
            reference=reference,
            driver_assigned=assigned_driver is not None,
            estimated_fare=est["estimated_fare"],
        )

        return {
            "reference": reference,
            "booking_id": str(booking.id),
            "status": booking.status.value,
            "plan": est["plan_name"],
            "duration_minutes": effective_minutes,
            "included_km": plan.included_km,
            "estimated_fare": est["estimated_fare"],
            "driver": {
                "name": assigned_driver.full_name,
                "phone": assigned_driver.phone,
                "rating": assigned_driver.rating,
                "vehicle_plate": assigned_vehicle.registration_number if assigned_vehicle else None,
            } if assigned_driver else None,
        }

    # ── 4. Start Rental ───────────────────────────────────────────────────────

    async def start_rental(
        self,
        booking_id: str,
        driver_id: str,
        otp: Optional[str] = None,
    ) -> dict:
        """
        Backend records authoritative actual_start_time.
        Phone clock is NOT trusted. Timer starts here.
        """
        booking = await self.db.get(RentalBooking, uuid.UUID(booking_id))
        if not booking:
            raise ValueError("Rental booking not found")
        if str(booking.driver_id) != driver_id:
            raise ValueError("Driver not authorized for this booking")
        if booking.status not in (RentalBookingStatus.DRIVER_ARRIVED, RentalBookingStatus.DRIVER_ASSIGNED):
            raise ValueError(f"Cannot start rental in status {booking.status.value}")

        now = datetime.now(timezone.utc)
        booking.actual_start_time = now
        booking.planned_end_time = now + timedelta(minutes=booking.planned_duration_minutes)
        booking.status = RentalBookingStatus.ACTIVE

        # Record usage event
        event = RentalUsageEvent(
            id=uuid.uuid4(),
            booking_id=booking.id,
            event_type="START",
            km_at_event=0.0,
            elapsed_minutes=0,
            notes="Rental started",
        )
        self.db.add(event)
        await self.db.commit()

        log.info("Rental started", booking_ref=booking.reference, start_time=now.isoformat())

        return {
            "booking_id": booking_id,
            "actual_start_time": now.isoformat(),
            "planned_end_time": booking.planned_end_time.isoformat(),
            "included_km": booking.included_km,
            "status": "active",
        }

    # ── 5. KM Update ──────────────────────────────────────────────────────────

    async def update_km(
        self,
        booking_id: str,
        current_lat: float,
        current_lng: float,
        current_km: float,
    ) -> dict:
        """
        Backend records actual KM from GPS telemetry (computed server-side from PostGIS).
        current_km is the backend-computed cumulative distance.
        """
        booking = await self.db.get(RentalBooking, uuid.UUID(booking_id))
        if not booking or booking.status != RentalBookingStatus.ACTIVE:
            return {}

        booking.actual_km = current_km
        booking.extra_km = max(0.0, current_km - booking.included_km)

        now = datetime.now(timezone.utc)
        elapsed = int((now - booking.actual_start_time).total_seconds() / 60) if booking.actual_start_time else 0

        event = RentalUsageEvent(
            id=uuid.uuid4(),
            booking_id=booking.id,
            event_type="KM_UPDATE",
            latitude=current_lat,
            longitude=current_lng,
            km_at_event=current_km,
            elapsed_minutes=elapsed,
        )
        self.db.add(event)
        await self.db.commit()

        return {
            "actual_km": round(current_km, 2),
            "included_km": booking.included_km,
            "extra_km": round(booking.extra_km, 2),
            "elapsed_minutes": elapsed,
        }

    # ── 6. Add Stop ───────────────────────────────────────────────────────────

    async def add_stop(
        self,
        booking_id: str,
        address: str,
        latitude: float,
        longitude: float,
    ) -> dict:
        """Add a waypoint to active rental. Driver notified via Socket.IO (outside this service)."""
        booking = await self.db.get(RentalBooking, uuid.UUID(booking_id))
        if not booking:
            raise ValueError("Rental booking not found")
        if booking.status != RentalBookingStatus.ACTIVE:
            raise ValueError("Can only add stops to active rentals")

        # Determine next stop order
        stops_q = select(RentalStop).where(RentalStop.booking_id == booking.id)
        stops_res = await self.db.execute(stops_q)
        existing_stops = stops_res.scalars().all()
        stop_order = len(existing_stops) + 1

        stop = RentalStop(
            id=uuid.uuid4(),
            booking_id=booking.id,
            stop_order=stop_order,
            address=address,
            latitude=latitude,
            longitude=longitude,
            status="PENDING",
        )
        self.db.add(stop)

        event = RentalUsageEvent(
            id=uuid.uuid4(),
            booking_id=booking.id,
            event_type="STOP_ADDED",
            latitude=latitude,
            longitude=longitude,
            km_at_event=booking.actual_km,
            notes=f"Stop added: {address[:50]}",
        )
        self.db.add(event)
        await self.db.commit()

        log.info("Rental stop added", booking=booking.reference, stop_order=stop_order)

        return {"stop_id": str(stop.id), "stop_order": stop_order, "address": address}

    # ── 7. Complete Rental ────────────────────────────────────────────────────

    async def complete_rental(
        self,
        booking_id: str,
        driver_id: str,
        final_km: float,
        toll_charge: float = 0.0,
        parking_charge: float = 0.0,
    ) -> dict:
        """
        Backend calculates authoritative final fare:
        Plan Base + Extra KM + Extra Hour + Toll + Parking - Discount + GST
        """
        booking = await self.db.get(RentalBooking, uuid.UUID(booking_id))
        if not booking:
            raise ValueError("Rental booking not found")
        if booking.status != RentalBookingStatus.ACTIVE:
            raise ValueError(f"Cannot complete rental in status {booking.status.value}")

        plan = await self.db.get(RentalPlan, booking.plan_id)

        now = datetime.now(timezone.utc)
        booking.actual_end_time = now
        booking.actual_km = final_km
        booking.extra_km = max(0.0, final_km - booking.included_km)

        # Duration delta
        actual_minutes = int((now - booking.actual_start_time).total_seconds() / 60) if booking.actual_start_time else booking.planned_duration_minutes
        booking.actual_duration_minutes = actual_minutes
        extra_mins = max(0, actual_minutes - booking.planned_duration_minutes)
        booking.extra_duration_minutes = extra_mins

        # Fare calculation — backend authoritative
        extra_km_charge = round(float(booking.extra_km) * float(plan.extra_km_rate), 2)
        extra_hour_charge = round((extra_mins / 60) * float(plan.extra_hour_rate), 2)
        booking.extra_km_charge = Decimal(str(extra_km_charge))
        booking.extra_hour_charge = Decimal(str(extra_hour_charge))
        booking.toll_charge = Decimal(str(toll_charge))
        booking.parking_charge = Decimal(str(parking_charge))

        taxable = (
            float(booking.base_plan_fare)
            + extra_km_charge
            + extra_hour_charge
            + toll_charge
            + parking_charge
            - float(booking.discount_amount)
        )
        gst = round(taxable * plan.gst_percentage / 100, 2)
        booking.gst_amount = Decimal(str(gst))
        final_fare = round(taxable + gst, 2)
        booking.final_fare = Decimal(str(final_fare))
        booking.status = RentalBookingStatus.COMPLETED

        # Settle driver earnings (reuse existing earnings pattern)
        driver = await self.db.get(Driver, booking.driver_id)
        if driver:
            platform_commission = round(final_fare * 0.20, 2)
            driver_earning = round(final_fare - platform_commission, 2)
            driver.total_earnings += Decimal(str(driver_earning))
            driver.wallet_balance += Decimal(str(driver_earning))
            driver.total_trips += 1

            earnings_txn = WalletTransaction(
                id=uuid.uuid4(),
                user_id=driver.user_id,
                amount=Decimal(str(driver_earning)),
                transaction_type=LedgerType.SETTLEMENT,
                direction="CREDIT",
                bucket="CASH",
                balance_after=driver.wallet_balance,
                description=f"Rental Earnings {booking.reference}",
            )
            self.db.add(earnings_txn)

            try:
                from common.models.all_models import DriverEarningLedger
                from datetime import date
                ledger_entry = DriverEarningLedger(
                    id=uuid.uuid4(),
                    driver_id=driver.id,
                    entry_type="RENTAL_EARNING",
                    amount=Decimal(str(driver_earning)),
                    currency="INR",
                    direction="CREDIT",
                    status="SETTLED",
                    description=f"Earnings for Hourly Rental #{booking.reference}",
                    effective_date=date.today(),
                    metadata_json={
                        "booking_id": str(booking.id),
                        "reference": booking.reference,
                        "plan_id": str(booking.plan_id),
                        "final_fare": float(final_fare),
                        "driver_earning": float(driver_earning),
                        "platform_commission": float(platform_commission),
                    },
                )
                self.db.add(ledger_entry)
            except Exception as ex:
                log.warning("DriverEarningLedger insertion note", error=str(ex))

        # Refund/charge delta on customer wallet
        cust_q = select(CustomerProfile).where(CustomerProfile.id == booking.customer_id)
        cust_res = await self.db.execute(cust_q)
        customer = cust_res.scalar_one_or_none()
        if customer and booking.payment_method == "WALLET":
            delta = float(booking.estimated_fare) - final_fare
            if delta > 0:
                customer.wallet_balance += Decimal(str(delta))
                refund_txn = WalletTransaction(
                    id=uuid.uuid4(),
                    user_id=customer.user_id,
                    amount=Decimal(str(delta)),
                    transaction_type=LedgerType.REFUND,
                    direction="CREDIT",
                    bucket="CASH",
                    balance_after=customer.wallet_balance,
                    description=f"Rental Refund {booking.reference}",
                )
                self.db.add(refund_txn)
            elif delta < 0:
                extra_charge = abs(delta)
                if customer.wallet_balance >= Decimal(str(extra_charge)):
                    customer.wallet_balance -= Decimal(str(extra_charge))
                    extra_txn = WalletTransaction(
                        id=uuid.uuid4(),
                        user_id=customer.user_id,
                        amount=Decimal(str(extra_charge)),
                        transaction_type=LedgerType.WALLET_DEBIT,
                        direction="DEBIT",
                        bucket="CASH",
                        balance_after=customer.wallet_balance,
                        description=f"Rental Extra Charges {booking.reference}",
                    )
                    self.db.add(extra_txn)

        # Record completion event
        event = RentalUsageEvent(
            id=uuid.uuid4(),
            booking_id=booking.id,
            event_type="COMPLETE",
            km_at_event=final_km,
            elapsed_minutes=actual_minutes,
            notes=f"Rental completed. Final fare: ₹{final_fare}",
        )
        self.db.add(event)
        await self.db.commit()

        log.info(
            "Rental completed",
            reference=booking.reference,
            final_fare=final_fare,
            actual_km=final_km,
            actual_minutes=actual_minutes,
        )

        return {
            "reference": booking.reference,
            "status": "completed",
            "actual_km": round(final_km, 2),
            "included_km": booking.included_km,
            "extra_km": round(float(booking.extra_km), 2),
            "actual_duration_minutes": actual_minutes,
            "planned_duration_minutes": booking.planned_duration_minutes,
            "extra_duration_minutes": extra_mins,
            "fare_breakdown": {
                "Plan Base": float(booking.base_plan_fare),
                "Extra KM": extra_km_charge,
                "Extra Hour": extra_hour_charge,
                "Toll": toll_charge,
                "Parking": parking_charge,
                "Discount": f"-{float(booking.discount_amount)}",
                "GST (5%)": gst,
                "Final Total": final_fare,
            },
            "final_fare": final_fare,
        }

    # ── 8. Cancel Rental ──────────────────────────────────────────────────────

    async def cancel_rental(
        self,
        booking_id: str,
        reason: Optional[str] = None,
    ) -> dict:
        """Cancel rental booking. Full refund if not yet started."""
        booking = await self.db.get(RentalBooking, uuid.UUID(booking_id))
        if not booking:
            raise ValueError("Rental booking not found")
        if booking.status == RentalBookingStatus.ACTIVE:
            raise ValueError("Cannot cancel an active rental. Complete it instead.")
        if booking.status in (RentalBookingStatus.COMPLETED, RentalBookingStatus.CANCELLED):
            raise ValueError(f"Rental already {booking.status.value}")

        booking.status = RentalBookingStatus.CANCELLED
        booking.cancelled_reason = reason or "Customer cancelled"
        refund = float(booking.estimated_fare)
        booking.refund_amount = Decimal(str(refund))

        # Refund wallet
        cust_q = select(CustomerProfile).where(CustomerProfile.id == booking.customer_id)
        cust_res = await self.db.execute(cust_q)
        customer = cust_res.scalar_one_or_none()
        if customer and booking.payment_method == "WALLET":
            customer.wallet_balance += Decimal(str(refund))
            refund_txn = WalletTransaction(
                id=uuid.uuid4(),
                user_id=customer.user_id,
                amount=Decimal(str(refund)),
                transaction_type=LedgerType.REFUND,
                direction="CREDIT",
                bucket="CASH",
                balance_after=customer.wallet_balance,
                description=f"Rental Cancelled {booking.reference} — Full Refund",
            )
            self.db.add(refund_txn)

        await self.db.commit()
        log.info("Rental cancelled", reference=booking.reference, refund=refund)

        return {
            "reference": booking.reference,
            "status": "cancelled",
            "refund_amount": refund,
        }

    # ── 9. Get Booking ────────────────────────────────────────────────────────

    async def get_booking(self, booking_id: str) -> dict:
        """Retrieve full rental booking details with live timer state."""
        booking = await self.db.get(RentalBooking, uuid.UUID(booking_id))
        if not booking:
            raise ValueError("Rental booking not found")

        elapsed_minutes = 0
        if booking.actual_start_time and booking.status == RentalBookingStatus.ACTIVE:
            elapsed_minutes = int(
                (datetime.now(timezone.utc) - booking.actual_start_time).total_seconds() / 60
            )

        driver_info = None
        if booking.driver_id:
            driver = await self.db.get(Driver, booking.driver_id)
            vehicle = None
            if driver:
                veh_q = select(Vehicle).where(Vehicle.driver_id == driver.id)
                veh_res = await self.db.execute(veh_q)
                vehicle = veh_res.scalar_one_or_none()
            driver_info = {
                "name": driver.full_name if driver else None,
                "phone": driver.phone if driver else None,
                "rating": driver.rating if driver else None,
                "vehicle_plate": vehicle.registration_number if vehicle else None,
                "vehicle_model": vehicle.model if vehicle else None,
            }

        stops_q = select(RentalStop).where(RentalStop.booking_id == booking.id).order_by(RentalStop.stop_order)
        stops_res = await self.db.execute(stops_q)
        stops = [
            {"stop_order": s.stop_order, "address": s.address, "status": s.status}
            for s in stops_res.scalars().all()
        ]

        return {
            "booking_id": booking_id,
            "reference": booking.reference,
            "status": booking.status.value,
            "plan_id": str(booking.plan_id),
            "vehicle_category": booking.vehicle_category,
            "pickup_address": booking.pickup_address,
            "pickup_lat": booking.pickup_lat,
            "pickup_lng": booking.pickup_lng,
            "included_km": booking.included_km,
            "actual_km": booking.actual_km,
            "extra_km": booking.extra_km,
            "planned_duration_minutes": booking.planned_duration_minutes,
            "actual_duration_minutes": booking.actual_duration_minutes,
            "extra_duration_minutes": booking.extra_duration_minutes,
            "elapsed_minutes": elapsed_minutes,
            "actual_start_time": booking.actual_start_time.isoformat() if booking.actual_start_time else None,
            "planned_end_time": booking.planned_end_time.isoformat() if booking.planned_end_time else None,
            "estimated_fare": float(booking.estimated_fare),
            "final_fare": float(booking.final_fare) if booking.final_fare else None,
            "driver": driver_info,
            "stops": stops,
            "is_business_trip": booking.is_business_trip,
        }

    # ── 10. Get Active Rental ────────────────────────────────────────────────

    async def get_active_rental(self, customer_id: str) -> Optional[dict]:
        """Get the currently active rental for a customer."""
        cust_q = select(CustomerProfile).where(CustomerProfile.user_id == uuid.UUID(customer_id))
        cust_res = await self.db.execute(cust_q)
        customer = cust_res.scalar_one_or_none()
        if not customer:
            return None

        q = select(RentalBooking).where(
            RentalBooking.customer_id == customer.id,
            RentalBooking.status.in_([
                RentalBookingStatus.ACTIVE,
                RentalBookingStatus.DRIVER_ASSIGNED,
                RentalBookingStatus.DRIVER_EN_ROUTE,
                RentalBookingStatus.DRIVER_ARRIVED,
            ])
        ).order_by(RentalBooking.created_at.desc()).limit(1)
        result = await self.db.execute(q)
        booking = result.scalar_one_or_none()
        if not booking:
            return None

        return await self.get_booking(str(booking.id))
