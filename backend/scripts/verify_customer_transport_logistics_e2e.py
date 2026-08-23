"""
===============================================================================
E2E AUTOMATED VERIFICATION SUITE: FEATURE 17 — COMMERCIAL TRANSPORT LOGISTICS
===============================================================================
Verifies:
1. Estimate Calculation & Payload Overload Safety Check
2. Restricted Cargo Prohibited Item Detection
3. Instant Price Transport Order Creation & OTP Generation
4. Transporter Quotation Submission & Interactive Counter-Offer Bidding
5. Atomic Transporter Selection, Competing Quotes Deprecation & Wallet Debit
6. Operational Execution State Machine (Loading, Transit, Unloading)
7. Tamper-Proof POD Verification with Receiver OTP & Photo Evidence
8. Driver Earnings Ledger Settlement & Customer Order History
===============================================================================
"""
import asyncio
import os
import sys
import uuid
from decimal import Decimal

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
_TRANSPORT_DIR = os.path.join(_BACKEND_DIR, "transport-service")
if _TRANSPORT_DIR not in sys.path:
    sys.path.insert(0, _TRANSPORT_DIR)

from fastapi import HTTPException
from sqlalchemy import select
from common.database import async_session_maker
from common.models.all_models import (
    CustomerProfile, Driver, DriverStatus, LedgerType,
    TransportAssignment, TransportLoad, TransportOrder,
    TransportOrderStatus, TransportProofOfDelivery, TransportQuote,
    TransportQuoteEvent, TransportQuoteStatus, TransportStatusEvent,
    User, UserRole, Vehicle, VehicleType, WalletTransaction
)
from app.services.transport_service import TransportService


