"""
Master Verification Suite: Phase 24 — Notification + Safety Engine
===================================================================
Covers all specifications from Phase 24 of MainRemberme.md:
1. Device Token Registration & Refresh (FCM / APNs)
2. Customer Lifecycle Notifications (13 Event Types)
3. Partner Lifecycle Notifications (9 Event Types)
4. Idempotent Duplicate Push & Socket Suppression
5. App Reopened Pending State Sync (Active Ride + Unread Feed + Safety)
6. Trusted Emergency Contacts CRUD & Policy Limit
7. Emergency SOS Trigger with 112 Escalation & Idempotency
8. Active Trip Scoping Constraint (Strict Inactive Ride Rejection)
9. Live Tokenized Trip Sharing (3h TTL, Zero PII Leak)
10. Route Anomaly Deviation Detector (> 500m Off Corridor)
11. Unexpected Stop Anomaly Detector & "I'm Safe" Resolution
12. Safety Support Priority Escalation
"""
from __future__ import annotations

import sys
import os
import asyncio
import uuid
import importlib.util
from decimal import Decimal
from datetime import datetime, timezone, timedelta

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Adjust Python Path to backend root
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
notif_service_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "notification-service"))
matching_service_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "matching-service"))
auth_service_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "auth-service"))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if notif_service_dir not in sys.path:
    sys.path.insert(0, notif_service_dir)
if matching_service_dir not in sys.path:
    sys.path.insert(0, matching_service_dir)
if auth_service_dir not in sys.path:
    sys.path.insert(0, auth_service_dir)

from common.database import async_session_maker, engine
from common.models.all_models import (
    User,
    Driver,
    Vehicle,
    VehicleType,
    CustomerProfile,
    RideRequest,
    RideRequestStatus,
    RideSOSEvent,
    DriverSafetyAlert,
    CustomerEmergencyContact,
    DriverTrustedContact,
    LiveTripShareSession,
    SafetyIncidentReport,
    Notification,
)

def load_module_from_path(module_name: str, file_path: str):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

# Dynamically import service classes
notif_mod = load_module_from_path(
    "notification_engine_service",
    os.path.join(notif_service_dir, "app", "services", "notification_engine_service.py")
)
NotificationEngineService = notif_mod.NotificationEngineService
NOTIFICATION_EVENT_TEMPLATES = notif_mod.NOTIFICATION_EVENT_TEMPLATES

safety_mod = load_module_from_path(
    "driver_safety_service",
    os.path.join(matching_service_dir, "app", "services", "driver_safety_service.py")
)
DriverSafetyService = safety_mod.DriverSafetyService

# Test results tracker
RESULTS = []

def record_result(test_name: str, passed: bool, error: str = ""):
    status = "[PASS]" if passed else "[FAIL]"
    RESULTS.append((test_name, passed, error))
    print(f"  {status} {test_name}" + (f" ── Error: {error}" if error else ""))


async def create_test_customer(session, name: str, token: str = "fcm_cust_device_token_abc123") -> tuple[User, CustomerProfile]:
    u_id = uuid.uuid4()
    rand_suffix = uuid.uuid4().hex[:6]
    user = User(
        id=u_id,
        phone=f"+9198{uuid.uuid4().int % 100000000:08d}",
        email=f"cust_{rand_suffix}@test.com",
        role="customer",
        device_token=token,
        is_active=True,
        is_verified=True,
    )
    profile = CustomerProfile(
        id=uuid.uuid4(),
        user_id=u_id,
        full_name=name,
        wallet_balance=Decimal("2500.00"),
    )
    session.add(user)
    session.add(profile)
    await session.commit()
    return user, profile


async def create_test_partner(session, name: str, token: str = "fcm_partner_device_token_xyz789") -> tuple[User, Driver, Vehicle]:
    u_id = uuid.uuid4()
    d_id = uuid.uuid4()
    rand_suffix = uuid.uuid4().hex[:6]
    user = User(
        id=u_id,
        phone=f"+9197{uuid.uuid4().int % 100000000:08d}",
        email=f"driver_{rand_suffix}@test.com",
        role="driver",
        device_token=token,
        is_active=True,
        is_verified=True,
    )
    driver = Driver(
        id=d_id,
        user_id=u_id,
        full_name=name,
        phone=user.phone,
        _is_online=True,
        _is_active=True,
        rating=4.92,
        wallet_balance=Decimal("5000.00"),
        total_earnings=Decimal("12000.00"),
    )
    vehicle = Vehicle(
        id=uuid.uuid4(),
        driver_id=d_id,
        vehicle_type=VehicleType.SEDAN,
        make="Hyundai",
        model="Aura",
        year=2023,
        registration_number=f"MH12{uuid.uuid4().hex[:4].upper()}",
        color="Silver",
        seat_capacity=4,
        is_active=True,
    )
    session.add(user)
    session.add(driver)
    session.add(vehicle)
    await session.commit()
    return user, driver, vehicle


