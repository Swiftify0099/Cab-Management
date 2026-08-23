"""
Feature 20 — Outstation / Intercity Service
Intercity journey contract engine.
Supports ONE_WAY, ROUND_TRIP, MULTI_CITY with legs + waypoints.
State tax computed via PostGIS geofence (simplified: from route config).
Driver allowance, night halt, toll — all backend-authoritative.
"""
import uuid
import random
import string
from datetime import datetime, timezone, timedelta, date as date_type
from decimal import Decimal
from typing import Optional, List

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    CustomerProfile, Driver, Vehicle,
    OutstationBooking, OutstationLeg, OutstationWaypoint,
    OutstationCharge, OutstationBookingStatus, OutstationLegStatus,
    OutstationJourneyType, OutstationChargeType,
    WalletTransaction, LedgerType,
)

log = structlog.get_logger()


# Backend-configured outstation pricing (in production, these come from a routes DB table)
_BASE_RATE_PER_KM = {
    "HATCHBACK": 10.0,
    "SEDAN":     14.0,
    "SUV":       18.0,
    "TEMPO":     22.0,
}
_DRIVER_ALLOWANCE_PER_DAY = 500.0
_NIGHT_HALT_BASE = 1000.0
_STATE_TAX_RATE = 0.01  # 1% of base fare for state border crossing
_GST_RATE = 0.05
_DRIVER_SHARE = 0.80


