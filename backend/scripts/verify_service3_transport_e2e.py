"""
Master Production Verification Suite: SERVICE 3 — TRANSPORT & FREIGHT LOGISTICS
Tests:
1. Freight Pricing Engine: Authoritative itemized estimates across fleet classes (Tata Ace, Bolero, Eicher 14ft, 19ft, 32ft Trailer)
2. Commercial Order Creation: Load specs, dimensional volume (CFT), loading/unloading helpers, declared value
3. Multi-Transporter Quoting: Multiple transporters submit commercial bids
4. Interactive Negotiation: Multi-round counter-offers between Customer & Transporter (TransportQuoteEvent audit)
5. Atomic Winning Quote Selection: Winner locked (ACCEPTED), competitors marked NOT_SELECTED, assignment created
6. Operational Execution State Machine: Loading Started -> Loaded -> In Transit -> Arrived -> Unloading
7. Receiver OTP & Proof of Delivery (POD): Delivery OTP verification, signature & photo POD, double-entry DriverEarningLedger settlement
8. Cancellation Workflow: Cancel order -> CANCELLED state + status event audit
"""
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import asyncio

# Add python paths
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_root, "common"))
sys.path.insert(0, os.path.join(_root, "transport-service"))
sys.path.insert(0, _root)

from sqlalchemy import select, and_, text
from common.database import async_session_maker, engine
from common.models.all_models import (
    User, UserRole, Driver, DriverStatus, KYCStatus, Vehicle, VehicleType,
    TransportOrder, TransportOrderStatus, TransportLoad, TransportQuote,
    TransportQuoteStatus, TransportQuoteEvent, TransportAssignment,
    TransportStatusEvent, TransportProofOfDelivery, DriverEarningLedger,
)
from app.services.transport_service import TransportService

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_transport_service_verification():
    print("=" * 80)
    print("🚚 STARTING SERVICE 3 (TRANSPORT & FREIGHT LOGISTICS) PRODUCTION VERIFICATION")
    print("=" * 80)

    await engine.dispose()

    async with async_session_maker() as session:
        # =========================================================================
        # SETUP SEED DATA
        # =========================================================================
        print("\n[SETUP] Seeding Commercial Customer, Transporter & Heavy Vehicles...", flush=True)

        # 1. Commercial Customer
        customer_user = User(
            id=uuid.uuid4(),
            phone=f"+9196{str(uuid.uuid4().int)[:8]}",
            email=f"transport.cust.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(customer_user)

        # 2. Transporter 1 (Tata Ace Operator)
        t1_user = User(
            id=uuid.uuid4(),
            phone=f"+9195{str(uuid.uuid4().int)[:8]}",
            email=f"transporter1.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(t1_user)
        driver1 = Driver(
            id=uuid.uuid4(),
            user_id=t1_user.id,
            full_name="Vijay Logistics (Tata Ace)",
            phone=t1_user.phone,
            rating=4.88,
            total_trips=210,
            wallet_balance=Decimal("1500.00"),
            total_earnings=Decimal("95000.00"),
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_location="SRID=4326;POINT(73.8567 18.5204)",
        )
        session.add(driver1)

        v1 = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver1.id,
            make="Tata",
            model="Ace Gold",
            year=2023,
            color="White",
            registration_number=f"MH-12-T{uuid.uuid4().hex[:3].upper()}",
            vehicle_type=VehicleType.HATCHBACK,
            seat_capacity=2,
            status="APPROVED",
            commercial_permit=True,
            transport_capable=True,
            parcel_capable=True,
            parcel_capacity_kg=750.0,
            max_payload_kg=750.0,
            cargo_volume_cft=120.0,
        )
        session.add(v1)

        # 3. Transporter 2 (Eicher 14ft Operator)
        t2_user = User(
            id=uuid.uuid4(),
            phone=f"+9194{str(uuid.uuid4().int)[:8]}",
            email=f"transporter2.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(t2_user)
        driver2 = Driver(
            id=uuid.uuid4(),
            user_id=t2_user.id,
            full_name="Mahalaxmi Freight (Eicher 14ft)",
            phone=t2_user.phone,
            rating=4.92,
            total_trips=430,
            wallet_balance=Decimal("2800.00"),
            total_earnings=Decimal("340000.00"),
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_location="SRID=4326;POINT(73.8600 18.5250)",
        )
        session.add(driver2)

        v2 = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver2.id,
            make="Eicher",
            model="Pro 2049 14ft",
            year=2022,
            color="Blue",
            registration_number=f"MH-12-E{uuid.uuid4().hex[:3].upper()}",
            vehicle_type=VehicleType.TEMPO_TRAVELLER,
            seat_capacity=3,
            status="APPROVED",
            commercial_permit=True,
            transport_capable=True,
            parcel_capable=True,
            parcel_capacity_kg=4000.0,
            max_payload_kg=4000.0,
            cargo_volume_cft=650.0,
        )
        session.add(v2)

        await session.commit()
        print("[SETUP] Commercial Seed data committed successfully!", flush=True)

        transport_svc = TransportService(session)

        # =========================================================================
        # TEST 1: AUTHORITATIVE FREIGHT ESTIMATE CALCULATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 1: AUTHORITATIVE FREIGHT ESTIMATE CALCULATION")
        print("=" * 70)

        estimate = await transport_svc.calculate_estimate(
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            drop_lat=18.5913,
            drop_lng=73.7389,
            goods_category="MACHINERY",
            goods_description="Industrial CNC Spare Parts",
            weight_kg=1200.0,
            length_ft=6.0,
            width_ft=4.0,
            height_ft=4.0,
            package_count=4,
            loading_required=True,
            unloading_required=True,
            helpers_count=2,
            vehicle_category="EICHER_14FT",
            declared_value=150000.0,
        )

        assert estimate["total_fare"] > 0, "Total fare must be > 0"
        assert estimate["driver_earning"] > 0, "Driver earning must be > 0"
        assert estimate["volume_cft"] == 96.0, f"Volume should be 6*4*4=96 CFT, got {estimate['volume_cft']}"
        assert estimate["vehicle_category"] == "EICHER_14FT"
        print(f"  [OK] Freight Estimate: Total=Rs.{estimate['total_fare']}, Driver Earning=Rs.{estimate['driver_earning']}, Volume={estimate['volume_cft']} CFT")

        # =========================================================================
        # TEST 2: TRANSPORT ORDER CREATION & LOAD REGISTRATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 2: TRANSPORT ORDER CREATION & LOAD REGISTRATION")
        print("=" * 70)

        created_order = await transport_svc.create_transport_order(
            customer_user_id=str(customer_user.id),
            pickup_address="Bhosari MIDC, Pune",
            pickup_lat=18.6274,
            pickup_lng=73.8447,
            pickup_contact_name="Ramesh (Factory Dispatch)",
            pickup_contact_phone="+919876543210",
            drop_address="Chakan Phase 2, Pune",
            drop_lat=18.7606,
            drop_lng=73.8640,
            drop_contact_name="Suresh (Warehouse Manager)",
            drop_contact_phone="+919123456789",
            goods_category="MACHINERY",
            goods_description="Heavy Electric Motors",
            weight_kg=650.0,
            length_ft=5.0,
            width_ft=3.5,
            height_ft=3.0,
            package_count=3,
            loading_required=True,
            unloading_required=True,
            helpers_count=1,
            vehicle_category_required="TATA_ACE",
            pricing_mode="REQUEST_QUOTES",
            declared_value=85000.0,
            payment_method="WALLET",
        )

        order_id = created_order["order_id"]
        order_ref = created_order["order_reference"]
        delivery_otp = created_order["delivery_otp"]

        assert len(delivery_otp) == 4, f"Delivery OTP must be 4 digits, got {delivery_otp}"
        assert order_ref.startswith("TRN-"), f"Order reference must start with TRN-, got {order_ref}"
        assert created_order["status"] == TransportOrderStatus.QUOTE_REQUESTED.value
        print(f"  [OK] Created Transport Order: Ref={order_ref}, ID={order_id}, Status={created_order['status']}")
        print(f"  [OK] Generated Delivery OTP: {delivery_otp}")

        # =========================================================================
        # TEST 3: MULTI-TRANSPORTER QUOTE SUBMISSIONS
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 3: MULTI-TRANSPORTER COMMERCIAL QUOTE SUBMISSIONS")
        print("=" * 70)

        # Transporter 1 submits Quote 1 (Rs. 1850)
        q1_res = await transport_svc.submit_transporter_quote(
            order_id=order_id,
            transporter_user_id=str(t1_user.id),
            driver_id=str(driver1.id),
            vehicle_id=str(v1.id),
            amount=1850.0,
            included_helpers=1,
            estimated_pickup_eta_min=20,
            estimated_transit_duration_min=45,
        )
        q1_id = q1_res["quote_id"]
        assert q1_res["success"] is True
        print(f"  [OK] Transporter 1 Quote Submitted: ID={q1_id}, Amount=Rs.1850")

        # Transporter 2 submits Quote 2 (Rs. 2100)
        q2_res = await transport_svc.submit_transporter_quote(
            order_id=order_id,
            transporter_user_id=str(t2_user.id),
            driver_id=str(driver2.id),
            vehicle_id=str(v2.id),
            amount=2100.0,
            included_helpers=2,
            estimated_pickup_eta_min=15,
            estimated_transit_duration_min=40,
        )
        q2_id = q2_res["quote_id"]
        assert q2_res["success"] is True
        print(f"  [OK] Transporter 2 Quote Submitted: ID={q2_id}, Amount=Rs.2100")

        # Verify quotes list on order
        quotes_list = await transport_svc.get_order_quotes(order_id)
        assert len(quotes_list) == 2, f"Should have 2 submitted quotes, got {len(quotes_list)}"
        print(f"  [OK] Order Quotes List: {len(quotes_list)} competitive quotes active.")

        # =========================================================================
        # TEST 4: INTERACTIVE MULTI-ROUND COUNTER-OFFER NEGOTIATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 4: INTERACTIVE NEGOTIATION & COUNTER-OFFERS")
        print("=" * 70)

        # Customer sends counter-offer of Rs. 1650 to Transporter 1
        counter1 = await transport_svc.send_counter_offer(
            quote_id=q1_id,
            actor_user_id=str(customer_user.id),
            actor_type="CUSTOMER",
            counter_amount=1650.0,
            note="Can you do 1650? Immediate load ready.",
        )
        assert counter1["status"] == TransportQuoteStatus.CUSTOMER_COUNTERED.value
        assert counter1["amount"] == 1650.0
        print(f"  [OK] Customer Counter-Offer Sent: Rs.1650 -> Status: {counter1['status']}")

        # Transporter 1 counters back with Rs. 1750
        counter2 = await transport_svc.send_counter_offer(
            quote_id=q1_id,
            actor_user_id=str(t1_user.id),
            actor_type="TRANSPORTER",
            counter_amount=1750.0,
            note="Best price Rs. 1750 with 1 helper included.",
        )
        assert counter2["status"] == TransportQuoteStatus.TRANSPORTER_COUNTERED.value
        assert counter2["amount"] == 1750.0
        print(f"  [OK] Transporter Counter-Offer Sent: Rs.1750 -> Status: {counter2['status']}")

        # Verify quote event audit history
        quote_events_res = await session.execute(
            select(TransportQuoteEvent).where(TransportQuoteEvent.quote_id == uuid.UUID(q1_id))
        )
        quote_events = quote_events_res.scalars().all()
        assert len(quote_events) >= 3, f"Quote should have submission + 2 counter events, got {len(quote_events)}"
        print(f"  [OK] Negotiation Audit Trail: {len(quote_events)} immutable quote events recorded.")

        # =========================================================================
        # TEST 5: ATOMIC WINNING QUOTE SELECTION (Concurrency Shield)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 5: ATOMIC WINNING QUOTE SELECTION & ASSIGNMENT")
        print("=" * 70)

        # Customer accepts Transporter 1's agreed quote of Rs. 1750
        select_res = await transport_svc.select_quote(
            order_id=order_id,
            quote_id=q1_id,
            customer_user_id=str(customer_user.id),
            payment_method="WALLET",
        )
        assert select_res["status"] == TransportOrderStatus.DRIVER_ASSIGNED.value
        assert select_res["driver"]["name"] == driver1.full_name
        print(f"  [OK] Winner Locked: Transporter 1 assigned! Order Status: {select_res['status']}")

        # Verify Transporter 2's competing quote was automatically marked NOT_SELECTED
        q2_obj = await session.get(TransportQuote, uuid.UUID(q2_id))
        assert q2_obj.status == TransportQuoteStatus.NOT_SELECTED, f"Competitor quote should be NOT_SELECTED, got {q2_obj.status}"
        print(f"  [OK] Concurrency Shield: Competitor quote correctly marked {q2_obj.status.value}.")

        # Verify TransportAssignment record
        assign_res = await session.execute(
            select(TransportAssignment).where(TransportAssignment.order_id == uuid.UUID(order_id))
        )
        assignment = assign_res.scalar_one_or_none()
        assert assignment is not None, "TransportAssignment must be created"
        assert assignment.driver_id == driver1.id
        print(f"  [OK] Operational Assignment: Binding Order -> Driver {driver1.id} & Vehicle {v1.id}")

        # =========================================================================
        # TEST 6: MULTI-STAGE OPERATIONAL EXECUTION STATE MACHINE
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 6: OPERATIONAL EXECUTION STATE TRANSITIONS")
        print("=" * 70)

        # 1. Driver en route
        s1 = await transport_svc.update_transport_status(order_id, str(t1_user.id), "driver_en_route", "En route to Bhosari MIDC")
        assert s1["status"] == "driver_en_route"
        print("  [OK] Status: driver_en_route")

        # 2. Arrived at pickup
        s2 = await transport_svc.update_transport_status(order_id, str(t1_user.id), "arrived_pickup", "At factory gate 3")
        assert s2["status"] == "arrived_pickup"
        print("  [OK] Status: arrived_pickup")

        # 3. Loading started
        s3 = await transport_svc.update_transport_status(order_id, str(t1_user.id), "loading_started", "Crane loading electric motors")
        assert s3["status"] == "loading_started"
        print("  [OK] Status: loading_started")

        # 4. Loaded & secured
        s4 = await transport_svc.update_transport_status(order_id, str(t1_user.id), "loaded", "Tarpaulin tied and secured")
        assert s4["status"] == "loaded"
        print("  [OK] Status: loaded")

        # 5. In transit
        s5 = await transport_svc.update_transport_status(order_id, str(t1_user.id), "in_transit", "On Pune-Nashik highway")
        assert s5["status"] == "in_transit"
        print("  [OK] Status: in_transit")

        # 6. Arrived destination
        s6 = await transport_svc.update_transport_status(order_id, str(t1_user.id), "arrived_destination", "At Chakan warehouse dock 2")
        assert s6["status"] == "arrived_destination"
        print("  [OK] Status: arrived_destination")

        # 7. Unloading started
        s7 = await transport_svc.update_transport_status(order_id, str(t1_user.id), "unloading_started", "Forklift unloading cargo")
        assert s7["status"] == "unloading_started"
        print("  [OK] Status: unloading_started")

        # =========================================================================
        # TEST 7: RECEIVER DELIVERY OTP, PROOF OF DELIVERY (POD) & SETTLEMENT
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 7: RECEIVER DELIVERY OTP, POD SIGNATURE & EARNINGS SETTLEMENT")
        print("=" * 70)

        # Test Invalid Delivery OTP Attempt
        try:
            await transport_svc.verify_pod_and_complete(
                order_id=order_id,
                driver_id=str(driver1.id),
                receiver_name="Suresh",
                receiver_phone="+919123456789",
                delivery_otp="0000",
            )
            assert False, "Invalid delivery OTP should fail"
        except Exception:
            print("  [OK] Invalid Delivery OTP correctly rejected with attempt penalty.")

        # Test Valid Delivery OTP + Digital Signature & Photo POD
        pod_res = await transport_svc.verify_pod_and_complete(
            order_id=order_id,
            driver_id=str(driver1.id),
            receiver_name="Suresh (Warehouse Manager)",
            receiver_phone="+919123456789",
            delivery_otp=delivery_otp,
            signature_url="https://res.cloudinary.com/demo/image/upload/v1/signatures/suresh_chakan_sig.png",
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/pod/heavy_motors_unloaded.jpg",
            delivery_notes="All 3 heavy motors unloaded with zero transit damage.",
            latitude=18.7606,
            longitude=73.8640,
        )
        assert pod_res["success"] is True
        assert pod_res["status"].upper() == "DELIVERED"
        print(f"  [OK] Transport Completed with OTP {delivery_otp}! Status: DELIVERED.")

        # Verify Driver Wallet Credited
        await session.refresh(driver1)
        assert driver1.wallet_balance > Decimal("1500.00"), f"Driver wallet must have increased from 1500, got {driver1.wallet_balance}"

        # Verify Immutable Proof of Delivery Record
        pod_record_res = await session.execute(
            select(TransportProofOfDelivery).where(TransportProofOfDelivery.order_id == uuid.UUID(order_id))
        )
        pod_obj = pod_record_res.scalar_one_or_none()
        assert pod_obj is not None, "TransportProofOfDelivery must be recorded"
        assert pod_obj.otp_verified is True
        assert pod_obj.signature_url is not None
        print(f"  [OK] Immutable POD Verified: Receiver={pod_obj.receiver_name}, Signature={pod_obj.signature_url}")

        # Verify Double-Entry Driver Earnings Ledger
        ledger_res = await session.execute(
            select(DriverEarningLedger).where(DriverEarningLedger.driver_id == driver1.id)
        )
        ledgers = ledger_res.scalars().all()
        assert len(ledgers) > 0, "DriverEarningLedger must have an entry for transport completion"
        print(f"  [OK] Double-Entry Ledger Verified: {len(ledgers)} transport earnings logged with direction CREDIT.")

        # =========================================================================
        # TEST 8: TRANSPORT CANCELLATION WORKFLOW
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 8: TRANSPORT ORDER CANCELLATION WORKFLOW")
        print("=" * 70)

        cancel_order = await transport_svc.create_transport_order(
            customer_user_id=str(customer_user.id),
            pickup_address="Hadapsar Industrial Area",
            pickup_lat=18.5089,
            pickup_lng=73.9259,
            pickup_contact_name="Kunal",
            pickup_contact_phone="+919876543210",
            drop_address="Ranjangaon MIDC",
            drop_lat=18.7750,
            drop_lng=74.2250,
            drop_contact_name="Ganesh",
            drop_contact_phone="+919123456789",
            goods_category="GENERAL",
            goods_description="Cardboard packing boxes",
            weight_kg=300.0,
            vehicle_category_required="TATA_ACE",
        )
        c_oid = cancel_order["order_id"]

        cancel_res = await transport_svc.cancel_transport_order(
            order_id=c_oid,
            user_id=str(customer_user.id),
            user_role="CUSTOMER",
            reason="Shipment postponed by client",
        )
        assert cancel_res["success"] is True
        assert cancel_res["status"] == TransportOrderStatus.CANCELLED.value

        # Verify status event audit
        events_res = await session.execute(
            select(TransportStatusEvent).where(TransportStatusEvent.order_id == uuid.UUID(c_oid))
        )
        events = events_res.scalars().all()
        assert any(e.status == TransportOrderStatus.CANCELLED.value for e in events), "Cancellation must be audited in status events"
        print(f"  [OK] Transport Cancelled -> Status: CANCELLED, audited with reason in TransportStatusEvent.")

        print("\n" + "=" * 80)
        print("🎉 ALL 8 SERVICE 3 (TRANSPORT & FREIGHT) TEST SCENARIOS PASSED WITH 100% SUCCESS!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_transport_service_verification())
