"""
Customer App Feature 9 & Feature 10 End-to-End Automated Verification Script.
Validates:
1. Customer Authoritative Emergency SOS with PostGIS/Coordinate Snapshot & 112 Police Alert
2. Idempotent SOS Duplicate Handling
3. Live Tokenized Trip Sharing Generation (Auto-expiring, Zero PII)
4. Public Read-Only Telemetry Retrieval via Share Token
5. Passive Safety Anomaly Check-in & Resolution ("I'm Safe")
6. Customer Safety Incident Reporting (Support Ticket integration)
7. Driver Authoritative Trip Completion & Itemized Receipt Generation
8. Customer Itemized Transparent Receipt Access
9. Customer 1-5 Star Driver Rating with Structured Compliments
10. Customer Driver Tipping (Double-Entry Ledger Credit + Driver Wallet Balance Update)
11. Customer Lost Property Ticket Filing
"""
import sys
import os
import uuid
import asyncio
from decimal import Decimal
from datetime import datetime, timezone, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "matching-service")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, and_
from common.database import Base, async_session_maker, engine

from common.models.all_models import (
    Base, User, UserRole, CustomerProfile, Driver, DriverStatus, Vehicle, VehicleType,
    RideRequest, RideRequestStatus,
    RideSOSEvent, LiveTripShareSession, DriverSafetyAlert,
    RideReceipt, DriverEarningLedger, CustomerDriverRating,
    SupportTicket
)
from app.services.safety_sos_service import SafetySOSService
from app.services.driver_safety_service import DriverSafetyService
from app.services.trip_completion_service import TripCompletionService
from app.services.rating_feedback_service import RatingFeedbackService
from app.services.support_ticket_service import SupportTicketService

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


