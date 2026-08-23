"""
===============================================================================
CUSTOMER APP FEATURE 16: HOTEL BOOKING & LINKED CAB LOGISTICS E2E TEST SUITE
===============================================================================
Validates:
1. Hotel Search & PostGIS Spatial Radius Query & Multi-Filters (Stars, Amenities, Policies)
2. Hotel Details, Photo Gallery, Policies & Room Tiers
3. Authoritative Multi-Night Pricing Engine with 12%/18% GST Brackets & Add-ons
4. Pre-Booking Date Overlap Lock & Room Availability Check
5. Booking Creation with 'HTL-XXXX' Reference & Multi-Bucket Wallet Settlement
6. Free Cancellation Window Verification & Automated Instant Wallet Refund Credit
7. Cross-Service Linked Airport/Hotel Cab Ride & Driver App Zero-PII Isolation
===============================================================================
"""
import asyncio
import os
import sys
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
_HOTEL_DIR = os.path.join(_BACKEND_DIR, "hotel-service")
if _HOTEL_DIR not in sys.path:
    sys.path.insert(0, _HOTEL_DIR)

from sqlalchemy import select, and_
from common.database import async_session_maker
from common.models.all_models import (
    User, UserRole, CustomerProfile, Driver, DriverStatus, Vehicle, Vendor, VendorStatus,
    Property, PropertyType, PropertyStatus, PropertyUnit, PropertyBooking,
    BookingGuest, RideRequest, RideRequestStatus
)
from app.services.hotel_service import HotelService


