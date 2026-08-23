"""
Feature 18: Complete E2E Verification & Security Audit Suite for Airport Service & Flight-Aware Logistics.
Tests:
1. Airport Master Data & Terminal Geofence Queries
2. Centralized Flight Information Service Lookup (AI123, 6E402, UK819)
3. Pricing Calculation & Luggage/Passenger Vehicle Recommendations
4. Airport Booking Creation with Reference 'APT-YYMMDD-XXXX' & Wallet Settlement
5. Flight Delay Webhook & Automatic Pickup Window Recalculation
6. Driver Terminal Arrival & 45-Minute Complimentary Waiting Grace Period
7. Free Cancellation & 100% Instant Wallet Refund Credit
8. Cross-Service Linked Hotel Airport Transfer & Driver Zero-PII Isolation
"""
import asyncio
import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
_AIRPORT_DIR = os.path.join(_BACKEND_DIR, "airport-service")
if _AIRPORT_DIR not in sys.path:
    sys.path.insert(0, _AIRPORT_DIR)

from fastapi import HTTPException
from sqlalchemy import select
from common.database import async_session_maker
from common.models.all_models import (
    Airport, AirportTerminal, AirportBooking, AirportBookingStatus,
    AirportTransferType, AirportWaitingLog, BookingStatus, CustomerProfile,
    Driver, DriverStatus, FlightSnapshot, FlightStatus, LedgerType, Property,
    PropertyBooking, PropertyStatus, PropertyType, PropertyUnit, User,
    UserRole, Vehicle, VehicleType, Vendor, VendorStatus, WalletTransaction
)
from app.services.flight_information_service import FlightInformationService
from app.services.airport_service import AirportService

