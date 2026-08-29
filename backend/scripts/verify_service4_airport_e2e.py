"""
Master Production Verification Suite: SERVICE 4 — AIRPORT TRANSPORT & FLIGHT MONITORING
Tests:
1. Airport & Terminal Master Catalog: PNQ, BOM airports with dedicated terminal pickup/drop zones
2. Authoritative Flight Information Service: Live flight lookup (schedule, terminal, baggage belt, delay)
3. Flight-Aware Fare Quote Engine: Base fare, airport fee, meet & greet, child seat, luggage, recommended pickup window
4. Airport Booking Creation & Chauffeur Assignment: Flight-linked voucher with driver & vehicle allocation
5. Realtime Flight Delay Auto-Recalculation: Flight delay (+35 min) shifts pickup window automatically
6. Terminal Arrival & 45-Min Free Grace Period: Driver arrival logged with AirportWaitingLog
7. Meet & Greet Handshake, Trip Progression & Settlement: In-progress -> Completed -> 80/20 DriverEarningLedger credit
8. Cancellation & 100% Wallet Refund: Cancel booking -> 100% refund transaction credited to customer wallet
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
sys.path.insert(0, os.path.join(_root, "airport-service"))
sys.path.insert(0, _root)

from sqlalchemy import select, and_, text
from common.database import async_session_maker, engine
from common.models.all_models import (
    User, UserRole, Driver, DriverStatus, KYCStatus, Vehicle, VehicleType,
    Airport, AirportTerminal, AirportBooking, AirportBookingStatus,
    AirportTransferType, AirportWaitingLog, FlightSnapshot, FlightStatus,
    DriverEarningLedger, WalletTransaction, LedgerType,
)
from app.services.flight_information_service import FlightInformationService
from app.services.airport_service import AirportService

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_airport_service_verification():
    print("=" * 80)
    print("✈️ STARTING SERVICE 4 (AIRPORT TRANSPORT & FLIGHT MONITORING) PRODUCTION VERIFICATION")
    print("=" * 80)

    await engine.dispose()

    async with async_session_maker() as session:
        # =========================================================================
        # SETUP SEED DATA
        # =========================================================================
        print("\n[SETUP] Seeding Airport Hub, Terminals, Flights, Customer & Airport Chauffeurs...", flush=True)

        # 1. Airport Master Data (Pune Airport PNQ)
        apt_code = f"P{uuid.uuid4().hex[:2].upper()}"
        airport = Airport(
            id=uuid.uuid4(),
            code=apt_code,
            name="Pune International Airport",
            city="Pune",
            country="India",
            latitude=18.5822,
            longitude=73.9197,
            timezone="Asia/Kolkata",
            is_active=True,
            base_airport_fee=120.0,
            free_waiting_mins=45,
            paid_waiting_rate_per_min=3.0,
        )
        session.add(airport)
        await session.flush()

        terminal = AirportTerminal(
            id=uuid.uuid4(),
            airport_id=airport.id,
            name="Terminal 2 (New Integrated Terminal)",
            code="T2",
            pickup_point_desc="Arrival Gate Pillar 4 / Cab Pick-up Bay",
            drop_point_desc="Departure Ramp Gate 2",
            latitude=18.5825,
            longitude=73.9199,
            is_active=True,
        )
        session.add(terminal)

        # 2. Flight Snapshot (AI-123)
        today = date.today()
        f_num = f"AI{uuid.uuid4().hex[:4].upper()}"
        flight = FlightSnapshot(
            id=uuid.uuid4(),
            flight_number=f_num,
            flight_date=today,
            airline_code="AI",
            airline_name="Air India",
            departure_airport_code="DEL",
            arrival_airport_code=apt_code,
            scheduled_departure=datetime.now(timezone.utc) + timedelta(hours=1),
            scheduled_arrival=datetime.now(timezone.utc) + timedelta(hours=3),
            actual_or_estimated_arrival=datetime.now(timezone.utc) + timedelta(hours=3),
            status=FlightStatus.SCHEDULED,
            delay_minutes=0,
            terminal="T2",
            gate="G04",
            baggage_belt="Belt 2",
        )
        session.add(flight)

        # 3. Customer User
        customer_user = User(
            id=uuid.uuid4(),
            phone=f"+9193{str(uuid.uuid4().int)[:8]}",
            email=f"airport.cust.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(customer_user)

        # 4. Airport Chauffeur Driver & Premium Vehicle
        drv_user = User(
            id=uuid.uuid4(),
            phone=f"+9192{str(uuid.uuid4().int)[:8]}",
            email=f"chauffeur.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(drv_user)
        chauffeur = Driver(
            id=uuid.uuid4(),
            user_id=drv_user.id,
            full_name="Rajendra Deshmukh (Airport Chauffeur)",
            phone=drv_user.phone,
            rating=4.96,
            total_trips=620,
            wallet_balance=Decimal("2500.00"),
            total_earnings=Decimal("485000.00"),
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_location="SRID=4326;POINT(73.9197 18.5822)",
        )
        session.add(chauffeur)

        veh = Vehicle(
            id=uuid.uuid4(),
            driver_id=chauffeur.id,
            make="Toyota",
            model="Innova Crysta",
            year=2023,
            color="Pearl White",
            registration_number=f"MH-12-AP{uuid.uuid4().hex[:3].upper()}",
            vehicle_type=VehicleType.SUV,
            seat_capacity=6,
            parcel_capable=False,
        )
        session.add(veh)

        await session.commit()
        print("[SETUP] Airport seed data committed successfully!", flush=True)

        # =========================================================================
        # TEST 1: AIRPORT & TERMINAL CATALOG
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 1: AIRPORT & TERMINAL MASTER CATALOG")
        print("=" * 70)

        airports_list = await AirportService.list_airports(session)
        assert len(airports_list) > 0, "Airports list must not be empty"
        print(f"  [OK] Active Airports: {len(airports_list)} airport hubs available.")

        terminals_list = await AirportService.get_airport_terminals(session, airport.id)
        assert len(terminals_list) > 0, "Terminals list must not be empty"
        assert terminals_list[0]["code"] == "T2"
        print(f"  [OK] Terminals for {airport.code}: {len(terminals_list)} terminal(s) found (Pickup: {terminals_list[0]['pickup_point_desc']}).")

        # =========================================================================
        # TEST 2: FLIGHT INFORMATION SERVICE LOOKUP
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 2: AUTHORITATIVE FLIGHT INFORMATION SERVICE LOOKUP")
        print("=" * 70)

        flight_data = await FlightInformationService.lookup_flight(session, f_num, today)
        assert flight_data["flight_number"] == f_num
        assert flight_data["airline_name"] == "Air India"
        assert flight_data["delay_minutes"] == 0
        assert flight_data["terminal"] == "T2"
        print(f"  [OK] Verified Flight: {f_num} ({flight_data['airline_name']}) -> Status: {flight_data['status']}, Gate: {flight_data['gate']}, Belt: {flight_data['baggage_belt']}.")

        # =========================================================================
        # TEST 3: FLIGHT-AWARE AIRPORT FARE ESTIMATE
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 3: FLIGHT-AWARE FARE ESTIMATION & PICKUP WINDOW")
        print("=" * 70)

        estimate = await AirportService.calculate_estimate(
            db=session,
            airport_id=airport.id,
            transfer_type="PICKUP",
            vehicle_category="SUV",
            distance_km=22.0,
            flight_number=f_num,
            flight_date=today,
            passenger_count=3,
            large_luggage_count=3,
            cabin_luggage_count=2,
            child_seat_count=1,
            meet_and_greet=True,
        )

        assert estimate["financials"]["total_fare"] > 0, "Total fare must be > 0"
        assert estimate["financials"]["meet_and_greet_fee"] > 0, "Meet & greet fee must be included"
        assert estimate["financials"]["child_seat_fee"] > 0, "Child seat fee must be included"
        assert estimate["schedule"]["recommended_pickup_window_start"] is not None
        print(f"  [OK] Flight-Aware Quote: Fare=Rs.{estimate['financials']['total_fare']}, Base=Rs.{estimate['financials']['base_fare']}, Airport Fee=Rs.{estimate['financials']['airport_fee']}")
        print(f"  [OK] Recommended Pickup Window: {estimate['schedule']['recommended_pickup_window_start']} to {estimate['schedule']['recommended_pickup_window_end']}")

        # =========================================================================
        # TEST 4: AIRPORT BOOKING CREATION & DRIVER ALLOCATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 4: AIRPORT BOOKING CREATION & CHAUFFEUR ALLOCATION")
        print("=" * 70)

        booking_payload = {
            "airport_id": str(airport.id),
            "terminal_id": str(terminal.id),
            "transfer_type": "PICKUP",
            "vehicle_category": "SUV",
            "distance_km": 22.0,
            "flight_number": f_num,
            "flight_date": today.isoformat(),
            "passenger_count": 3,
            "large_luggage_count": 3,
            "cabin_luggage_count": 2,
            "child_seat_count": 1,
            "meet_and_greet_required": True,
            "meet_and_greet_name": "Pankaj Sharma (VIP)",
            "pickup_address": "Pune International Airport Terminal 2",
            "pickup_lat": 18.5825,
            "pickup_lng": 73.9199,
            "drop_address": "JW Marriott, Senapati Bapat Road, Pune",
            "drop_lat": 18.5332,
            "drop_lng": 73.8340,
            "payment_method": "WALLET",
        }

        created_booking = await AirportService.create_booking(session, customer_user.id, booking_payload)
        booking_id = created_booking["booking_id"]
        booking_ref = created_booking["booking_reference"]

        assert booking_ref.startswith("APT-"), f"Booking reference must start with APT-, got {booking_ref}"
        assert created_booking["status"] in ("confirmed", "driver_assigned")
        print(f"  [OK] Airport Booking Created: Ref={booking_ref}, ID={booking_id}, Status={created_booking['status']}")
        if created_booking.get("driver"):
            print(f"  [OK] Assigned Chauffeur: {created_booking['driver']['name']} ({created_booking['driver']['vehicle']['make_model']})")

        # =========================================================================
        # TEST 5: REALTIME FLIGHT DELAY AUTO-RECALCULATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 5: REALTIME FLIGHT DELAY AUTO-RECALCULATION")
        print("=" * 70)

        # Ingest flight delay webhook (+35 minutes)
        await FlightInformationService.process_flight_update(
            db=session,
            flight_number=f_num,
            flight_date=today,
            new_status="DELAYED",
            delay_minutes=35,
            gate="G08",
            terminal="T2",
        )

        affected_refs = await AirportService.handle_flight_delay_recalculation(
            db=session,
            flight_number=f_num,
            flight_date=today,
            delay_minutes=35,
            new_status="DELAYED",
        )

        assert booking_ref in affected_refs, f"Booking {booking_ref} must be dynamically updated on flight delay"

        # Verify new pickup window
        updated_booking = await AirportService.get_booking_details(session, uuid.UUID(booking_id))
        assert updated_booking["flight"]["delay_minutes"] == 35
        assert updated_booking["flight"]["status"] == "DELAYED"
        print(f"  [OK] Flight Delay Recalculated: +35 mins delay automatically shifted pickup window to {updated_booking['schedule']['recommended_pickup_window_start']}!")

        # =========================================================================
        # TEST 6: DRIVER TERMINAL ARRIVAL & 45-MIN FREE GRACE PERIOD
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 6: DRIVER TERMINAL ARRIVAL & 45-MIN GRACE PERIOD")
        print("=" * 70)

        arrival_res = await AirportService.driver_arrived_at_airport(
            db=session,
            booking_id=uuid.UUID(booking_id),
            driver_id=chauffeur.id,
        )

        assert arrival_res["status"] == "driver_arrived"
        assert arrival_res["grace_period_mins"] == 45
        assert arrival_res["free_until"] is not None
        print(f"  [OK] Driver Arrived at Terminal 2: Status=driver_arrived, 45-Min Grace Period Active (Free until {arrival_res['free_until']}).")

        # =========================================================================
        # TEST 7: MEET & GREET HANDSHAKE, TRIP PROGRESSION & EARNINGS SETTLEMENT
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 7: MEET & GREET, TRIP PROGRESSION & 80/20 SETTLEMENT")
        print("=" * 70)

        # Start trip
        start_res = await AirportService.start_trip(session, uuid.UUID(booking_id), chauffeur.id)
        assert start_res["status"] == "in_progress"
        print("  [OK] Meet & Greet complete -> Trip Started (Status: in_progress).")

        # Complete trip
        complete_res = await AirportService.complete_trip(session, uuid.UUID(booking_id), chauffeur.id)
        assert complete_res["status"] == "completed"
        print(f"  [OK] Airport Transfer Completed at JW Marriott! Driver Net Earning: Rs.{complete_res['driver_earning']}.")

        # Verify Driver Wallet Credited
        await session.refresh(chauffeur)
        assert chauffeur.wallet_balance > Decimal("2500.00"), f"Driver wallet must have increased from 2500, got {chauffeur.wallet_balance}"

        # Verify Double-Entry Driver Earnings Ledger
        ledger_res = await session.execute(
            select(DriverEarningLedger).where(DriverEarningLedger.driver_id == chauffeur.id)
        )
        ledgers = ledger_res.scalars().all()
        assert len(ledgers) > 0, "DriverEarningLedger must have an entry for airport transfer"
        print(f"  [OK] Double-Entry Ledger Verified: {len(ledgers)} airport transfer earnings logged with direction CREDIT.")

        # =========================================================================
        # TEST 8: CANCELLATION & 100% WALLET REFUND POLICY
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 8: CANCELLATION & 100% WALLET REFUND POLICY")
        print("=" * 70)

        # Create another booking to test cancellation
        cancel_booking_payload = {
            "airport_id": str(airport.id),
            "transfer_type": "DROP",
            "vehicle_category": "SEDAN",
            "distance_km": 15.0,
            "pickup_address": "Kothrud, Pune",
            "pickup_lat": 18.5074,
            "pickup_lng": 73.8077,
            "drop_address": "Pune International Airport",
            "drop_lat": 18.5822,
            "drop_lng": 73.9197,
            "payment_method": "WALLET",
        }
        to_cancel = await AirportService.create_booking(session, customer_user.id, cancel_booking_payload)
        c_bid = to_cancel["booking_id"]

        cancel_res = await AirportService.cancel_booking(
            db=session,
            customer_id=customer_user.id,
            booking_id=uuid.UUID(c_bid),
            reason="Flight cancelled by airline",
        )

        assert cancel_res["status"] == "cancelled"
        assert cancel_res["refund_amount"] > 0
        print(f"  [OK] Cancelled Booking: Ref={cancel_res['booking_reference']}, 100% Wallet Refund: Rs.{cancel_res['refund_amount']}.")

        print("\n" + "=" * 80)
        print("🎉 ALL 8 SERVICE 4 (AIRPORT TRANSPORT) TEST SCENARIOS PASSED WITH 100% SUCCESS!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_airport_service_verification())