def _generate_reference() -> str:
    today = datetime.now(timezone.utc).strftime("%y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"OUT-{today}-{suffix}"


def _compute_road_km(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> float:
    """
    Simple Haversine-based estimate with 1.35 road factor.
    In production: call RoutingService (OSRM/Google) once at booking creation.
    """
    import math
    R = 6371.0
    dLat = math.radians(dest_lat - origin_lat)
    dLon = math.radians(dest_lng - origin_lng)
    a = math.sin(dLat / 2) ** 2 + math.cos(math.radians(origin_lat)) * math.cos(math.radians(dest_lat)) * math.sin(dLon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    air_km = R * c
    return round(air_km * 1.35, 2)  # road factor


class OutstationService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── 1. Estimate ───────────────────────────────────────────────────────────

    async def estimate_outstation(
        self,
        journey_type: str,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        vehicle_category: str,
        scheduled_departure: str,
        return_date: Optional[str] = None,
        additional_legs: Optional[List[dict]] = None,
        promo_code: Optional[str] = None,
        passenger_count: int = 1,
    ) -> dict:
        """
        Calculate full outstation fare estimate.
        Backend-authoritative — all charges computed server-side.
        """
        journey_type = journey_type.upper()
        vc = vehicle_category.upper()
        rate = _BASE_RATE_PER_KM.get(vc, 14.0)

        # Outbound leg KM
        outbound_km = _compute_road_km(origin_lat, origin_lng, dest_lat, dest_lng)
        total_km = outbound_km
        estimated_hours = round(outbound_km / 60, 1)  # avg 60 km/h

        base_fare = round(outbound_km * rate, 2)

        # Round trip
        if journey_type in ("ROUND_TRIP", "ONE_WAY_RETURN"):
            return_km = outbound_km
            total_km += return_km
            base_fare += round(return_km * rate * 0.9, 2)  # 10% return discount

        # Multi-city
        if journey_type == "MULTI_CITY" and additional_legs:
            for leg in additional_legs:
                leg_km = _compute_road_km(
                    leg.get("from_lat", origin_lat), leg.get("from_lng", origin_lng),
                    leg.get("to_lat", dest_lat), leg.get("to_lng", dest_lng)
                )
                total_km += leg_km
                base_fare += round(leg_km * rate, 2)

        # Toll estimate (backend configurable — ₹50 per 100 km)
        toll_estimate = round((total_km / 100) * 50, 2)

        # State tax (PostGIS-based in production — simplified: 1% of base for cross-state)
        state_tax = round(base_fare * _STATE_TAX_RATE, 2)

        # Night halt (auto-triggered if round-trip spans overnight)
        night_halt_charge = 0.0
        nights = 0
        if journey_type == "ROUND_TRIP" and return_date and scheduled_departure:
            dep = datetime.fromisoformat(scheduled_departure.replace("Z", "+00:00"))
            ret = datetime.fromisoformat(return_date.replace("Z", "+00:00"))
            nights = max(0, (ret.date() - dep.date()).days)
            night_halt_charge = round(nights * _NIGHT_HALT_BASE, 2)

        # Driver allowance (₹500/day for outstation)
        days = max(1, nights + 1)
        driver_allowance = round(days * _DRIVER_ALLOWANCE_PER_DAY, 2)

        # Discount
        discount = 0.0
        if promo_code and promo_code.upper() in ("OUT10", "CORP15"):
            pct = 10 if promo_code.upper() == "OUT10" else 15
            discount = round(base_fare * pct / 100, 2)

        taxable = base_fare + toll_estimate + state_tax + night_halt_charge + driver_allowance - discount
        gst = round(taxable * _GST_RATE, 2)
        total = round(taxable + gst, 2)

        return {
            "journey_type": journey_type,
            "vehicle_category": vc,
            "total_km": total_km,
            "outbound_km": outbound_km,
            "estimated_hours": estimated_hours,
            "nights": nights,
            "base_fare": base_fare,
            "toll_estimate": toll_estimate,
            "state_tax": state_tax,
            "night_halt_charge": night_halt_charge,
            "driver_allowance": driver_allowance,
            "discount_amount": discount,
            "gst_amount": gst,
            "estimated_fare": total,
            "breakdown": {
                "Base Fare": base_fare,
                "Estimated Toll": toll_estimate,
                "State Tax": state_tax,
                "Night Halt": night_halt_charge if night_halt_charge else None,
                "Driver Allowance": driver_allowance,
                f"Promo ({promo_code})": f"-{discount}" if discount else None,
                "GST (5%)": gst,
                "Total": total,
            },
        }

    # ── 2. Create Booking ──────────────────────────────────────────────────────

    async def create_outstation_booking(
        self,
        customer_id: str,
        journey_type: str,
        vehicle_category: str,
        passenger_count: int,
        origin_address: str,
        origin_lat: float,
        origin_lng: float,
        destination_address: str,
        destination_lat: float,
        destination_lng: float,
        scheduled_departure: str,
        return_date: Optional[str] = None,
        additional_legs: Optional[List[dict]] = None,
        luggage_count: int = 0,
        promo_code: Optional[str] = None,
        payment_method: str = "WALLET",
        special_instructions: Optional[str] = None,
        company_id: Optional[str] = None,
        membership_id: Optional[str] = None,
        department_id: Optional[str] = None,
        is_business_trip: bool = False,
        business_purpose: Optional[str] = None,
    ) -> dict:
        """Create outstation booking. Driver commits to the FULL journey (all legs)."""

        # Validate customer
        cust_q = select(CustomerProfile).where(CustomerProfile.user_id == uuid.UUID(customer_id))
        cust_res = await self.db.execute(cust_q)
        customer = cust_res.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer profile not found")

        dep_dt = datetime.fromisoformat(scheduled_departure.replace("Z", "+00:00"))

        # Calculate estimate
        est = await self.estimate_outstation(
            journey_type, origin_lat, origin_lng,
            destination_lat, destination_lng, vehicle_category,
            scheduled_departure, return_date, additional_legs, promo_code, passenger_count
        )

        # Wallet debit
        if payment_method == "WALLET":
            if customer.wallet_balance < Decimal(str(est["estimated_fare"])):
                raise ValueError("Insufficient wallet balance")
            customer.wallet_balance -= Decimal(str(est["estimated_fare"]))

        # Assign driver committed to full journey
        driver_q = select(Driver).where(Driver._is_online == True, Driver._is_active == True).limit(3)
        driver_res = await self.db.execute(driver_q)
        drivers = driver_res.scalars().all()
        assigned_driver = drivers[0] if drivers else None
        assigned_vehicle = None
        if assigned_driver:
            veh_q = select(Vehicle).where(Vehicle.driver_id == assigned_driver.id)
            veh_res = await self.db.execute(veh_q)
            assigned_vehicle = veh_res.scalar_one_or_none()

        reference = _generate_reference()
        return_scheduled = None
        if return_date:
            return_scheduled = datetime.fromisoformat(return_date.replace("Z", "+00:00"))

        booking = OutstationBooking(
            id=uuid.uuid4(),
            reference=reference,
            customer_id=customer.id,
            driver_id=assigned_driver.id if assigned_driver else None,
            journey_type=OutstationJourneyType(journey_type.lower()),
            vehicle_category=vehicle_category.upper(),
            passenger_count=passenger_count,
            luggage_count=luggage_count,
            origin_address=origin_address,
            origin_lat=origin_lat,
            origin_lng=origin_lng,
            final_destination_address=destination_address,
            final_destination_lat=destination_lat,
            final_destination_lng=destination_lng,
            scheduled_departure=dep_dt,
            return_scheduled_at=return_scheduled,
            estimated_distance_km=est["total_km"],
            estimated_duration_hours=est["estimated_hours"],
            base_fare=Decimal(str(est["base_fare"])),
            toll_estimate=Decimal(str(est["toll_estimate"])),
            state_tax=Decimal(str(est["state_tax"])),
            night_halt_charge=Decimal(str(est["night_halt_charge"])),
            driver_allowance=Decimal(str(est["driver_allowance"])),
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
            special_instructions=special_instructions,
            status=OutstationBookingStatus.DRIVER_ASSIGNED if assigned_driver else OutstationBookingStatus.CONFIRMED,
        )
        self.db.add(booking)
        await self.db.flush()

        # Create legs
        legs_data = []

        # Outbound leg
        outbound = OutstationLeg(
            id=uuid.uuid4(),
            booking_id=booking.id,
            leg_order=0,
            leg_type="OUTBOUND",
            origin_address=origin_address,
            origin_lat=origin_lat,
            origin_lng=origin_lng,
            destination_address=destination_address,
            destination_lat=destination_lat,
            destination_lng=destination_lng,
            scheduled_at=dep_dt,
            estimated_km=est["outbound_km"],
            estimated_duration_hours=est["estimated_hours"],
            status=OutstationLegStatus.SCHEDULED,
        )
        self.db.add(outbound)
        legs_data.append({"leg_order": 0, "leg_type": "OUTBOUND", "origin": origin_address, "destination": destination_address})

        # Return leg
        if journey_type.upper() == "ROUND_TRIP" and return_scheduled:
            return_leg = OutstationLeg(
                id=uuid.uuid4(),
                booking_id=booking.id,
                leg_order=1,
                leg_type="RETURN",
                origin_address=destination_address,
                origin_lat=destination_lat,
                origin_lng=destination_lng,
                destination_address=origin_address,
                destination_lat=origin_lat,
                destination_lng=origin_lng,
                scheduled_at=return_scheduled,
                estimated_km=est["outbound_km"],
                estimated_duration_hours=est["estimated_hours"],
                status=OutstationLegStatus.SCHEDULED,
            )
            self.db.add(return_leg)
            legs_data.append({"leg_order": 1, "leg_type": "RETURN", "origin": destination_address, "destination": origin_address})

        # Multi-city additional legs
        if journey_type.upper() == "MULTI_CITY" and additional_legs:
            for i, leg in enumerate(additional_legs, 1):
                mc_leg = OutstationLeg(
                    id=uuid.uuid4(),
                    booking_id=booking.id,
                    leg_order=i,
                    leg_type="SEGMENT",
                    origin_address=leg.get("from_address", ""),
                    origin_lat=leg.get("from_lat", 0.0),
                    origin_lng=leg.get("from_lng", 0.0),
                    destination_address=leg.get("to_address", ""),
                    destination_lat=leg.get("to_lat", 0.0),
                    destination_lng=leg.get("to_lng", 0.0),
                    scheduled_at=dep_dt + timedelta(hours=est["estimated_hours"] * i),
                    estimated_km=_compute_road_km(
                        leg.get("from_lat", 0), leg.get("from_lng", 0),
                        leg.get("to_lat", 0), leg.get("to_lng", 0)
                    ),
                    estimated_duration_hours=2.0,
                    status=OutstationLegStatus.SCHEDULED,
                )
                self.db.add(mc_leg)
                legs_data.append({"leg_order": i, "leg_type": "SEGMENT", "origin": leg.get("from_address"), "destination": leg.get("to_address")})

        # Auto-create night halt charge
        if est["night_halt_charge"] > 0:
            nh_charge = OutstationCharge(
                id=uuid.uuid4(),
                booking_id=booking.id,
                charge_type=OutstationChargeType.NIGHT_HALT,
                amount=Decimal(str(est["night_halt_charge"])),
                description=f"Night halt: {est['nights']} night(s)",
                is_customer_approved=True,
                is_driver_earning=True,
            )
            self.db.add(nh_charge)

        # Auto-create driver allowance
        driver_allow = OutstationCharge(
            id=uuid.uuid4(),
            booking_id=booking.id,
            charge_type=OutstationChargeType.DRIVER_ALLOWANCE,
            amount=Decimal(str(est["driver_allowance"])),
            description="Driver travel allowance",
            is_customer_approved=True,
            is_driver_earning=True,
        )
        self.db.add(driver_allow)

        # Wallet transaction
        if payment_method == "WALLET":
            txn = WalletTransaction(
                id=uuid.uuid4(),
                user_id=uuid.UUID(customer_id),
                amount=Decimal(str(est["estimated_fare"])),
                transaction_type=LedgerType.WALLET_DEBIT,
                direction="DEBIT",
                bucket="CASH",
                balance_after=customer.wallet_balance,
                description=f"Outstation Booking {reference} — Hold",
            )
            self.db.add(txn)

        await self.db.commit()
        log.info("Outstation booking created", reference=reference, journey_type=journey_type, legs=len(legs_data))

        return {
            "reference": reference,
            "booking_id": str(booking.id),
            "journey_type": journey_type,
            "status": booking.status.value,
            "estimated_fare": est["estimated_fare"],
            "legs": legs_data,
            "nights": est["nights"],
            "driver": {
                "name": assigned_driver.full_name,
                "phone": assigned_driver.phone,
                "rating": assigned_driver.rating,
                "vehicle": assigned_vehicle.registration_number if assigned_vehicle else None,
            } if assigned_driver else None,
        }

    # ── 3. Update Leg Status ──────────────────────────────────────────────────

    async def update_leg_status(
        self,
        booking_id: str,
        leg_id: str,
        new_status: str,
        current_lat: Optional[float] = None,
        current_lng: Optional[float] = None,
    ) -> dict:
        leg = await self.db.get(OutstationLeg, uuid.UUID(leg_id))
        if not leg or str(leg.booking_id) != booking_id:
            raise ValueError("Leg not found for this booking")

        leg.status = OutstationLegStatus(new_status.lower())
        if new_status.lower() == "in_progress":
            leg.started_at = datetime.now(timezone.utc)
            # Update booking status
            booking = await self.db.get(OutstationBooking, uuid.UUID(booking_id))
            if booking:
                if leg.leg_type == "OUTBOUND":
                    booking.status = OutstationBookingStatus.OUTBOUND_STARTED
                elif leg.leg_type == "RETURN":
                    booking.status = OutstationBookingStatus.RETURN_STARTED
        elif new_status.lower() == "completed":
            leg.completed_at = datetime.now(timezone.utc)

        await self.db.commit()
        return {"leg_id": leg_id, "status": new_status, "leg_type": leg.leg_type}

    # ── 4. Add Charge ─────────────────────────────────────────────────────────

    async def add_outstation_charge(
        self,
        booking_id: str,
        charge_type: str,
        amount: float,
        description: Optional[str] = None,
        evidence_url: Optional[str] = None,
        state_name: Optional[str] = None,
    ) -> dict:
        """
        Add platform-verified charge (toll, parking, extra KM).
        Driver submits with evidence. Customer approves.
        Amount must come from backend policy or verified receipt — never driver self-report.
        """
        booking = await self.db.get(OutstationBooking, uuid.UUID(booking_id))
        if not booking:
            raise ValueError("Booking not found")

        charge = OutstationCharge(
            id=uuid.uuid4(),
            booking_id=booking.id,
            charge_type=OutstationChargeType(charge_type.lower()),
            amount=Decimal(str(amount)),
            description=description,
            evidence_url=evidence_url,
            is_customer_approved=False,  # customer must approve
            is_driver_earning=charge_type.lower() in ("night_halt", "driver_allowance"),
            state_name=state_name,
        )
        self.db.add(charge)
        await self.db.commit()

        log.info("Outstation charge requested", booking=booking.reference, type=charge_type, amount=amount)
        return {"charge_id": str(charge.id), "charge_type": charge_type, "amount": amount, "status": "PENDING_CUSTOMER_APPROVAL"}

    # ── 5. Complete Outstation ────────────────────────────────────────────────

    async def complete_outstation(self, booking_id: str, driver_id: str, final_km: float) -> dict:
        booking = await self.db.get(OutstationBooking, uuid.UUID(booking_id))
        if not booking:
            raise ValueError("Booking not found")
        if booking.status == OutstationBookingStatus.COMPLETED:
            raise ValueError("Already completed")

        # Sum all approved charges
        charges_q = select(OutstationCharge).where(OutstationCharge.booking_id == booking.id)
        charges_res = await self.db.execute(charges_q)
        all_charges = charges_res.scalars().all()

        additional_total = sum(
            float(c.amount) for c in all_charges
            if c.is_customer_approved and c.charge_type not in (
                OutstationChargeType.NIGHT_HALT, OutstationChargeType.DRIVER_ALLOWANCE
            )
        )

        booking.actual_distance_km = final_km
        extra_km = max(0.0, final_km - (booking.included_km or 0))

        extra_km_charge = 0.0
        if extra_km > 0:
            rate = _BASE_RATE_PER_KM.get(booking.vehicle_category, 14.0)
            extra_km_charge = round(extra_km * rate, 2)
            booking.extra_km_charge = Decimal(str(extra_km_charge))

        final_fare = float(booking.estimated_fare) + additional_total + extra_km_charge
        booking.final_fare = Decimal(str(round(final_fare, 2)))
        booking.status = OutstationBookingStatus.COMPLETED

        # Driver earnings
        driver = await self.db.get(Driver, booking.driver_id)
        if driver:
            # Driver allowance is credited separately
            driver_allowance_total = sum(
                float(c.amount) for c in all_charges if c.is_driver_earning
            )
            base_earning = round(float(booking.estimated_fare) * _DRIVER_SHARE, 2)
            total_earning = round(base_earning + driver_allowance_total, 2)
            driver.total_earnings += Decimal(str(total_earning))
            driver.wallet_balance += Decimal(str(total_earning))
            driver.total_trips += 1

            earn_txn = WalletTransaction(
                id=uuid.uuid4(),
                user_id=driver.user_id,
                amount=Decimal(str(total_earning)),
                transaction_type=LedgerType.SETTLEMENT,
                direction="CREDIT",
                bucket="CASH",
                balance_after=driver.wallet_balance,
                description=f"Outstation Earnings {booking.reference} (inc. allowances)",
            )
            self.db.add(earn_txn)

        await self.db.commit()
        return {"reference": booking.reference, "status": "completed", "final_fare": round(final_fare, 2)}

    # ── 6. Cancel ─────────────────────────────────────────────────────────────

    async def cancel_outstation(self, booking_id: str, reason: Optional[str] = None) -> dict:
        booking = await self.db.get(OutstationBooking, uuid.UUID(booking_id))
        if not booking:
            raise ValueError("Booking not found")
        if booking.status in (OutstationBookingStatus.OUTBOUND_STARTED, OutstationBookingStatus.RETURN_STARTED):
            raise ValueError("Cannot cancel an in-progress outstation trip")
        if booking.status == OutstationBookingStatus.COMPLETED:
            raise ValueError("Already completed")

        booking.status = OutstationBookingStatus.CANCELLED
        booking.cancelled_reason = reason or "Customer cancelled"
        refund = float(booking.estimated_fare)
        booking.refund_amount = Decimal(str(refund))

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
                description=f"Outstation Cancelled {booking.reference}",
            )
            self.db.add(refund_txn)

        await self.db.commit()
        return {"reference": booking.reference, "status": "cancelled", "refund_amount": refund}

    # ── 7. Get Booking ────────────────────────────────────────────────────────

    async def get_booking(self, booking_id: str) -> dict:
        booking = await self.db.get(OutstationBooking, uuid.UUID(booking_id))
        if not booking:
            raise ValueError("Outstation booking not found")

        legs_q = select(OutstationLeg).where(OutstationLeg.booking_id == booking.id).order_by(OutstationLeg.leg_order)
        legs_res = await self.db.execute(legs_q)
        legs = [
            {
                "leg_id": str(l.id),
                "leg_order": l.leg_order,
                "leg_type": l.leg_type,
                "origin": l.origin_address,
                "destination": l.destination_address,
                "scheduled_at": l.scheduled_at.isoformat(),
                "status": l.status.value,
                "started_at": l.started_at.isoformat() if l.started_at else None,
                "completed_at": l.completed_at.isoformat() if l.completed_at else None,
                "estimated_km": l.estimated_km,
            }
            for l in legs_res.scalars().all()
        ]

        charges_q = select(OutstationCharge).where(OutstationCharge.booking_id == booking.id)
        charges_res = await self.db.execute(charges_q)
        charges = [
            {
                "charge_id": str(c.id),
                "type": c.charge_type.value,
                "amount": float(c.amount),
                "description": c.description,
                "is_customer_approved": c.is_customer_approved,
            }
            for c in charges_res.scalars().all()
        ]

        driver = None
        if booking.driver_id:
            drv = await self.db.get(Driver, booking.driver_id)
            if drv:
                veh_q = select(Vehicle).where(Vehicle.driver_id == drv.id)
                veh_res = await self.db.execute(veh_q)
                vehicle = veh_res.scalar_one_or_none()
                driver = {
                    "name": drv.full_name,
                    "phone": drv.phone,
                    "rating": drv.rating,
                    "vehicle_plate": vehicle.registration_number if vehicle else None,
                }

        return {
            "booking_id": booking_id,
            "reference": booking.reference,
            "journey_type": booking.journey_type.value,
            "status": booking.status.value,
            "vehicle_category": booking.vehicle_category,
            "origin": booking.origin_address,
            "destination": booking.final_destination_address,
            "scheduled_departure": booking.scheduled_departure.isoformat(),
            "return_scheduled_at": booking.return_scheduled_at.isoformat() if booking.return_scheduled_at else None,
            "estimated_distance_km": booking.estimated_distance_km,
            "estimated_fare": float(booking.estimated_fare),
            "final_fare": float(booking.final_fare) if booking.final_fare else None,
            "driver": driver,
            "legs": legs,
            "charges": charges,
            "is_business_trip": booking.is_business_trip,
        }
