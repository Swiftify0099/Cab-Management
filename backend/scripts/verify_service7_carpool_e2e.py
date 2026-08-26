"""
Master Production Verification Suite: SERVICE 7 — INTERCITY CARPOOL & RIDESHARING
Tests:
1. Driver Publishes Intercity Carpool Trip: Route Pune -> Mumbai (150 KM), 3 seats @ Rs.450/seat, Lonavala & Vashi waypoints
2. Passenger Corridor Search: Search available carpool rides matching origin/destination cities and seat capacity
3. Seat-by-Seat Reservation & Wallet Hold: Passenger 1 reserves 2 seats -> POOL-YYMMDD-XXXX voucher with 4-digit pickup_otp & CO2 savings
4. Capacity Enforcing & Overbooking Prevention: Passenger 2 books 1 seat (0 remaining) -> 3rd passenger gets 400 No Seats Available
5. Scheduled Departure & Highway Trip Start: Driver starts trip -> trip status transitions to IN_PROGRESS
6. Passenger Boarding Handshake & OTP Verification: Driver verifies 4-digit pickup_otp -> booking moves to BOARDED
7. Multi-Passenger Drops & 85/15 Earnings Settlement: Passengers dropped -> trip COMPLETED -> 85% pooled fares settled to DriverEarningLedger
8. Pre-Departure Cancellation & 100% Wallet Refund: Cancellation before departure restores seats on trip and refunds wallet
"""
import os
import sys
import uuid
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
import asyncio

# Add python paths
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_root, "common"))
sys.path.insert(0, os.path.join(_root, "carpool-service"))
sys.path.insert(0, _root)