async def run_feature17_transport_e2e_tests():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("\n" + "=" * 80)
    print("🚀 RUNNING E2E TESTS: FEATURE 17 — COMMERCIAL GOODS TRANSPORT SERVICE")
    print("=" * 80 + "\n")

    passed_count = 0
    total_tests = 8

    async with async_session_maker() as db:
        service = TransportService(db)

        # Ensure demo test customer and drivers exist
        cust_res = await db.execute(select(User).where(User.phone == "+919822998877"))
        cust_user = cust_res.scalar_one_or_none()
        if not cust_user:
            cust_user = User(
                id=uuid.uuid4(),
                phone="+919822998877",
                role=UserRole.CUSTOMER,
                is_verified=True,
                is_active=True,
                is_profile_complete=True,
            )
            db.add(cust_user)
            await db.flush()

        prof_res = await db.execute(select(CustomerProfile).where(CustomerProfile.user_id == cust_user.id))
        cust_prof = prof_res.scalar_one_or_none()
        if not cust_prof:
            cust_prof = CustomerProfile(
                id=uuid.uuid4(),
                user_id=cust_user.id,
                full_name="Enterprise Logistics Client",
                wallet_balance=Decimal("35000.00"),
            )
            db.add(cust_prof)
        else:
            cust_prof.wallet_balance = Decimal("35000.00")

        # Driver 1
        d1_res = await db.execute(select(Driver).where(Driver.phone == "+919822001101"))
        driver1 = d1_res.scalar_one_or_none()
        v1_res = await db.execute(select(Vehicle).where(Vehicle.registration_number == "MH 12 TC 1024"))
        veh1 = v1_res.scalar_one_or_none()

        # Driver 2
        d2_res = await db.execute(select(Driver).where(Driver.phone == "+919822001102"))
        driver2 = d2_res.scalar_one_or_none()
        v2_res = await db.execute(select(Vehicle).where(Vehicle.registration_number == "MH 14 PF 8820"))
        veh2 = v2_res.scalar_one_or_none()

        await db.commit()

        # ─────────────────────────────────────────────────────────────
        # TEST 1: Pricing Estimation & Payload Overload Safety Check
        # ─────────────────────────────────────────────────────────────
        print("▶ TEST 1: Pricing Estimation & Capacity Validation...")
        est = await service.calculate_estimate(
            pickup_lat=18.6279,
            pickup_lng=73.8474,
            drop_lat=18.7562,
            drop_lng=73.8344,
            goods_category="MACHINERY",
            goods_description="CNC Machine Components",
            weight_kg=450.0,
            length_ft=5.0,
            width_ft=4.0,
            height_ft=3.0,
            package_count=3,
            loading_required=True,
            unloading_required=True,
            helpers_count=1,
            vehicle_category="BOLERO_PICKUP",
            declared_value=85000.0,
            promo_code="TRANSPORT200",
        )
        assert est["vehicle_category"] == "BOLERO_PICKUP"
        assert est["distance_km"] > 10.0
        assert est["financials"]["total_fare"] > 0
        assert est["financials"]["discount_amount"] == 200.0

        # Overload check: 6,000 kg on Mini truck should raise 400
        overload_caught = False
        try:
            await service.calculate_estimate(
                pickup_lat=18.6279,
                pickup_lng=73.8474,
                drop_lat=18.7562,
                drop_lng=73.8344,
                goods_category="MACHINERY",
                goods_description="Heavy steel coils",
                weight_kg=6000.0,
                vehicle_category="TATA_ACE",
            )
        except HTTPException as e:
            if "Overload safety error" in str(e.detail):
                overload_caught = True

        assert overload_caught, "Expected overload safety HTTPException for 6000kg on Tata Ace"
        print("  ✓ Pricing & Overload Safety: PASS")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 2: Restricted Cargo Safety Check
        # ─────────────────────────────────────────────────────────────
        print("▶ TEST 2: Restricted / Prohibited Cargo Detection...")
        restricted_caught = False
        try:
            await service.calculate_estimate(
                pickup_lat=18.6279,
                pickup_lng=73.8474,
                drop_lat=18.7562,
                drop_lng=73.8344,
                goods_category="GENERAL",
                goods_description="Unregistered toxic chemicals and explosives shipment",
                weight_kg=200.0,
                vehicle_category="BOLERO_PICKUP",
            )
        except HTTPException as e:
            if "Prohibited cargo detected" in str(e.detail):
                restricted_caught = True

        assert restricted_caught, "Expected prohibited cargo HTTPException"
        print("  ✓ Restricted Goods Check: PASS")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 3: Instant Price Transport Order Creation & OTP
        # ─────────────────────────────────────────────────────────────
        print("▶ TEST 3: Instant Price Order Creation & Verification OTP...")
        order1 = await service.create_transport_order(
            customer_user_id=str(cust_user.id),
            pickup_address="Bhosari MIDC Sector 10, Pune",
            pickup_lat=18.6279,
            pickup_lng=73.8474,
            pickup_contact_name="Aditya Patil",
            pickup_contact_phone="+919822001101",
            drop_address="Chakan Phase 2 Industrial Dock, Pune",
            drop_lat=18.7562,
            drop_lng=73.8344,
            drop_contact_name="Karan Shinde",
            drop_contact_phone="+919822001102",
            goods_category="MACHINERY",
            goods_description="Precision CNC Spares and hydraulic parts",
            weight_kg=450.0,
            length_ft=5.0,
            width_ft=4.0,
            height_ft=3.0,
            package_count=3,
            loading_required=True,
            unloading_required=True,
            helpers_count=1,
            vehicle_category_required="BOLERO_PICKUP",
            pricing_mode="INSTANT_PRICE",
            declared_value=85000.0,
            payment_method="WALLET",
            promo_code="TRANSPORT200",
        )

        assert order1["order_reference"].startswith("TRN-")
        assert len(order1["verification"]["delivery_otp"]) == 4
        assert order1["load"]["weight_kg"] == 450.0
        assert order1["handling"]["helpers_count"] == 1
        print(f"  ✓ Instant Order Created: {order1['order_reference']} (OTP: {order1['verification']['delivery_otp']}): PASS")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 4: Transporter Quotes Submission & Counter-Offer Bidding
        # ─────────────────────────────────────────────────────────────
        print("▶ TEST 4: Transporter Quotation Submission & Counter-Offers...")
        # Create quote mode order
        quote_order = await service.create_transport_order(
            customer_user_id=str(cust_user.id),
            pickup_address="Hadapsar Industrial Area, Pune",
            pickup_lat=18.5089,
            pickup_lng=73.9259,
            pickup_contact_name="Aditya Patil",
            pickup_contact_phone="+919822001101",
            drop_address="Ranjangaon MIDC Industrial Hub, Pune",
            drop_lat=18.7758,
            drop_lng=74.2372,
            drop_contact_name="Sunil Jadhav",
            drop_contact_phone="+919822001103",
            goods_category="FURNITURE",
            goods_description="Office furniture workbenches and ergonomic chairs",
            weight_kg=850.0,
            length_ft=8.0,
            width_ft=5.0,
            height_ft=4.0,
            package_count=12,
            loading_required=True,
            unloading_required=True,
            helpers_count=2,
            vehicle_category_required="BOLERO_PICKUP",
            pricing_mode="REQUEST_QUOTES",
            declared_value=120000.0,
        )
        assert quote_order["status"] == "quote_requested"

        # Transporter 1 submits quote
        t1_quote = await service.submit_transporter_quote(
            order_id=quote_order["order_id"],
            transporter_user_id=str(driver1.user_id),
            driver_id=str(driver1.id),
            vehicle_id=str(veh1.id),
            amount=2600.0,
            included_helpers=2,
            estimated_pickup_eta_min=15,
        )

        # Transporter 2 submits quote
        t2_quote = await service.submit_transporter_quote(
            order_id=quote_order["order_id"],
            transporter_user_id=str(driver2.user_id),
            driver_id=str(driver2.id),
            vehicle_id=str(veh2.id),
            amount=2400.0,
            included_helpers=2,
            estimated_pickup_eta_min=20,
        )

        # Customer sends counter-offer to Transporter 2
        counter_res = await service.send_counter_offer(
            quote_id=t2_quote["quote_id"],
            actor_user_id=str(cust_user.id),
            actor_type="CUSTOMER",
            counter_amount=2150.0,
            note="Can you do ₹2150? Warehouse loading dock is ready immediately.",
        )
        assert counter_res["amount"] == 2150.0
        assert counter_res["rounds_count"] == 2
        assert counter_res["status"] == "customer_countered"

        # Transporter 2 counters back
        counter_res2 = await service.send_counter_offer(
            quote_id=t2_quote["quote_id"],
            actor_user_id=str(driver2.user_id),
            actor_type="TRANSPORTER",
            counter_amount=2250.0,
            note="₹2250 final with 2 helpers included and guaranteed on-time delivery.",
        )
        assert counter_res2["amount"] == 2250.0
        assert counter_res2["rounds_count"] == 3
        print("  ✓ Multi-Transporter Bids & Counter-Offers: PASS")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 5: Atomic Transporter Selection & Competing Quotes Deprecation
        # ─────────────────────────────────────────────────────────────
        print("▶ TEST 5: Atomic Transporter Selection & Competing Quotes Deprecation...")
        initial_balance = cust_prof.wallet_balance

        selected_order = await service.select_quote(
            order_id=quote_order["order_id"],
            quote_id=t2_quote["quote_id"],
            customer_user_id=str(cust_user.id),
            payment_method="WALLET",
        )

        assert selected_order["status"] == "driver_assigned"
        assert selected_order["driver"]["name"] == "Patil Freight Carriers"
        assert selected_order["financials"]["total_fare"] == 2250.0
        assert selected_order["financials"]["payment_status"] == "PAID"

        # Check competing quote 1 is marked NOT_SELECTED
        q1_obj = await db.get(TransportQuote, uuid.UUID(t1_quote["quote_id"]))
        assert q1_obj.status == TransportQuoteStatus.NOT_SELECTED

        # Check winning quote is marked ACCEPTED
        q2_obj = await db.get(TransportQuote, uuid.UUID(t2_quote["quote_id"]))
        assert q2_obj.status == TransportQuoteStatus.ACCEPTED

        # Check wallet deduction
        await db.refresh(cust_prof)
        assert cust_prof.wallet_balance == initial_balance - Decimal("2250.00")
        print("  ✓ Atomic Transporter Selection & Wallet Hold: PASS")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 6: Operational Driver Execution State Machine
        # ─────────────────────────────────────────────────────────────
        print("▶ TEST 6: Operational State Machine (En Route -> Loading -> Transit -> Unloading)...")
        t_order_id = quote_order["order_id"]

        # En route
        st1 = await service.update_transport_status(t_order_id, str(driver2.user_id), "driver_en_route")
        assert st1["status"] == "driver_en_route"

        # Arrived pickup
        st2 = await service.update_transport_status(t_order_id, str(driver2.user_id), "arrived_pickup")
        assert st2["status"] == "arrived_pickup"

        # Loading started
        st3 = await service.update_transport_status(t_order_id, str(driver2.user_id), "loading_started", "Loading 12 packages")
        assert st3["status"] == "loading_started"

        # Loaded
        st4 = await service.update_transport_status(t_order_id, str(driver2.user_id), "loaded", "Secured with tarpaulin and cargo straps")
        assert st4["status"] == "loaded"

        # In transit
        st5 = await service.update_transport_status(t_order_id, str(driver2.user_id), "in_transit", "Driving on Pune-Nagar highway")
        assert st5["status"] == "in_transit"

        # Arrived destination
        st6 = await service.update_transport_status(t_order_id, str(driver2.user_id), "arrived_destination")
        assert st6["status"] == "arrived_destination"

        # Unloading started
        st7 = await service.update_transport_status(t_order_id, str(driver2.user_id), "unloading_started", "Unloading at dock 4")
        assert st7["status"] == "unloading_started"

        print("  ✓ Full Execution Progression: PASS")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 7: Tamper-Proof POD Verification with OTP
        # ─────────────────────────────────────────────────────────────
        print("▶ TEST 7: Tamper-Proof Proof of Delivery (POD) & OTP Verification...")
        valid_otp = selected_order["verification"]["delivery_otp"]

        # Wrong OTP test
        wrong_otp_caught = False
        try:
            await service.verify_pod_and_complete(
                order_id=t_order_id,
                driver_id=str(driver2.id),
                receiver_name="Sunil Jadhav",
                receiver_phone="+919822001103",
                delivery_otp="9999",
            )
        except HTTPException as e:
            if "Invalid Delivery OTP" in str(e.detail):
                wrong_otp_caught = True
        assert wrong_otp_caught, "Expected HTTPException on wrong delivery OTP"

        # Valid OTP verification
        pod_res = await service.verify_pod_and_complete(
            order_id=t_order_id,
            driver_id=str(driver2.id),
            receiver_name="Sunil Jadhav",
            receiver_phone="+919822001103",
            delivery_otp=valid_otp,
            photo_url="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d",
            signature_url="https://example.com/signatures/sunil_j.png",
            delivery_notes="All 12 packages unloaded in mint condition with zero damage.",
            latitude=18.7758,
            longitude=74.2372,
        )

        assert pod_res["success"] is True
        assert pod_res["status"] == "DELIVERED"
        assert pod_res["receiver_name"] == "Sunil Jadhav"
        assert pod_res["driver_earning"] > 0
        print("  ✓ POD OTP Verification & Certificate Generation: PASS")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 8: Driver Earnings Release & Customer Order History
        # ─────────────────────────────────────────────────────────────
        print("▶ TEST 8: Driver Financial Ledger Settlement & Customer Order History...")
        d2_user = await db.get(User, driver2.user_id)
        d2_prof_res = await db.execute(select(CustomerProfile).where(CustomerProfile.user_id == d2_user.id))
        d2_prof = d2_prof_res.scalar_one_or_none()
        assert d2_prof.wallet_balance >= Decimal("30000.00") + Decimal("1912.50")  # 85% of 2250 is 1912.50

        # Customer Order History
        my_orders = await service.get_customer_orders(str(cust_user.id))
        assert len(my_orders) >= 2
        assert any(o["status"] == "delivered" for o in my_orders)
        print(f"  ✓ Driver Earnings Settled (₹{pod_res['driver_earning']}) & {len(my_orders)} Orders in History: PASS")
        passed_count += 1

    print("\n" + "=" * 80)
    print(f"🎉 FEATURE 17 E2E VERIFICATION COMPLETED: {passed_count}/{total_tests} TESTS PASSED (100%)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(run_feature17_transport_e2e_tests())