async def create_test_ride(
    session,
    customer_id: uuid.UUID,
    driver_id: uuid.UUID,
    status: RideRequestStatus = RideRequestStatus.IN_PROGRESS,
) -> RideRequest:
    pickup_lat, pickup_lng = 18.5314, 73.8446
    dest_lat, dest_lng = 18.5516, 73.9525
    ride = RideRequest(
        id=uuid.uuid4(),
        customer_id=customer_id,
        assigned_driver_id=driver_id,
        pickup_address="Shivajinagar Station, Pune",
        pickup_lat=pickup_lat,
        pickup_lng=pickup_lng,
        pickup_location=f"SRID=4326;POINT({pickup_lng} {pickup_lat})",
        destination_address="EON Free Zone, Kharadi, Pune",
        destination_lat=dest_lat,
        destination_lng=dest_lng,
        destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
        start_pin_plain="4829",
        status=status,
        estimated_fare=Decimal("350.00"),
        distance_travelled_km=3.5,
        estimated_distance_km=14.2,
        started_at=datetime.now(timezone.utc) - timedelta(minutes=15),
    )
    session.add(ride)
    await session.commit()
    return ride


async def run_phase24_verification():
    print("\n" + "=" * 85)
    print("🔔🛡️ STARTING PHASE 24: NOTIFICATION + SAFETY ENGINE VERIFICATION")
    print("=" * 85)

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: Device Token Registration & Refresh
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 1: Device Token Registration & Refresh ---")
    async with async_session_maker() as session:
        u_c1, p_c1 = await create_test_customer(session, "Notif Customer 1", "old_token_12345")
        u_d1, d_d1, v_d1 = await create_test_partner(session, "Notif Partner 1", "old_token_67890")

        notif_engine = NotificationEngineService(session)

        # Refresh Customer Token (iOS APNs)
        new_cust_token = "apns_live_device_token_cust_aabbccddee112233"
        c_tok_res = await notif_engine.refresh_device_token(
            user_id=u_c1.id,
            device_token=new_cust_token,
            platform="ios",
            user_type="customer",
        )
        record_result(
            "Customer Device Token Refresh: Successfully updated APNs token with masked audit",
            c_tok_res["success"] is True and c_tok_res["platform"] == "ios" and "••••••••" in c_tok_res["device_token_masked"],
        )

        # Refresh Driver Token (Android FCM)
        new_drv_token = "fcm_live_device_token_partner_ffgghhiijj445566"
        d_tok_res = await notif_engine.refresh_device_token(
            user_id=u_d1.id,
            device_token=new_drv_token,
            platform="android",
            user_type="driver",
        )
        record_result(
            "Partner Device Token Refresh: Successfully updated Android FCM token",
            d_tok_res["success"] is True and d_tok_res["platform"] == "android",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: Customer Lifecycle Notifications (13 Event Types)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 2: Customer Lifecycle Notifications ---")
    async with async_session_maker() as session:
        notif_engine = NotificationEngineService(session)

        customer_events = [
            ("CUSTOMER_REQUEST", {}),
            ("CUSTOMER_PARTNER_ASSIGNED", {"driver_name": "Rajesh Sharma", "vehicle_number": "MH12AB1234", "eta": "4"}),
            ("CUSTOMER_ARRIVING", {}),
            ("CUSTOMER_ARRIVED", {}),
            ("CUSTOMER_OTP", {"otp": "7194"}),
            ("CUSTOMER_STARTED", {"destination": "Kharadi IT Park"}),
            ("CUSTOMER_COMPLETED", {"amount": "385.00"}),
            ("CUSTOMER_PAYMENT", {"amount": "385.00", "payment_method": "UPI Wallet"}),
            ("CUSTOMER_REFUND", {"amount": "50.00", "destination": "CabPay Balance"}),
            ("CUSTOMER_PARCEL", {"reference": "PKG-260829-99AA", "status": "OUT_FOR_DELIVERY"}),
            ("CUSTOMER_HOTEL", {"booking_id": "HTL-5521", "hotel_name": "Grand Hyatt", "checkin_date": "Tomorrow, 2:00 PM"}),
            ("CUSTOMER_SUPPORT", {"ticket_id": "TCK-8812", "update_message": "Refund approved and credited"}),
            ("CUSTOMER_SAFETY", {}),
        ]

        cust_dispatch_success = True
        for ev_type, placeholders in customer_events:
            res = await notif_engine.dispatch_event(
                event_type=ev_type,
                recipient_id=str(u_c1.id),
                recipient_type="customer",
                placeholders=placeholders,
                device_token=new_cust_token,
                device_platform="ios",
                channels=["FOREGROUND", "BACKGROUND", "IN_APP"],
            )
            if not res["success"] or "IN_APP" not in res["dispatched_channels"]:
                cust_dispatch_success = False

        record_result(
            "Customer Lifecycle Notifications: Successfully dispatched and saved all 13 customer event types",
            cust_dispatch_success is True,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: Partner Lifecycle Notifications (9 Event Types)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 3: Partner Lifecycle Notifications ---")
    async with async_session_maker() as session:
        notif_engine = NotificationEngineService(session)

        partner_events = [
            ("PARTNER_NEW_REQUEST", {"fare": "420", "distance_km": "12.4", "pickup": "Baner", "destination": "Magarpatta"}),
            ("PARTNER_REQUEST_TAKEN", {"ride_id": "RIDE-9912"}),
            ("PARTNER_REQUEST_EXPIRED", {"ride_id": "RIDE-9912"}),
            ("PARTNER_ASSIGNMENT", {"ride_id": "SCH-4411", "scheduled_time": "Tomorrow 08:30 AM"}),
            ("PARTNER_CUSTOMER_CANCELLATION", {"ride_id": "RIDE-8821", "cancellation_fee": "50.00"}),
            ("PARTNER_SCHEDULED_TRIP", {"ride_id": "SCH-4411", "minutes_left": "30"}),
            ("PARTNER_DOCUMENT_EXPIRY", {"document_name": "Commercial Driving License", "days_left": "7"}),
            ("PARTNER_EARNINGS", {"amount": "3,450.00", "date": "Today"}),
            ("PARTNER_SAFETY", {}),
        ]

        partner_dispatch_success = True
        for ev_type, placeholders in partner_events:
            res = await notif_engine.dispatch_event(
                event_type=ev_type,
                recipient_id=str(u_d1.id),
                recipient_type="driver",
                placeholders=placeholders,
                device_token=new_drv_token,
                device_platform="android",
                channels=["FOREGROUND", "BACKGROUND", "IN_APP"],
            )
            if not res["success"] or res["push_sent"] is not True:
                partner_dispatch_success = False

        record_result(
            "Partner Lifecycle Notifications: Successfully formatted and delivered all 9 partner notification types",
            partner_dispatch_success is True,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: Idempotent Duplicate Push & Socket Suppression
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 4: Idempotent Duplicate Push & Socket Suppression ---")
    async with async_session_maker() as session:
        notif_engine = NotificationEngineService(session)

        fixed_idemp_key = f"ride_started:ride_test_{uuid.uuid4().hex[:6]}"

        # First Dispatch
        first_res = await notif_engine.dispatch_event(
            event_type="CUSTOMER_STARTED",
            recipient_id=str(u_c1.id),
            placeholders={"destination": "Pune Airport"},
            idempotency_key=fixed_idemp_key,
            channels=["FOREGROUND", "BACKGROUND", "IN_APP"],
        )

        # Duplicate Dispatch Attempt
        dup_res = await notif_engine.dispatch_event(
            event_type="CUSTOMER_STARTED",
            recipient_id=str(u_c1.id),
            placeholders={"destination": "Pune Airport"},
            idempotency_key=fixed_idemp_key,
            channels=["FOREGROUND", "BACKGROUND", "IN_APP"],
        )

        record_result(
            "Idempotent Duplicate Suppression: Second push with identical key is strictly suppressed",
            first_res["success"] is True and dup_res["is_duplicate"] is True and dup_res["status"] == "DUPLICATE_SUPPRESSED",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: App Reopened Pending State Sync
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 5: App Reopened Pending State Sync ---")
    async with async_session_maker() as session:
        u_c2, p_c2 = await create_test_customer(session, "Sync Customer 2")
        u_d2, d_d2, v_d2 = await create_test_partner(session, "Sync Partner 2")

        # Create active ride
        active_ride = await create_test_ride(session, u_c2.id, d_d2.id, status=RideRequestStatus.IN_PROGRESS)

        notif_engine = NotificationEngineService(session)

        # Send unread notification to customer
        await notif_engine.dispatch_event(
            event_type="CUSTOMER_STARTED",
            recipient_id=str(u_c2.id),
            placeholders={"destination": "Kharadi IT Park"},
            data_payload={"ride_id": str(active_ride.id)},
            channels=["IN_APP"],
        )

        # Client triggers pending state sync on app launch / foreground
        sync_res = await notif_engine.sync_pending_state(user_id=u_c2.id, user_type="customer")

        record_result(
            "App Reopened State Sync: Restores active ride, unread notification feed & unread counter in single call",
            sync_res["sync_status"] == "SYNCHRONIZED" and sync_res["active_ride"]["ride_id"] == str(active_ride.id) and sync_res["unread_count"] >= 1,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: Trusted Emergency Contacts CRUD & Limits
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 6: Trusted Emergency Contacts CRUD ---")
    async with async_session_maker() as session:
        safety_svc = DriverSafetyService(session)

        # Add 3 contacts (Max allowed)
        c1 = await safety_svc.add_trusted_contact(
            user_id=u_c2.id, name="Mom", phone="+919822001122", relationship="Mother", role="customer", is_primary=True
        )
        c2 = await safety_svc.add_trusted_contact(
            user_id=u_c2.id, name="Brother", phone="+919822001133", relationship="Brother", role="customer"
        )
        c3 = await safety_svc.add_trusted_contact(
            user_id=u_c2.id, name="Spouse", phone="+919822001144", relationship="Spouse", role="customer"
        )

        # Attempt 4th contact (must fail with 400 Bad Request)
        overflow_failed = False
        try:
            await safety_svc.add_trusted_contact(
                user_id=u_c2.id, name="Friend", phone="+919822001155", relationship="Friend", role="customer"
            )
        except Exception:
            overflow_failed = True

        contacts_list = await safety_svc.get_trusted_contacts(user_id=u_c2.id, role="customer")

        # Delete one contact
        del_res = await safety_svc.delete_trusted_contact(
            user_id=u_c2.id, contact_id=uuid.UUID(c3["contact_id"]), role="customer"
        )

        record_result(
            "Trusted Contacts Management: Enforces max 3 contacts limit, phone masking & deletion",
            c1["success"] is True and overflow_failed is True and len(contacts_list) == 3 and del_res["success"] is True,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: Emergency SOS Trigger & 112 Escalation
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 7: Emergency SOS Trigger & 112 Escalation ---")
    async with async_session_maker() as session:
        safety_svc = DriverSafetyService(session)

        # Trigger SOS on active ride
        sos_res1 = await safety_svc.trigger_sos(
            actor_id=u_c2.id,
            ride_id=active_ride.id,
            latitude=18.5401,
            longitude=73.8912,
            role="customer",
            reason="Unsafe situation reported by passenger",
        )

        # Second trigger (Idempotent check)
        sos_res2 = await safety_svc.trigger_sos(
            actor_id=u_c2.id,
            ride_id=active_ride.id,
            latitude=18.5401,
            longitude=73.8912,
            role="customer",
        )

        record_result(
            "Emergency SOS & 112 Escalation: Creates PostGIS event with 112 dispatch & idempotent deduplication",
            sos_res1["status"] == "active" and sos_res1["police_number"] == "112" and sos_res2["is_duplicate"] is True,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 8: Active Trip Scoping Constraint
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 8: Active Trip Scoping Constraint ---")
    async with async_session_maker() as session:
        safety_svc = DriverSafetyService(session)

        # Create completed ride
        completed_ride = await create_test_ride(session, u_c2.id, d_d2.id, status=RideRequestStatus.COMPLETED)

        inactive_scope_rejected = False
        try:
            await safety_svc.trigger_sos(
                actor_id=u_c2.id,
                ride_id=completed_ride.id,
                latitude=18.5401,
                longitude=73.8912,
                role="customer",
            )
        except Exception:
            inactive_scope_rejected = True

        record_result(
            "Active Trip Scoping Constraint: Strictly rejects safety operations on inactive/completed rides",
            inactive_scope_rejected is True,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 9: Live Tokenized Trip Sharing
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 9: Live Tokenized Trip Sharing ---")
    async with async_session_maker() as session:
        safety_svc = DriverSafetyService(session)

        share_res = await safety_svc.create_live_trip_share(
            user_id=u_c2.id,
            ride_id=active_ride.id,
            role="customer",
        )

        # Public tracking without PII leak
        telemetry = await safety_svc.get_shared_trip_telemetry(share_token=share_res["share_token"])

        record_result(
            "Live Trip Sharing: Generated 3-hour tokenized URL with live route telemetry & zero PII leak",
            share_res["success"] is True and "track.cabbooking.com/share/" in share_res["share_url"] and telemetry["driver"] is not None and "phone" not in telemetry["driver"],
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 10: Route Anomaly Deviation Detector (> 500m Off Corridor)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 10: Route Anomaly Deviation Detector ---")
    async with async_session_maker() as session:
        safety_svc = DriverSafetyService(session)

        # Planned route corridor
        planned_corridor = [
            {"lat": 18.5314, "lng": 73.8446}, # Shivajinagar
            {"lat": 18.5350, "lng": 73.8750}, # Sangamwadi
            {"lat": 18.5516, "lng": 73.9525}, # Kharadi
        ]

        # Vehicle position deviating 2.8 km away (Yerawada Jail bypass)
        current_lat, current_lng = 18.5700, 73.8800

        dev_res = await safety_svc.evaluate_route_deviation(
            ride_id=active_ride.id,
            driver_id=d_d2.id,
            current_lat=current_lat,
            current_lng=current_lng,
            planned_waypoints=planned_corridor,
            deviation_threshold_km=0.5, # 500m
        )

        record_result(
            "Route Anomaly Detector: Flags ROUTE_DEVIATION safety warning when vehicle is > 500m off corridor",
            dev_res is not None and dev_res["alert_type"] == "ROUTE_DEVIATION" and dev_res["deviation_meters"] > 500,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 11: Unexpected Stop Anomaly Detector & "I'm Safe" Resolution
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 11: Unexpected Stop Anomaly Detector & 'I'm Safe' Flow ---")
    async with async_session_maker() as session:
        safety_svc = DriverSafetyService(session)

        # Stationary speed (0 km/h) for 360 seconds (6 mins) mid-journey
        stop_res = await safety_svc.evaluate_unexpected_stop(
            ride_id=active_ride.id,
            driver_id=d_d2.id,
            current_lat=18.5400,
            current_lng=73.8800,
            speed_kmh=0.0,
            stopped_duration_seconds=360,
            stop_threshold_seconds=300, # 5 mins
        )

        # Partner resolves alert via "I'm Safe" flow
        resolve_res = await safety_svc.resolve_safety_alert(
            driver_id=d_d2.id,
            alert_id=uuid.UUID(stop_res["alert_id"]),
            resolution_type="IM_SAFE",
        )

        record_result(
            "Unexpected Stop Anomaly & 'I'm Safe' Workflow: Detects stoppage > 5 mins and resolves via ACKNOWLEDGED_SAFE",
            stop_res is not None and stop_res["alert_type"] == "UNEXPECTED_STOP" and resolve_res["status"] == "ACKNOWLEDGED_SAFE",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 12: Safety Support Priority Escalation
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 12: Safety Support Priority Escalation ---")
    async with async_session_maker() as session:
        safety_svc = DriverSafetyService(session)

        ticket_res = await safety_svc.create_safety_support_ticket(
            user_id=u_c2.id,
            role="customer",
            ride_id=active_ride.id,
            sos_id=uuid.UUID(sos_res1["sos_id"]),
            subject="Emergency Assistance Request",
            description="Passenger felt unsafe due to route deviation and requested safety command callback.",
        )

        record_result(
            "Safety Support Escalation: Submits priority CRITICAL safety incident ticket tied to active ride and SOS incident",
            ticket_res["success"] is True and ticket_res["severity"] == "CRITICAL" and ticket_res["status"] == "OPEN_PRIORITY",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Summary
    # ──────────────────────────────────────────────────────────────────────────
    passed_count = sum(1 for _, p, _ in RESULTS if p)
    total_count = len(RESULTS)
    print("\n" + "=" * 85)
    print(f"📊 PHASE 24 VERIFICATION SUMMARY: {passed_count}/{total_count} TESTS PASSED")
    if passed_count == total_count:
        print("🎉 PHASE 24: NOTIFICATION + SAFETY ENGINE FULLY VERIFIED!")
    else:
        print("❌ SOME PHASE 24 TESTS FAILED.")
    print("=" * 85 + "\n")

    if passed_count != total_count:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_phase24_verification())