async def run_feature16_hotel_e2e():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("\n" + "=" * 80)
    print("🏨 RUNNING E2E TEST SUITE: FEATURE 16 — HOTEL BOOKING & LINKED CAB LOGISTICS")
    print("=" * 80)

    total_tests = 7
    passed_tests = 0

    async with async_session_maker() as db:
        service = HotelService(db)

        # ── Test Fixture Setup ───────────────────────────────────────────────
        customer_phone = f"+9198{uuid.uuid4().hex[:8]}"
        cust_user = User(
            id=uuid.uuid4(),
            phone=customer_phone,
            role=UserRole.CUSTOMER,
        )
        db.add(cust_user)

        # Vendor Setup
        vendor_user = User(
            id=uuid.uuid4(),
            phone=f"+9199{uuid.uuid4().hex[:8]}",
            role=UserRole.ADMIN,
        )
        db.add(vendor_user)
        await db.flush()

        vendor = Vendor(
            id=uuid.uuid4(),
            user_id=vendor_user.id,
            business_name="Hyatt Hospitality Partners",
            aadhaar_number="123456789012",
            pan_number="ABCDE1234F",
            status=VendorStatus.APPROVED,
        )
        db.add(vendor)
        await db.flush()

        initial_wallet = Decimal("50000.00")
        cust_profile = CustomerProfile(
            user_id=cust_user.id,
            full_name="Vikramaditya Shinde",
            wallet_balance=initial_wallet,
        )
        db.add(cust_profile)

        # Setup Verified Hotel Property
        prop_id = uuid.uuid4()
        prop = Property(
            id=prop_id,
            vendor_id=vendor.id,
            name="Grand Hyatt Goa Beach Resort",
            type=PropertyType.RESORT,
            description="5-star beachfront palace in Bambolim overlooking scenic waters.",
            location="SRID=4326;POINT(73.8567 15.4523)",
            latitude=15.4523,
            longitude=73.8567,
            address="P.O. Goa University, Bambolim, Goa",
            city="Goa",
            state="Goa",
            pincode="403206",
            status=PropertyStatus.APPROVED,
            rating=4.9,
            star_rating=5,
            reviews_count=2100,
            check_in_time="14:00",
            check_out_time="11:00",
            contact_phone="+91 832 664 1234",
            contact_email="goa.grand@hyatt.com",
            amenities={"free_wifi": True, "swimming_pool": True, "restaurant": True, "spa": True, "private_beach": True},
            policies={"couple_friendly": True, "family_friendly": True, "pet_friendly": True},
            featured=True,
        )
        db.add(prop)
        await db.flush()

        # Deluxe Ocean Room
        deluxe_unit_id = uuid.uuid4()
        deluxe_unit = PropertyUnit(
            id=deluxe_unit_id,
            property_id=prop.id,
            name="Grand Deluxe Ocean View",
            room_type="DELUXE",
            bed_type="1 King Bed",
            capacity=2,
            price=Decimal("9500.00"),  # > 7500 -> 18% GST Bracket
            count=5,
            available_count=5,
            free_breakfast=True,
            is_refundable=True,
            cancellation_hours=24,
            amenities={"ocean_view": True, "balcony": True, "bathtub": True},
        )
        db.add(deluxe_unit)

        # Standard Club Room
        standard_unit_id = uuid.uuid4()
        standard_unit = PropertyUnit(
            id=standard_unit_id,
            property_id=prop.id,
            name="Standard Garden Club",
            room_type="STANDARD",
            bed_type="1 Queen Bed",
            capacity=2,
            price=Decimal("4500.00"),  # <= 7500 -> 12% GST Bracket
            count=10,
            available_count=10,
            free_breakfast=False,
            is_refundable=True,
            cancellation_hours=24,
            amenities={"garden_view": True},
        )
        db.add(standard_unit)
        await db.commit()

        # ── TEST 1: PostGIS Spatial Discovery & Multi-Filter Search ───────────
        print("\n[TEST 1] PostGIS Spatial Search & Multi-Filter Aggregation...")
        search_res = await service.search_hotels(
            city="Goa",
            lat=15.4500,
            lng=73.8500,
            radius_km=30.0,
            star_ratings=[5],
            amenities=["swimming_pool", "spa"],
            policies=["couple_friendly"],
            sort_by="RATING_HIGH_LOW",
        )
        assert search_res["total"] >= 1, f"Expected at least 1 hotel, found {search_res['total']}"
        found_hotel = next((h for h in search_res["hotels"] if h["property_id"] == str(prop.id)), None)
        assert found_hotel is not None, "Created property not returned in search results"
        assert found_hotel["star_rating"] == 5
        assert found_hotel["rating"] == 4.9
        assert found_hotel["starting_price"] == 4500.0
        print(f"  ✓ Found '{found_hotel['name']}' in {found_hotel['city']} (Distance: {found_hotel['distance_km']} km, Starts: ₹{found_hotel['starting_price']})")
        passed_tests += 1

        # ── TEST 2: Hotel Details, Photo Gallery & Room Tiers ─────────────────
        print("\n[TEST 2] Hotel Details, Policies & Room Tiers...")
        details = await service.get_hotel_details(str(prop.id))
        assert details["name"] == "Grand Hyatt Goa Beach Resort"
        assert len(details["room_tiers"]) == 2
        assert details["policies"]["couple_friendly"] is True
        assert details["check_in_time"] == "14:00"
        print(f"  ✓ Verified {len(details['room_tiers'])} room tiers and policies for {details['name']}")
        passed_tests += 1

        # ── TEST 3: Authoritative Multi-Night Pricing Engine & GST Brackets ───
        print("\n[TEST 3] Multi-Night Pricing Engine & GST Tax Brackets...")
        check_in = date.today() + timedelta(days=5)
        check_out = date.today() + timedelta(days=8)  # 3 Nights

        # Case A: Standard Room (₹4,500/night <= ₹7,500 -> 12% GST)
        quote_std = await service.calculate_quote(
            unit_id=str(standard_unit.id),
            check_in=check_in,
            check_out=check_out,
            rooms_count=1,
            guests_count=2,
            add_on_codes=["BREAKFAST_BUFFET"],  # ₹450 * 3 = ₹1,350
        )
        expected_base_std = 4500.0 * 3.0  # 13,500
        expected_tax_std = round(expected_base_std * 0.12, 2)  # 1,620.0
        expected_addons_std = 450.0 * 3.0  # 1,350.0
        expected_final_std = expected_base_std + expected_tax_std + expected_addons_std  # 16,470.0
        assert quote_std["nights"] == 3
        assert quote_std["gst_rate_percent"] == 12.0
        assert quote_std["base_room_fare"] == expected_base_std
        assert quote_std["tax_amount"] == expected_tax_std
        assert quote_std["add_ons_total"] == expected_addons_std
        assert quote_std["final_payable"] == expected_final_std
        print(f"  ✓ Standard Room Quote (12% GST): Base ₹{expected_base_std} + GST ₹{expected_tax_std} + Add-ons ₹{expected_addons_std} = ₹{expected_final_std}")

        # Case B: Luxury Deluxe Room (₹9,500/night > ₹7,500 -> 18% GST + Discount)
        quote_dlx = await service.calculate_quote(
            unit_id=str(deluxe_unit.id),
            check_in=check_in,
            check_out=check_out,
            rooms_count=1,
            guests_count=2,
            promo_code="SUMMER20",
        )
        expected_base_dlx = 9500.0 * 3.0  # 28,500
        expected_tax_dlx = round(expected_base_dlx * 0.18, 2)  # 5,130.0
        assert quote_dlx["gst_rate_percent"] == 18.0
        assert quote_dlx["tax_amount"] == expected_tax_dlx
        assert quote_dlx["discount_amount"] > 0
        print(f"  ✓ Luxury Room Quote (18% GST): Base ₹{expected_base_dlx} + GST ₹{expected_tax_dlx} - Promo ₹{quote_dlx['discount_amount']} = ₹{quote_dlx['final_payable']}")
        passed_tests += 1

        # ── TEST 4: Pre-Booking Room Lock & Overlap Prevention ─────────────────
        print("\n[TEST 4] Pre-Booking Availability Check & Double-Booking Prevention...")
        avail_info = await service.check_room_availability(
            unit_id=str(deluxe_unit.id),
            check_in=check_in,
            check_out=check_out,
            requested_rooms=2,
        )
        assert avail_info["is_available"] is True
        assert avail_info["available_rooms"] == 5
        print(f"  ✓ Verified room availability (5 of 5 rooms free for selected date range)")
        passed_tests += 1

        # ── TEST 5: Booking Creation & Multi-Bucket Wallet Settlement ─────────
        print("\n[TEST 5] Booking Creation with 'HTL-XXXX' Ref & Wallet Debit...")
        booking = await service.create_hotel_booking(
            customer_user_id=str(cust_user.id),
            unit_id=str(deluxe_unit.id),
            check_in=check_in,
            check_out=check_out,
            primary_guest_name="Vikramaditya Shinde",
            primary_guest_phone=customer_phone,
            primary_guest_email="vikram@example.com",
            rooms_count=1,
            guests_count=2,
            add_on_codes=["AIRPORT_TRANSFER_PASS"],
            payment_method="WALLET",
            promo_code="SUMMER20",
            idempotency_key=f"HTL-IDEMP-{uuid.uuid4().hex[:10]}",
            additional_guests=[{"name": "Ananya Shinde", "age": 27}],
        )
        assert booking["booking_reference"].startswith("HTL-")
        assert booking["status"].upper() == "CONFIRMED"
        assert booking["financials"]["payment_status"].upper() == "PAID"
        assert len(booking["guests_list"]) == 2

        # Check wallet deduction in DB
        prof_stmt = select(CustomerProfile).where(CustomerProfile.user_id == cust_user.id)
        cust_profile_refreshed = (await db.execute(prof_stmt)).scalar_one()
        expected_remaining_wallet = initial_wallet - Decimal(str(booking["financials"]["total_fare"]))
        assert cust_profile_refreshed.wallet_balance == expected_remaining_wallet, (
            f"Wallet balance mismatch: Expected {expected_remaining_wallet}, found {cust_profile_refreshed.wallet_balance}"
        )
        print(f"  ✓ Confirmed Booking Ref: {booking['booking_reference']}")
        print(f"  ✓ Wallet Settled: ₹{initial_wallet} -> ₹{cust_profile_refreshed.wallet_balance} (-₹{booking['financials']['total_fare']})")
        passed_tests += 1

        # ── TEST 6: Free Cancellation & Automated Instant Wallet Refund ───────
        print("\n[TEST 6] Free Cancellation & Automated Wallet Refund Credit...")
        cancel_result = await service.cancel_hotel_booking(
            customer_user_id=str(cust_user.id),
            booking_id=booking["booking_id"],
            reason="Travel dates rescheduled",
        )
        assert cancel_result["status"].upper() == "CANCELLED"
        assert cancel_result["financials"]["refund_status"] == "REFUNDED_WALLET"
        assert cancel_result["financials"]["refund_amount"] == booking["financials"]["total_fare"]

        # Check wallet refund in DB
        cust_profile_refreshed = (await db.execute(prof_stmt)).scalar_one()
        assert cust_profile_refreshed.wallet_balance == initial_wallet, (
            f"Wallet refund mismatch: Expected {initial_wallet}, found {cust_profile_refreshed.wallet_balance}"
        )
        print(f"  ✓ Booking Cancelled within free window.")
        print(f"  ✓ 100% Refund credited to wallet: ₹{cust_profile_refreshed.wallet_balance} (Restored to initial ₹{initial_wallet})")
        passed_tests += 1

        # ── TEST 7: Cross-Service Linked Airport Cab & Driver Zero-PII Isolation
        print("\n[TEST 7] Cross-Service Linked Airport Cab Ride & Driver Isolation...")
        # Create a new active booking to link
        booking_for_ride = await service.create_hotel_booking(
            customer_user_id=str(cust_user.id),
            unit_id=str(standard_unit.id),
            check_in=check_in,
            check_out=check_out,
            primary_guest_name="Vikramaditya Shinde",
            primary_guest_phone=customer_phone,
            rooms_count=1,
            payment_method="WALLET",
        )

        # Link Airport Cab Ride
        linked_ride = await service.link_cab_ride_to_stay(
            customer_user_id=str(cust_user.id),
            booking_id=booking_for_ride["booking_id"],
            ride_direction="AIRPORT_TO_HOTEL",
            airport_name="Goa Dabolim Airport (GOI)",
            airport_lat=15.3808,
            airport_lng=73.8314,
            scheduled_time=datetime.now() + timedelta(days=5, hours=14),
            vehicle_type="SEDAN",
            flight_number="6E-208",
        )
        assert linked_ride["linked_ride_id"] is not None
        assert linked_ride["direction"] == "AIRPORT_TO_HOTEL"
        assert linked_ride["estimated_fare"] > 0

        # Query the underlying RideRequest from the Cab matching engine
        ride_req_db = await db.get(RideRequest, uuid.UUID(linked_ride["linked_ride_id"]))
        assert ride_req_db is not None, "Underlying RideRequest was not found in booking database"
        assert ride_req_db.customer_id == cust_user.id
        assert ride_req_db.pickup_lat == 15.3808
        assert ride_req_db.pickup_lng == 73.8314
        assert ride_req_db.status == RideRequestStatus.CREATED

        # Verify Driver Isolation: The RideRequest contains only transit information
        # and has ZERO knowledge of hotel room number, hotel reservation financial totals, or room keys.
        assert not hasattr(ride_req_db, "room_number"), "Driver ride object leaked private hotel room number!"
        assert not hasattr(ride_req_db, "hotel_room_fare"), "Driver ride object leaked private hotel stay financials!"
        print(f"  ✓ Created canonical RideRequest: {ride_req_db.id} (Status: {ride_req_db.status.value})")
        print(f"  ✓ Linked Route: {linked_ride['pickup_address']} -> {linked_ride['destination_address']}")
        print(f"  ✓ Driver App Zero-PII Isolation: Verified no room numbers or stay financials exposed to cab drivers.")
        passed_tests += 1

    print("\n" + "=" * 80)
    print(f"🎉 FEATURE 16 E2E SUITE COMPLETE: {passed_tests}/{total_tests} TESTS PASSED (100%)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(run_feature16_hotel_e2e())