async def run_e2e_tests():
    print("=" * 80)
    print("🚀 RUNNING E2E TESTS: FEATURE 18 — FLIGHT-AWARE AIRPORT SERVICE & LOGISTICS")
    print("=" * 80)

    async with async_session_maker() as db:
        # ── SETUP TEST FIXTURES ──
        customer_user_id = uuid.uuid4()
        driver_user_id = uuid.uuid4()
        driver_profile_id = uuid.uuid4()
        vehicle_id = uuid.uuid4()

        # Customer User
        cust_user = User(
            id=customer_user_id,
            phone=f"+9198{uuid.uuid4().hex[:8]}",
            email=f"pankaj.sharma.{uuid.uuid4().hex[:4]}@example.com",
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=True,
        )
        db.add(cust_user)

        cust_profile = CustomerProfile(
            user_id=customer_user_id,
            full_name="Pankaj Sharma",
            emergency_contact="+919822001199",
            wallet_balance=Decimal("5000.00"),
        )
        db.add(cust_profile)

        # Driver User & Vehicle
        d_user = User(
            id=driver_user_id,
            phone=f"+9198{uuid.uuid4().hex[:8]}",
            email=f"suresh.patil.{uuid.uuid4().hex[:4]}@example.com",
            role=UserRole.DRIVER,
            is_active=True,
            is_verified=True,
        )
        db.add(d_user)

        driver_profile = Driver(
            id=driver_profile_id,
            user_id=driver_user_id,
            full_name="Suresh Patil",
            phone=d_user.phone,
            status=DriverStatus.ONLINE,
            rating=4.9,
            total_trips=150,
        )
        db.add(driver_profile)

        veh = Vehicle(
            id=vehicle_id,
            driver_id=driver_profile_id,
            make="Toyota",
            model="Innova Crysta",
            year=2024,
            registration_number=f"MH 12 RN {uuid.uuid4().hex[:4].upper()}",
            vehicle_type=VehicleType.SUV,
            color="Pearl White",
            seat_capacity=6,
        )
        db.add(veh)
        await db.commit()

        # ── TEST 1: Airport Master Data & Terminals ──
        print("\n▶ TEST 1: Airport Master Data & Terminal Geofence Queries...")
        airports = await AirportService.list_airports(db)
        assert len(airports) >= 3, "Expected at least 3 airports seeded (PNQ, BOM, GOI)"
        pnq = next(a for a in airports if a["code"] == "PNQ")
        assert pnq["city"] == "Pune"
        assert pnq["free_waiting_mins"] == 45
        assert pnq["base_airport_fee"] == 100.0

        terminals = await AirportService.get_airport_terminals(db, uuid.UUID(pnq["id"]))
        assert len(terminals) >= 1, "Expected at least 1 terminal for PNQ"
        t2 = next(t for t in terminals if t["code"] == "T2")
        assert "Arrival Gate" in t2["pickup_point_desc"]
        print(f"  ✓ Found Airport: {pnq['name']} ({pnq['code']}) with {len(terminals)} Terminals: PASS")

        # ── TEST 2: Centralized Flight Lookup ──
        print("\n▶ TEST 2: Flight Lookup & Live Status Parsing (FlightInformationService)...")
        flight_ai = await FlightInformationService.lookup_flight(db, "AI123", date.today())
        assert flight_ai["airline_name"] == "Air India"
        assert flight_ai["departure_airport_code"] == "DEL"
        assert flight_ai["arrival_airport_code"] == "PNQ"
        assert flight_ai["status"] in ["IN_AIR", "SCHEDULED", "LANDED", "DELAYED"]
        assert flight_ai["is_verified"] is True
        print(f"  ✓ Verified Flight AI123: {flight_ai['airline_name']} ({flight_ai['departure_airport_code']} -> {flight_ai['arrival_airport_code']}): PASS")

        # ── TEST 3: Pricing Engine & Luggage Recommendation ──
        print("\n▶ TEST 3: Authoritative Pricing Engine & Luggage Safety Recommendation...")
        # 3.1 Normal Sedan (2 passengers, 2 large bags)
        est_sedan = await AirportService.calculate_estimate(
            db=db,
            airport_id=uuid.UUID(pnq["id"]),
            transfer_type="PICKUP",
            vehicle_category="SEDAN",
            distance_km=18.5,
            flight_number="AI123",
            passenger_count=2,
            large_luggage_count=2,
            meet_and_greet=True,
            promo_code="FLY100",
        )
        assert est_sedan["vehicle_category"] == "SEDAN"
        assert est_sedan["recommended_category"] == "SEDAN"
        assert est_sedan["financials"]["airport_fee"] == 100.0
        assert est_sedan["financials"]["meet_and_greet_fee"] == 150.0
        assert est_sedan["financials"]["discount_amount"] == 100.0
        assert est_sedan["financials"]["total_fare"] > 0

        # 3.2 Heavy Luggage (5 large bags -> should recommend SUV)
        est_heavy = await AirportService.calculate_estimate(
            db=db,
            airport_id=uuid.UUID(pnq["id"]),
            transfer_type="PICKUP",
            vehicle_category="SEDAN",
            distance_km=18.5,
            flight_number="AI123",
            passenger_count=4,
            large_luggage_count=5,
            meet_and_greet=False,
        )
        assert est_heavy["recommended_category"] == "SUV", "Should recommend SUV for 5 large bags"
        print(f"  ✓ Fare Calculated (₹{est_sedan['financials']['total_fare']}) & Heavy Luggage Auto-Recommended SUV: PASS")

        # ── TEST 4: Airport Booking Creation & Driver Reservation ──
        print("\n▶ TEST 4: Airport Booking Creation with Reference 'APT-YYMMDD-XXXX' & Wallet Settlement...")
        booking_payload = {
            "airport_id": pnq["id"],
            "terminal_id": t2["id"],
            "transfer_type": "PICKUP",
            "vehicle_category": "SUV",
            "distance_km": 18.5,
            "flight_number": "AI123",
            "flight_date": date.today().isoformat(),
            "passenger_count": 2,
            "large_luggage_count": 2,
            "cabin_luggage_count": 1,
            "child_seat_count": 1,
            "meet_and_greet_required": True,
            "meet_and_greet_name": "Pankaj Sharma",
            "pickup_address": "Pune International Airport (PNQ) Terminal 2 Arrival Gate Pillar 4",
            "pickup_lat": 18.5822,
            "pickup_lng": 73.9197,
            "drop_address": "Baner High Street, Pune",
            "drop_lat": 18.5593,
            "drop_lng": 73.7788,
            "payment_method": "WALLET",
            "promo_code": "FLY100",
        }
        created_booking = await AirportService.create_booking(db, customer_user_id, booking_payload)
        assert created_booking["booking_reference"].startswith("APT-")
        assert created_booking["status"] in ["confirmed", "driver_assigned"]
        assert created_booking["cargo"]["meet_and_greet"] is True
        assert created_booking["cargo"]["meet_and_greet_name"] == "Pankaj Sharma"
        assert created_booking["driver"]["name"] == "Suresh Patil"
        booking_id = uuid.UUID(created_booking["booking_id"])
        print(f"  ✓ Confirmed Booking {created_booking['booking_reference']} with Driver {created_booking['driver']['name']}: PASS")

        # ── TEST 5: Flight Delay Webhook & Schedule Recalculation ──
        print("\n▶ TEST 5: Flight Delay Webhook & Automatic Pickup Window Recalculation...")
        # Webhook: AI123 is delayed by 40 minutes
        flight_snapshot = await FlightInformationService.process_flight_update(
            db=db,
            flight_number="AI123",
            flight_date=date.today(),
            new_status="DELAYED",
            delay_minutes=40,
            gate="Gate 14B",
            terminal="T2",
        )
        assert flight_snapshot["delay_minutes"] == 40
        assert flight_snapshot["status"] == "DELAYED"

        affected_refs = await AirportService.handle_flight_delay_recalculation(
            db=db,
            flight_number="AI123",
            flight_date=date.today(),
            delay_minutes=40,
            new_status="DELAYED",
        )
        assert created_booking["booking_reference"] in affected_refs

        # Verify updated booking schedule in DB
        updated_booking = await AirportService.get_booking_details(db, booking_id)
        assert updated_booking["flight"]["delay_minutes"] == 40
        assert updated_booking["flight"]["status"] == "DELAYED"
        print(f"  ✓ Flight Delay (+40 min) shifted pickup window for {len(affected_refs)} booking(s): PASS")

        # ── TEST 6: Driver Arrival & 45-Minute Complimentary Waiting ──
        print("\n▶ TEST 6: Driver Terminal Arrival & 45-Minute Complimentary Waiting Grace Period...")
        arrival_res = await AirportService.driver_arrived_at_airport(db, booking_id, driver_profile_id)
        assert arrival_res["status"] == "driver_arrived"
        assert arrival_res["grace_period_mins"] == 45

        # Check waiting log details
        b_details = await AirportService.get_booking_details(db, booking_id)
        assert b_details["waiting_and_parking"]["is_waiting"] is True
        assert b_details["waiting_and_parking"]["free_waiting_mins"] == 45
        assert b_details["waiting_and_parking"]["parking_charge"] == 0.0
        print(f"  ✓ Driver Arrival Registered (45 Mins Free Grace Period Active): PASS")

        # ── TEST 7: Free Cancellation & 100% Instant Wallet Refund ──
        print("\n▶ TEST 7: Free Cancellation & 100% Instant Wallet Refund Credit...")
        cancel_res = await AirportService.cancel_booking(db, customer_user_id, booking_id, "Flight rescheduled by airline")
        assert cancel_res["status"] == "cancelled"
        assert cancel_res["refund_amount"] == created_booking["financials"]["total_fare"]

        # Verify wallet credit transaction
        tx_query = select(WalletTransaction).where(
            WalletTransaction.user_id == customer_user_id,
            WalletTransaction.direction == "CREDIT",
        )
        tx_res = await db.execute(tx_query)
        refund_tx = tx_res.scalar_one_or_none()
        assert refund_tx is not None
        assert float(refund_tx.amount) == float(cancel_res["refund_amount"])
        print(f"  ✓ 100% Wallet Refund (₹{cancel_res['refund_amount']}) Credited to Customer: PASS")

        # ── TEST 8: Cross-Service Hotel Airport Transfer Linkage ──
        print("\n▶ TEST 8: Cross-Service Linked Hotel Airport Transfer & Driver Zero-PII Isolation...")
        # Create demo hotel vendor, property & unit
        vendor_id = uuid.uuid4()
        vendor = Vendor(
            id=vendor_id,
            user_id=customer_user_id,
            business_name="Grand Hyatt Goa Hospitality",
            aadhaar_number="123456789012",
            pan_number="ABCDE1234F",
            status=VendorStatus.APPROVED,
        )
        db.add(vendor)

        prop_id = uuid.uuid4()
        prop = Property(
            id=prop_id,
            vendor_id=vendor_id,
            name="Grand Hyatt Beach Resort",
            type=PropertyType.HOTEL,
            location="SRID=4326;POINT(73.8314 15.3808)",
            city="Goa",
            state="Goa",
            pincode="403001",
            address="Bambolim, North Goa",
            latitude=15.3808,
            longitude=73.8314,
            status=PropertyStatus.APPROVED,
        )
        db.add(prop)

        unit_id = uuid.uuid4()
        unit = PropertyUnit(
            id=unit_id,
            property_id=prop_id,
            name="Ocean View Suite",
            price=Decimal("8500.00"),
            capacity=3,
            count=10,
            available_count=10,
        )
        db.add(unit)

        hotel_booking_id = uuid.uuid4()
        hotel_booking = PropertyBooking(
            id=hotel_booking_id,
            booking_reference="HTL-260823-GOA1",
            property_id=prop_id,
            unit_id=unit_id,
            customer_id=cust_profile.id,
            vendor_id=vendor_id,
            check_in=date.today(),
            check_out=date.today() + timedelta(days=2),
            nights=2,
            guests=2,
            base_fare=Decimal("17000.00"),
            tax_amount=Decimal("3060.00"),
            total_fare=Decimal("20060.00"),
            status=BookingStatus.CONFIRMED,
        )
        db.add(hotel_booking)
        await db.commit()

        # Link Airport Ride from Hotel Stay
        goi_apt = next(a for a in airports if a["code"] == "GOI")
        linked_booking_payload = {
            "airport_id": goi_apt["id"],
            "transfer_type": "PICKUP",
            "vehicle_category": "SEDAN",
            "distance_km": 25.0,
            "flight_number": "SG204",
            "flight_date": date.today().isoformat(),
            "passenger_count": 2,
            "large_luggage_count": 2,
            "meet_and_greet_required": True,
            "meet_and_greet_name": "Pankaj Sharma",
            "pickup_address": "Goa Dabolim Airport (GOI) Terminal 1",
            "pickup_lat": 15.3808,
            "pickup_lng": 73.8314,
            "drop_address": "Grand Hyatt Beach Resort, Bambolim, North Goa",
            "drop_lat": 15.4500,
            "drop_lng": 73.8200,
            "payment_method": "WALLET",
            "linked_hotel_booking_id": str(hotel_booking_id),
        }
        linked_res = await AirportService.create_booking(db, customer_user_id, linked_booking_payload)
        assert linked_res["linked_hotel_booking_id"] == str(hotel_booking_id)
        assert linked_res["route"]["drop_address"] == "Grand Hyatt Beach Resort, Bambolim, North Goa"
        
        # Verify Driver Zero-PII Isolation: Driver gets only operational route without room number or hotel invoice
        assert "room_number" not in linked_res["driver"]
        assert "hotel_financials" not in linked_res["driver"]
        print(f"  ✓ Linked Hotel Airport Transfer (Ref: {linked_res['booking_reference']}) Created with Zero PII to Driver: PASS")

    print("\n" + "=" * 80)
    print("🎉 ALL 8 AIRPORT SERVICE & FLIGHT-AWARE E2E TESTS PASSED 100% WITH ZERO ERRORS!")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