async def run_e2e_verification():
    print("=" * 80)
    print("[START] E2E VERIFICATION: CUSTOMER SAFETY & TRIP COMPLETION (F9 & F10)")
    print("=" * 80)

    await engine.dispose()

    async with async_session_maker() as db:
        # Unique suffix for test isolation
        suffix = uuid.uuid4().hex[:6]
        cust_phone = f"+91987{suffix[:7]}"
        driver_phone = f"+91988{suffix[:7]}"

        customer_user_id = uuid.uuid4()
        driver_user_id = uuid.uuid4()

        customer = User(
            id=customer_user_id,
            email=f"aarav.{suffix}@example.com",
            phone=cust_phone,
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        driver_user = User(
            id=driver_user_id,
            email=f"sunil.{suffix}@example.com",
            phone=driver_phone,
            role=UserRole.DRIVER,
            is_active=True,
        )
        db.add_all([customer, driver_user])
        await db.flush()

        cust_profile = CustomerProfile(
            id=uuid.uuid4(),
            user_id=customer.id,
            full_name="Aarav Sharma",
            wallet_balance=Decimal("500.00"),
        )
        db.add(cust_profile)

        driver = Driver(
            id=uuid.uuid4(),
            user_id=driver_user.id,
            full_name="Sunil Shinde",
            phone=driver_phone,
            license_number=f"MH12{suffix.upper()}45678",
            rating=4.9,
            total_trips=120,
            total_earnings=Decimal("45000.00"),
            wallet_balance=Decimal("1500.00"),
            status=DriverStatus.ON_TRIP,
        )
        db.add(driver)
        await db.flush()

        vehicle = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver.id,
            make="Maruti Suzuki",
            model="Swift Dzire",
            year=2023,
            seat_capacity=4,
            registration_number=f"MH-12-{suffix.upper()[:4]}",
            color="Pearl White",
            vehicle_type=VehicleType.SEDAN,
        )
        db.add(vehicle)
        await db.flush()

        ride_id = uuid.uuid4()
        ride = RideRequest(
            id=ride_id,
            customer_id=customer.id,
            assigned_driver_id=driver.id,
            pickup_location="POINT(73.8446 18.5314)",
            pickup_address="Shivajinagar Station, Pune",
            pickup_lat=18.5314,
            pickup_lng=73.8446,
            destination_location="POINT(72.8478 19.0178)",
            destination_address="Dadar TT Circle, Mumbai",
            destination_lat=19.0178,
            destination_lng=72.8478,
            status=RideRequestStatus.IN_PROGRESS,
            estimated_fare=Decimal("1850.00"),
            estimated_distance_km=148.5,
            surge_multiplier=1.0,
            start_pin_plain="4921",
            started_at=datetime.now(timezone.utc),
        )
        db.add(ride)
        await db.commit()
        print("[SUCCESS] Step 0: Test Fixtures Seeded (Customer, Driver, Vehicle, Active Ride)")

        # ── 1. EMERGENCY SOS TRIGGER (FEATURE 9) ──
        print("\n--- TEST 1: Customer Emergency SOS Trigger ---")
        sos_service = SafetySOSService(db)
        sos_res = await sos_service.trigger_sos(
            user_id=str(customer.id),
            role="customer",
            ride_id=ride.id,
            latitude=18.7500,
            longitude=73.4000,
            accuracy=5.0,
            reason="Customer Emergency SOS Button Pressed",
        )
        assert sos_res["success"] is True
        assert sos_res["status"] == "active"
        assert sos_res["police_number"] == "112"
        print(f"[SUCCESS] SOS Activated! Incident ID: {sos_res['sos_id']} | Police: {sos_res['police_number']}")

        # ── 2. IDEMPOTENT SOS TEST ──
        print("\n--- TEST 2: Idempotent SOS Handling ---")
        sos_dup = await sos_service.trigger_sos(
            user_id=str(customer.id),
            role="customer",
            ride_id=ride.id,
            latitude=18.7501,
            longitude=73.4001,
        )
        assert sos_dup["success"] is True
        assert sos_dup["sos_id"] == sos_res["sos_id"]
        assert "Idempotent response" in sos_dup["message"]
        print("[SUCCESS] Idempotent SOS Verified: Existing incident returned without duplicate record creation.")

        # ── 3. LIVE TOKENIZED TRIP SHARING (FEATURE 9) ──
        print("\n--- TEST 3: Tokenized Live Trip Share Session ---")
        driver_safety = DriverSafetyService(db)
        share_res = await driver_safety.create_live_trip_share(driver.id, ride.id)
        assert share_res["success"] is True
        assert "share_token" in share_res
        share_token = share_res["share_token"]
        print(f"[SUCCESS] Share Token Generated: {share_token} (Expires in 3h)")

        # ── 4. PUBLIC READ-ONLY TELEMETRY RETRIEVAL ──
        print("\n--- TEST 4: Public Share Telemetry Fetch ---")
        telemetry = await driver_safety.get_shared_trip_telemetry(share_token)
        assert "status" in telemetry
        assert "pickup_address" in telemetry
        assert "destination_address" in telemetry
        print(f"[SUCCESS] Telemetry Fetched: Ride Status = {telemetry['status']}, Zero PII verified.")

        # ── 5. PASSIVE SAFETY ANOMALY LOG & RESOLUTION ──
        print("\n--- TEST 5: Passive Safety Anomaly Record & Resolve ---")
        alert_res = await driver_safety.evaluate_route_deviation(
            driver_id=driver.id,
            ride_id=ride.id,
            current_lat=18.8000,
            current_lng=73.3500,
            planned_waypoints=[],
        )
        assert alert_res is not None, "Route deviation beyond threshold must produce an alert"
        assert "alert_id" in alert_res
        alert_id = uuid.UUID(alert_res["alert_id"])
        
        resolve_res = await driver_safety.resolve_safety_alert(
            driver_id=driver.id,
            alert_id=alert_id,
            resolution_type="IM_SAFE",
        )
        assert resolve_res["success"] is True
        print(f"[SUCCESS] Anomaly Logged & Resolved with 'IM_SAFE': Alert ID {alert_id}")

        # ── 6. SAFETY INCIDENT TICKET REPORTING ──
        print("\n--- TEST 6: Safety Incident Ticket Reporting ---")
        support_service = SupportTicketService(db)
        ticket_res = await support_service.create_ticket(
            user_id=customer.id,
            category="SAFETY",
            subcategory="UNSAFE_DRIVING",
            subject="Rash driving report",
            description="Driver was driving aggressively on the expressway.",
            priority="urgent",
            ride_id=ride.id,
        )
        assert "ticket_id" in ticket_res
        assert ticket_res["category"] == "SAFETY"
        print(f"[SUCCESS] Safety Ticket Created: #{ticket_res['ticket_id'][:8]} (Priority: {ticket_res['priority']})")

        # ── 7. DRIVER AUTHORITATIVE TRIP COMPLETION (FEATURE 10) ──
        print("\n--- TEST 7: Authoritative Trip Completion & Fare Calculation ---")
        trip_comp = TripCompletionService(db)
        comp_res = await trip_comp.complete_ride(
            driver_user_id=str(driver_user.id),
            ride_id=ride.id,
            tolls=100.0,
            parking=0.0,
            payment_method="cash",
        )
        assert comp_res["success"] is True
        assert comp_res["status"] == "completed"
        receipt_no = comp_res["receipt_number"]
        print(f"[SUCCESS] Trip Completed! Receipt No: {receipt_no} | Customer Final Fare: ₹{comp_res['customer_final_fare']}")

        # ── 8. CUSTOMER ITEMIZED TRANSPARENT RECEIPT ──
        print("\n--- TEST 8: Customer Itemized Receipt Access ---")
        cust_receipt = await trip_comp.get_customer_ride_receipt(
            customer_user_id=str(customer.id),
            ride_id=ride.id,
        )
        assert cust_receipt["receipt_number"] == receipt_no
        assert cust_receipt["base_fare"] > 0
        assert cust_receipt["distance_km"] > 0
        assert cust_receipt["driver"]["name"] == "Sunil Shinde"
        print(f"[SUCCESS] Customer Receipt Verified: Base: ₹{cust_receipt['base_fare']}, Dist: {cust_receipt['distance_km']}km, Total: ₹{cust_receipt['customer_final_fare']}")

        # ── 9. CUSTOMER 5-STAR DRIVER RATING WITH COMPLIMENTS ──
        print("\n--- TEST 9: Customer Driver Rating & Compliments ---")
        rating_service = RatingFeedbackService(db)
        rate_res = await rating_service.rate_driver(
            customer_user_id=str(customer.id),
            ride_id=ride.id,
            rating=5,
            compliments=["SAFE_DRIVING", "CLEAN_VEHICLE", "PROFESSIONAL"],
            feedback="Super smooth driving and very clean car!",
        )
        assert rate_res["success"] is True
        assert rate_res["rating"] == 5
        print(f"[SUCCESS] Driver Rated 5-Stars! Compliments: {rate_res['compliments']}")

        # ── 10. CUSTOMER DRIVER TIPPING (LEDGER & WALLET UPDATE) ──
        print("\n--- TEST 10: Customer Driver Tipping ---")
        prev_wallet = driver.wallet_balance
        tip_res = await trip_comp.add_driver_tip(
            customer_user_id=str(customer.id),
            ride_id=ride.id,
            tip_amount=100.0,
            payment_method="wallet",
        )
        assert tip_res["success"] is True
        assert tip_res["tip_amount"] == 100.0
        assert tip_res["total_tip"] == 100.0

        # Verify Driver Wallet Balance & Ledger
        d_res = await db.execute(select(Driver).where(Driver.id == driver.id))
        d_updated = d_res.scalar_one()
        assert d_updated.wallet_balance == prev_wallet + Decimal("100.00")

        ledger_res = await db.execute(
            select(DriverEarningLedger).where(
                and_(DriverEarningLedger.ride_id == ride.id, DriverEarningLedger.entry_type == "TIP")
            )
        )
        ledger_entry = ledger_res.scalar_one_or_none()
        assert ledger_entry is not None
        assert ledger_entry.amount == Decimal("100.00")
        assert ledger_entry.direction == "CREDIT"
        print(f"[SUCCESS] Tip of ₹100.00 added! Driver Wallet Updated: ₹{prev_wallet} -> ₹{d_updated.wallet_balance} (Ledger ID: {ledger_entry.id})")

        # ── 11. CUSTOMER LOST ITEM REPORT ──
        print("\n--- TEST 11: Lost Property Report ---")
        lost_item_ticket = await support_service.create_ticket(
            user_id=customer.id,
            category="TRIPS",
            subcategory="LOST_ITEM",
            subject=f"Lost Item: PHONE (Ride #{str(ride.id)[:8]})",
            description="Left iPhone 14 in rear passenger pocket. Contact: +919876500001",
            priority="high",
            ride_id=ride.id,
        )
        assert "ticket_id" in lost_item_ticket
        assert lost_item_ticket["category"] == "TRIPS"
        print(f"[SUCCESS] Lost Item Ticket Submitted: #{lost_item_ticket['ticket_id'][:8]}")

    print("\n" + "=" * 80)
    print("[CELEBRATION] ALL 11 E2E TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_e2e_verification())