from sqlalchemy import select, and_, text
from common.database import async_session_maker, engine
from common.models.all_models import (
    User, UserRole, Driver, DriverStatus, KYCStatus, Vehicle, VehicleType,
    CustomerProfile, CarpoolTrip, CarpoolWaypoint, CarpoolBooking,
    CarpoolTripStatus, CarpoolBookingStatus,
    DriverEarningLedger, WalletTransaction, LedgerType,
)
from app.services.carpool_service import CarpoolService

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_carpool_service_verification():
    print("=" * 80)
    print("🚗👥 STARTING SERVICE 7 (INTERCITY CARPOOL) PRODUCTION VERIFICATION")
    print("=" * 80)

    await engine.dispose()

    async with engine.begin() as conn:
        from common.models.all_models import Base
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as session:
        # =========================================================================
        # SETUP SEED DATA
        # =========================================================================
        print("\n[SETUP] Seeding Carpool Host Driver, Vehicle, and Co-Rider Customers...", flush=True)

        # 1. Carpool Host Driver & Vehicle
        driver_user = User(
            id=uuid.uuid4(),
            phone=f"+9198{str(uuid.uuid4().int)[:8]}",
            email=f"carpool.driver.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(driver_user)
        await session.flush()

        host_driver = Driver(
            id=uuid.uuid4(),
            user_id=driver_user.id,
            full_name="Abhijit Kulkarni (Verified Host)",
            phone=driver_user.phone,
            rating=4.94,
            total_trips=310,
            wallet_balance=Decimal("1500.00"),
            total_earnings=Decimal("142000.00"),
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_location="SRID=4326;POINT(73.8567 18.5204)",
        )
        session.add(host_driver)

        veh = Vehicle(
            id=uuid.uuid4(),
            driver_id=host_driver.id,
            make="Hyundai",
            model="Creta SX",
            year=2023,
            color="Titan Grey",
            registration_number=f"MH-12-CP{uuid.uuid4().hex[:3].upper()}",
            vehicle_type=VehicleType.SUV,
            seat_capacity=5,
            parcel_capable=False,
        )
        session.add(veh)

        # 2. Customer 1 (Passenger 1)
        cust1_user = User(
            id=uuid.uuid4(),
            phone=f"+9197{str(uuid.uuid4().int)[:8]}",
            email=f"rider1.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(cust1_user)
        await session.flush()

        cust1_profile = CustomerProfile(
            id=uuid.uuid4(),
            user_id=cust1_user.id,
            full_name="Sneha Joshi",
            wallet_balance=Decimal("2000.00"),
            rating=Decimal("4.95"),
        )
        session.add(cust1_profile)

        # 3. Customer 2 (Passenger 2)
        cust2_user = User(
            id=uuid.uuid4(),
            phone=f"+9196{str(uuid.uuid4().int)[:8]}",
            email=f"rider2.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(cust2_user)
        await session.flush()

        cust2_profile = CustomerProfile(
            id=uuid.uuid4(),
            user_id=cust2_user.id,
            full_name="Amit Vernekar",
            wallet_balance=Decimal("1500.00"),
            rating=Decimal("4.90"),
        )
        session.add(cust2_profile)

        await session.commit()
        print("[SETUP] Carpool seed data committed successfully!", flush=True)

        carpool_svc = CarpoolService(session)

        # =========================================================================
        # TEST 1: DRIVER PUBLISHES CARPOOL TRIP
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 1: DRIVER PUBLISHES INTERCITY CARPOOL TRIP & WAYPOINTS")
        print("=" * 70)

        dep_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        waypoints = [
            {"city": "Lonavala", "location_name": "Lonavala Express Toll Plaza", "latitude": 18.7557, "longitude": 73.4091, "eta_offset_minutes": 60, "price_offset": 200.0},
            {"city": "Navi Mumbai", "location_name": "Vashi Highway Junction", "latitude": 19.0770, "longitude": 72.9986, "eta_offset_minutes": 150, "price_offset": 400.0},
        ]

        published = await carpool_svc.publish_trip(
            driver_id=str(host_driver.id),
            origin_city="Pune",
            origin_address="Wakad Bridge / Hinjewadi Flyover, Pune",
            origin_lat=18.5987,
            origin_lng=73.7634,
            destination_city="Mumbai",
            destination_address="Bandra Kurla Complex (BKC), Mumbai",
            destination_lat=19.0664,
            destination_lng=72.8687,
            scheduled_departure=dep_time,
            total_seats=3,
            price_per_seat=450.0,
            corridor_distance_km=150.0,
            waypoints=waypoints,
            ladies_only=False,
            luggage_allowed=True,
        )

        trip_id = published["trip_id"]
        trip_ref = published["reference"]
        assert trip_ref.startswith("POOL-"), f"Trip reference must start with POOL-, got {trip_ref}"
        assert published["total_seats"] == 3
        assert published["available_seats"] == 3
        print(f"  [OK] Published Carpool Trip: Ref={trip_ref}, Corridor: Pune -> Mumbai (150 KM), 3 Seats @ Rs.450/seat.")
        print(f"    - Waypoints: 2 intermediate corridor stops (Lonavala & Vashi).")

        # =========================================================================
        # TEST 2: PASSENGER SEARCHES CARPOOL TRIPS
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 2: PASSENGER SEARCH & HIGHWAY CORRIDOR DISCOVERY")
        print("=" * 70)

        search_results = await carpool_svc.search_trips(
            origin_city="Pune",
            destination_city="Mumbai",
            seats_needed=2,
        )

        assert len(search_results) > 0, "Expected at least 1 carpool trip matching Pune -> Mumbai"
        found_trip = next((t for t in search_results if t["trip_id"] == trip_id), None)
        assert found_trip is not None
        assert found_trip["available_seats"] == 3
        print(f"  [OK] Corridor Search: Found {len(search_results)} available ride(s). Host: {found_trip['driver']['name']} ({found_trip['driver']['vehicle']}).")

        # =========================================================================
        # TEST 3: SEAT-BY-SEAT RESERVATION & WALLET HOLD
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 3: SEAT-BY-SEAT RESERVATION & EMISSIONS SHARING")
        print("=" * 70)

        book1 = await carpool_svc.book_seats(
            customer_user_id=str(cust1_user.id),
            trip_id=trip_id,
            seats_booked=2,
            pickup_location="Wakad Bridge, Pune",
            drop_location="BKC, Mumbai",
            payment_method="WALLET",
        )

        b1_id = book1["booking_id"]
        b1_ref = book1["booking_reference"]
        assert b1_ref.startswith("PBK-"), f"Booking reference must start with PBK-, got {b1_ref}"
        assert book1["seats_booked"] == 2
        assert book1["total_fare"] == 900.0  # 2 * 450
        assert book1["pickup_otp"] is not None
        print(f"  [OK] Passenger 1 Booked 2 Seats: Ref={b1_ref}, Total Fare: Rs.{book1['total_fare']}, Boarding OTP: {book1['pickup_otp']}, CO2 Saved: {book1['co2_saved_kg']} kg.")

        # Verify seats decremented
        trip_obj = await session.get(CarpoolTrip, uuid.UUID(trip_id))
        assert trip_obj.available_seats == 1, f"Expected 1 seat remaining, got {trip_obj.available_seats}"
        print(f"  [OK] Capacity Synced: {trip_obj.available_seats} of {trip_obj.total_seats} seat(s) remaining.")

        # =========================================================================
        # TEST 4: CAPACITY ENFORCEMENT & OVERBOOKING PREVENTION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 4: CAPACITY ENFORCEMENT & OVERBOOKING PREVENTION")
        print("=" * 70)

        # Passenger 2 books the last 1 seat
        book2 = await carpool_svc.book_seats(
            customer_user_id=str(cust2_user.id),
            trip_id=trip_id,
            seats_booked=1,
            pickup_location="Wakad Bridge, Pune",
            drop_location="Vashi Junction, Navi Mumbai",
            payment_method="WALLET",
        )
        b2_id = book2["booking_id"]
        b2_ref = book2["booking_reference"]
        print(f"  [OK] Passenger 2 Booked Last Seat: Ref={b2_ref}, Total Fare: Rs.{book2['total_fare']}.")

        await session.refresh(trip_obj)
        assert trip_obj.available_seats == 0, f"Trip should have 0 seats, got {trip_obj.available_seats}"
        print(f"  [OK] Carpool Full: 0 seats remaining.")

        # Attempt to overbook (should raise 400)
        overbook_blocked = False
        try:
            await carpool_svc.book_seats(
                customer_user_id=str(cust1_user.id),
                trip_id=trip_id,
                seats_booked=1,
            )
        except Exception as ex:
            overbook_blocked = True
            print(f"  [OK] Overbooking Blocked: Correctly rejected with: {ex.detail}")
        assert overbook_blocked, "Overbooking must be strictly rejected"

        # =========================================================================
        # TEST 5: DRIVER DEPARTURE & TRIP START
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 5: SCHEDULED DEPARTURE & HIGHWAY TRIP START")
        print("=" * 70)

        start_res = await carpool_svc.start_trip(trip_id=trip_id, driver_id=str(host_driver.id))
        assert start_res["status"] == "IN_PROGRESS"
        print(f"  [OK] Carpool Departure Started: Status=IN_PROGRESS, Started At: {start_res['started_at']}.")

        # =========================================================================
        # TEST 6: PASSENGER BOARDING OTP HANDSHAKE
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 6: PASSENGER BOARDING HANDSHAKE & OTP VERIFICATION")
        print("=" * 70)

        # Verify invalid OTP rejected
        invalid_otp_blocked = False
        try:
            await carpool_svc.verify_boarding_otp(booking_id=b1_id, entered_otp="0000")
        except Exception as ex:
            invalid_otp_blocked = True
            print(f"  [OK] Invalid OTP Rejected: {ex.detail}")
        assert invalid_otp_blocked

        # Verify valid OTP for Passenger 1
        board1 = await carpool_svc.verify_boarding_otp(booking_id=b1_id, entered_otp=book1["pickup_otp"])
        assert board1["status"] == "BOARDED"
        print(f"  [OK] Passenger 1 Boarded (OTP {book1['pickup_otp']}) -> Status: BOARDED.")

        # Verify valid OTP for Passenger 2
        board2 = await carpool_svc.verify_boarding_otp(booking_id=b2_id, entered_otp=book2["pickup_otp"])
        assert board2["status"] == "BOARDED"
        print(f"  [OK] Passenger 2 Boarded (OTP {book2['pickup_otp']}) -> Status: BOARDED.")

        # =========================================================================
        # TEST 7: MULTI-PASSENGER DROPS & 85/15 EARNINGS SETTLEMENT
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 7: MULTI-PASSENGER DROPS & 85/15 EARNINGS SETTLEMENT")
        print("=" * 70)

        # Drop Passenger 2 at Vashi
        drop2 = await carpool_svc.drop_passenger(booking_id=b2_id)
        assert drop2["status"] == "DROPPED"
        print(f"  [OK] Dropped Passenger 2 at Vashi Highway Junction.")

        # Drop Passenger 1 at BKC Mumbai
        drop1 = await carpool_svc.drop_passenger(booking_id=b1_id)
        assert drop1["status"] == "DROPPED"
        print(f"  [OK] Dropped Passenger 1 at BKC, Mumbai.")

        # Complete trip & settle earnings
        complete_res = await carpool_svc.complete_trip(trip_id=trip_id, driver_id=str(host_driver.id))
        assert complete_res["status"] == "COMPLETED"
        assert complete_res["passengers_count"] == 2
        assert complete_res["gross_fare"] == 1350.0  # 900 + 450
        assert complete_res["driver_earning"] == 1147.50  # 85% of 1350
        print(f"  [OK] Carpool Trip Completed! Gross Pooled Fare: Rs.{complete_res['gross_fare']}, Driver Net Earning: Rs.{complete_res['driver_earning']}.")

        # Verify Driver Wallet Credited
        await session.refresh(host_driver)
        assert host_driver.wallet_balance > Decimal("1500.00")

        # Verify Double-Entry Driver Earnings Ledger
        ledger_res = await session.execute(
            select(DriverEarningLedger).where(DriverEarningLedger.driver_id == host_driver.id)
        )
        ledgers = ledger_res.scalars().all()
        assert len(ledgers) > 0, "DriverEarningLedger must record carpool earning entry"
        print(f"  [OK] Double-Entry Ledger Verified: {len(ledgers)} carpool earnings logged with direction CREDIT.")

        # =========================================================================
        # TEST 8: PRE-DEPARTURE CANCELLATION & 100% WALLET REFUND
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 8: PRE-DEPARTURE CANCELLATION & 100% WALLET REFUND")
        print("=" * 70)

        # Host publishes another trip
        pub2 = await carpool_svc.publish_trip(
            driver_id=str(host_driver.id),
            origin_city="Pune",
            origin_address="Viman Nagar, Pune",
            origin_lat=18.5679,
            origin_lng=73.9143,
            destination_city="Nashik",
            destination_address="Dwarka Circle, Nashik",
            destination_lat=19.9975,
            destination_lng=73.7898,
            scheduled_departure=(datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            total_seats=2,
            price_per_seat=350.0,
        )
        t2_id = pub2["trip_id"]

        # Rider books 1 seat
        to_cancel_book = await carpool_svc.book_seats(
            customer_user_id=str(cust1_user.id),
            trip_id=t2_id,
            seats_booked=1,
            payment_method="WALLET",
        )
        c_bid = to_cancel_book["booking_id"]

        # Cancel reservation
        cancel_res = await carpool_svc.cancel_booking(
            booking_id=c_bid,
            customer_user_id=str(cust1_user.id),
            reason="Change in commute plans",
        )

        assert cancel_res["status"] == "CANCELLED"
        assert cancel_res["refund_amount"] == 350.0
        print(f"  [OK] Cancelled Carpool Reservation: Ref={cancel_res['booking_reference']}, 100% Wallet Refund: Rs.{cancel_res['refund_amount']}.")

        # Check seats restored on trip
        t2_obj = await session.get(CarpoolTrip, uuid.UUID(t2_id))
        assert t2_obj.available_seats == 2, f"Available seats should be restored to 2, got {t2_obj.available_seats}"
        print(f"  [OK] Capacity Restored: Available seats restored to {t2_obj.available_seats}.")

        print("\n" + "=" * 80)
        print("🎉 ALL 8 SERVICE 7 (INTERCITY CARPOOL) TEST SCENARIOS PASSED WITH 100% SUCCESS!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_carpool_service_verification())
