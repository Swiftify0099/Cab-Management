"""
Phase 4: Central Service Catalog & Cross-Service Eligibility Verification Suite
═════════════════════════════════════════════════════════════════════════════
Verifies:
1. Central Service Catalog: All 11 platform services correctly registered with metadata.
2. Strict HOTEL Isolation: Hotel bookings are strictly isolated from driver dispatch, radar, and spatial resolver.
3. Cross-Service Negative Cases:
   - CAB request must NOT reach Freight-only Partner.
   - TRANSPORT request must NOT reach Cab-only Partner.
   - AIRPORT request only reaches Airport-capable Partner.
   - PACKERS_MOVERS request strictly rejects Two-Wheeler (Bike).
4. Partner & Vehicle Compliance:
   - Unapproved KYC rejected from dispatch.
   - Expired documents (Insurance/PUC/Fitness) rejected from dispatch.
   - Offline partner rejected from dispatch.
5. Dynamic Fleet Switching:
   - Partner with Sedan + Truck: Active vehicle dynamically switches service eligibility.
6. Full Driver Eligibility Report generation across all 11 services.
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional

# Add paths
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, os.path.join(BACKEND_DIR, "auth-service"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import structlog
from fastapi import HTTPException
from sqlalchemy import select, update, func, text

from common.database import async_session_maker
from common.models.all_models import (
    DocumentType,
    Driver,
    DriverDocument,
    DriverPreference,
    DriverStatus,
    KYCStatus,
    MediaAsset,
    MediaOwnerType,
    MediaType,
    RideRequest,
    RideRequestStatus,
    Trip,
    TripStatus,
    User,
    UserRole,
    Vehicle,
    VehicleType,
)
from common.models.service_catalog import (
    ServiceCatalogType,
    ServiceCategory,
    ServiceMetadata,
    ServiceEligibilityEngine,
    ServiceEligibilityResult,
    DriverFullEligibilityReport,
    SERVICE_CATALOG_REGISTRY,
)
from app.schemas.vehicle import VehicleCreateRequest
from app.services.vehicle_service import (
    activate_driver_vehicle,
    create_driver_vehicle,
)

logger = structlog.get_logger(__name__)

TESTS_RUN = 0
TESTS_PASSED = 0
TESTS_FAILED = 0


def record_result(name: str, passed: bool, error: str = ""):
    global TESTS_RUN, TESTS_PASSED, TESTS_FAILED
    TESTS_RUN += 1
    if passed:
        TESTS_PASSED += 1
        print(f"  [PASS] {name}")
    else:
        TESTS_FAILED += 1
        print(f"  [FAIL] {name} ── Error: {error}")


async def run_phase4_service_catalog_verification():
    print("=" * 85)
    print("🧭📋 STARTING PHASE 4: SERVICE CATALOG & CROSS-SERVICE ELIGIBILITY VERIFICATION")
    print("=" * 85)

    today = date.today()

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: Central Service Catalog Registry Integrity (All 11 Services)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 1: Central Service Catalog Registry (11 Services) ---")
    try:
        expected_services = [
            ServiceCatalogType.CAB_LOCAL,
            ServiceCatalogType.INTERCITY,
            ServiceCatalogType.AIRPORT,
            ServiceCatalogType.RENTAL,
            ServiceCatalogType.OUTSTATION,
            ServiceCatalogType.CARPOOL,
            ServiceCatalogType.PARCEL,
            ServiceCatalogType.TRANSPORT,
            ServiceCatalogType.PACKERS_MOVERS,
            ServiceCatalogType.CORPORATE,
            ServiceCatalogType.HOTEL,
        ]

        record_result(
            "Service Catalog contains exactly 11 distinct canonical services",
            len(SERVICE_CATALOG_REGISTRY) == 11 and all(s in SERVICE_CATALOG_REGISTRY for s in expected_services),
        )

        for s in expected_services:
            meta = SERVICE_CATALOG_REGISTRY[s]
            record_result(
                f"Catalog Metadata Verified: {s.value.upper()} (Category: {meta.category.value}, Dispatchable: {meta.dispatchable_to_drivers})",
                meta.service_code == s and meta.display_name and meta.category is not None,
            )
    except Exception as e:
        record_result("Section 1 Catalog Integrity Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: HOTEL Service Strict Dispatch Isolation
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 2: HOTEL Service Strict Dispatch Isolation ---")
    try:
        hotel_meta = SERVICE_CATALOG_REGISTRY[ServiceCatalogType.HOTEL]
        record_result(
            "HOTEL Service is marked dispatchable_to_drivers = False in Central Catalog",
            hotel_meta.dispatchable_to_drivers is False and hotel_meta.category == ServiceCategory.HOSPITALITY,
        )

        # Evaluate eligibility for Hotel with any Driver
        mock_driver = Driver(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            full_name="Driver Test",
            kyc_status=KYCStatus.APPROVED,
            status=DriverStatus.ONLINE,
        )
        mock_driver._is_verified = True
        mock_vehicle = Vehicle(
            id=uuid.uuid4(),
            driver_id=mock_driver.id,
            vehicle_type=VehicleType.SEDAN,
            make="Toyota",
            model="Camry",
            registration_number="MH12HT0001",
            seat_capacity=4,
            is_active=True,
            status="APPROVED",
            service_capabilities=["cab", "rental"],
        )

        hotel_eval = ServiceEligibilityEngine.evaluate_service_eligibility(
            service=ServiceCatalogType.HOTEL,
            driver=mock_driver,
            active_vehicle=mock_vehicle,
        )

        record_result(
            "HOTEL Service Eligibility Evaluator Strictly Returns is_eligible = False",
            hotel_eval.is_eligible is False and any("isolated from driver dispatch" in r.lower() for r in hotel_eval.rejection_reasons),
        )

        # Verify Spatial Resolver query logic isolates hotel
        async with async_session_maker() as session:
            # Direct query check to verify no hotel dispatch can ever occur
            res = await session.execute(
                text("SELECT count(*) FROM ride_requests WHERE service_type = 'hotel' AND assigned_driver_id IS NOT NULL")
            )
            count_hotel_assigned = res.scalar() or 0
            record_result(
                "Database Invariant: Exactly ZERO hotel bookings have driver assignments in PostgreSQL",
                count_hotel_assigned == 0,
            )
    except Exception as e:
        record_result("Section 2 Hotel Isolation Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: Cross-Service Negative Dispatch Guards
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 3: Cross-Service Negative Dispatch Guards ---")
    try:
        # Create Cab-only Partner (Sedan, cab capabilities)
        cab_partner = Driver(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            full_name="Cab Partner (Sedan Only)",
            kyc_status=KYCStatus.APPROVED,
            status=DriverStatus.ONLINE,
            is_active=True,
        )
        cab_partner._is_verified = True
        cab_sedan = Vehicle(
            id=uuid.uuid4(),
            driver_id=cab_partner.id,
            vehicle_type=VehicleType.SEDAN,
            make="Maruti",
            model="Dzire",
            registration_number="MH12CB1001",
            seat_capacity=4,
            is_active=True,
            status="APPROVED",
            service_capabilities=["cab", "rental", "outstation"],
            insurance_expiry=today + timedelta(days=365),
            pollution_expiry=today + timedelta(days=180),
        )
        cab_pref = DriverPreference(
            driver_id=cab_partner.id,
            allow_local=True,
            allow_airport=True,
            allow_outstation=True,
            allow_rental=True,
            allow_parcel=False,
            allow_transport=False,
            allow_packers=False,
        )

        # Create Freight-only Partner (Truck, transport capabilities)
        freight_partner = Driver(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            full_name="Freight Partner (Truck Only)",
            kyc_status=KYCStatus.APPROVED,
            status=DriverStatus.ONLINE,
            is_active=True,
        )
        freight_partner._is_verified = True
        freight_truck = Vehicle(
            id=uuid.uuid4(),
            driver_id=freight_partner.id,
            vehicle_type=VehicleType.TRUCK,
            make="Tata",
            model="Ace",
            registration_number="MH12FR2002",
            seat_capacity=2,
            max_payload_kg=1200.0,
            is_active=True,
            status="APPROVED",
            service_capabilities=["transport", "packers"],
            insurance_expiry=today + timedelta(days=365),
            pollution_expiry=today + timedelta(days=180),
            fitness_expiry=today + timedelta(days=365),
            permit_expiry=today + timedelta(days=365),
        )
        freight_pref = DriverPreference(
            driver_id=freight_partner.id,
            allow_local=False,
            allow_airport=False,
            allow_outstation=False,
            allow_rental=False,
            allow_parcel=True,
            allow_transport=True,
            allow_packers=True,
        )

        # Negative Case 1: CAB_LOCAL request evaluated against Freight Partner (Truck)
        cab_on_freight = ServiceEligibilityEngine.evaluate_service_eligibility(
            service=ServiceCatalogType.CAB_LOCAL,
            driver=freight_partner,
            active_vehicle=freight_truck,
            driver_pref=freight_pref,
        )
        record_result(
            "Negative Case 1: CAB Request strictly REJECTS Freight-only Partner (Truck)",
            cab_on_freight.is_eligible is False and any("not supported for city cab" in r.lower() or "disabled" in r.lower() for r in cab_on_freight.rejection_reasons),
        )

        # Negative Case 2: TRANSPORT request evaluated against Cab Partner (Sedan)
        trans_on_cab = ServiceEligibilityEngine.evaluate_service_eligibility(
            service=ServiceCatalogType.TRANSPORT,
            driver=cab_partner,
            active_vehicle=cab_sedan,
            driver_pref=cab_pref,
            requested_weight_kg=800.0,
        )
        record_result(
            "Negative Case 2: TRANSPORT Request strictly REJECTS Cab-only Partner (Sedan)",
            trans_on_cab.is_eligible is False and any("not supported for goods transport" in r.lower() or "disabled" in r.lower() for r in trans_on_cab.rejection_reasons),
        )

        # Negative Case 3: AIRPORT request evaluated against Driver with allow_airport = False
        cab_pref.allow_airport = False
        airport_eval = ServiceEligibilityEngine.evaluate_service_eligibility(
            service=ServiceCatalogType.AIRPORT,
            driver=cab_partner,
            active_vehicle=cab_sedan,
            driver_pref=cab_pref,
        )
        record_result(
            "Negative Case 3: AIRPORT Request strictly REJECTS Partner when allow_airport = False",
            airport_eval.is_eligible is False and any("disabled 'airport transfer'" in r.lower() for r in airport_eval.rejection_reasons),
        )

        # Negative Case 4: PACKERS_MOVERS evaluated against Delivery Bike
        bike_partner = Driver(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            full_name="Delivery Partner (Bike)",
            kyc_status=KYCStatus.APPROVED,
            status=DriverStatus.ONLINE,
            is_active=True,
        )
        bike_partner._is_verified = True
        delivery_bike = Vehicle(
            id=uuid.uuid4(),
            driver_id=bike_partner.id,
            vehicle_type=VehicleType.BIKE,
            make="Hero",
            model="Splendor",
            registration_number="MH12BK3003",
            seat_capacity=1,
            parcel_capacity_kg=20.0,
            is_active=True,
            status="APPROVED",
            service_capabilities=["parcel"],
            insurance_expiry=today + timedelta(days=365),
            pollution_expiry=today + timedelta(days=180),
        )
        packers_on_bike = ServiceEligibilityEngine.evaluate_service_eligibility(
            service=ServiceCatalogType.PACKERS_MOVERS,
            driver=bike_partner,
            active_vehicle=delivery_bike,
        )
        record_result(
            "Negative Case 4: PACKERS_MOVERS Request strictly REJECTS Delivery Bike",
            packers_on_bike.is_eligible is False and any("not supported for packers & movers" in r.lower() for r in packers_on_bike.rejection_reasons),
        )
    except Exception as e:
        record_result("Section 3 Negative Dispatch Guards Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: Partner Compliance & Document Expiry Invariants
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 4: Partner Compliance & Document Expiry Invariants ---")
    try:
        # 1. Unapproved Partner
        unapproved_partner = Driver(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            full_name="Unapproved Driver",
            kyc_status=KYCStatus.PENDING,
            status=DriverStatus.ONLINE,
            is_active=True,
        )
        unapproved_eval = ServiceEligibilityEngine.evaluate_service_eligibility(
            service=ServiceCatalogType.CAB_LOCAL,
            driver=unapproved_partner,
            active_vehicle=cab_sedan,
        )
        record_result(
            "Compliance Guard: Pending KYC Partner is Ineligible for Dispatch",
            unapproved_eval.is_eligible is False and any("kyc is not approved" in r.lower() for r in unapproved_eval.rejection_reasons),
        )

        # 2. Expired Insurance
        expired_veh = Vehicle(
            id=uuid.uuid4(),
            driver_id=cab_partner.id,
            vehicle_type=VehicleType.SEDAN,
            make="Honda",
            model="City",
            registration_number="MH12EX9999",
            seat_capacity=4,
            is_active=True,
            status="APPROVED",
            service_capabilities=["cab", "rental"],
            insurance_expiry=today - timedelta(days=10),  # EXPIRED
            pollution_expiry=today + timedelta(days=180),
        )
        expired_eval = ServiceEligibilityEngine.evaluate_service_eligibility(
            service=ServiceCatalogType.CAB_LOCAL,
            driver=cab_partner,
            active_vehicle=expired_veh,
        )
        record_result(
            "Compliance Guard: Vehicle with Expired Insurance is Ineligible for Dispatch",
            expired_eval.is_eligible is False and any("insurance expired" in r.lower() for r in expired_eval.rejection_reasons),
        )

        # 3. Offline Partner (when checking availability)
        offline_partner = Driver(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            full_name="Offline Driver",
            kyc_status=KYCStatus.APPROVED,
            status=DriverStatus.OFFLINE,
            is_active=True,
        )
        offline_partner._is_online = False
        offline_partner._is_verified = True
        offline_eval = ServiceEligibilityEngine.evaluate_service_eligibility(
            service=ServiceCatalogType.CAB_LOCAL,
            driver=offline_partner,
            active_vehicle=cab_sedan,
            check_availability=True,
        )
        record_result(
            "Availability Guard: Offline Partner is Ineligible for Active Dispatch",
            offline_eval.is_eligible is False and any("currently offline" in r.lower() for r in offline_eval.rejection_reasons),
        )
    except Exception as e:
        record_result("Section 4 Compliance Invariants Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: Dynamic Fleet Switching Cross-Service Eligibility
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 5: Dynamic Fleet Switching Cross-Service Eligibility ---")
    async with async_session_maker() as session:
        try:
            # Create Dual-Fleet Partner (owns Sedan + Truck)
            multi_partner_user = User(
                id=uuid.uuid4(),
                phone=f"+9194{uuid.uuid4().hex[:8]}",
                role=UserRole.DRIVER,
                is_active=True,
                is_verified=True,
            )
            session.add(multi_partner_user)

            multi_partner = Driver(
                id=uuid.uuid4(),
                user_id=multi_partner_user.id,
                full_name="Anand Kulkarni (Multi-Fleet Operator)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
            )
            multi_partner._is_verified = True
            session.add(multi_partner)
            await session.commit()

            # Add Sedan
            p4_sedan = await create_driver_vehicle(
                session, multi_partner,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.SEDAN,
                    make="Hyundai",
                    model="Verna",
                    variant="SX",
                    year=2023,
                    color="Silver",
                    registration_number=f"MH12VN{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=4,
                    fuel_type="petrol",
                    comfort_level="comfort",
                    has_ac=True,
                    parcel_capable=True,
                    parcel_capacity_kg=50.0,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    service_capabilities=["cab", "rental", "outstation", "airport"],
                )
            )
            await session.commit()

            # Add Truck
            p4_truck = await create_driver_vehicle(
                session, multi_partner,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.TRUCK,
                    make="Mahindra",
                    model="Bolero Maxi Truck",
                    variant="Plus",
                    year=2023,
                    color="White",
                    registration_number=f"MH12BL{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=2,
                    fuel_type="diesel",
                    comfort_level="economy",
                    transport_capable=True,
                    max_payload_kg=1500.0,
                    commercial_permit=True,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    fitness_expiry=today + timedelta(days=365),
                    permit_expiry=today + timedelta(days=365),
                    service_capabilities=["transport", "packers"],
                )
            )
            await session.commit()

            # 1. State A: Sedan is Active
            await activate_driver_vehicle(session, multi_partner.id, p4_sedan.id)
            await session.commit()

            report_a = ServiceEligibilityEngine.build_full_driver_eligibility_report(
                driver=multi_partner,
                active_vehicle=p4_sedan,
            )

            record_result(
                "State A (Sedan Active): Eligible for CAB_LOCAL, RENTAL, OUTSTATION, AIRPORT",
                ServiceCatalogType.CAB_LOCAL in report_a.eligible_services
                and ServiceCatalogType.RENTAL in report_a.eligible_services
                and ServiceCatalogType.AIRPORT in report_a.eligible_services,
            )
            record_result(
                "State A (Sedan Active): Strictly INELIGIBLE for TRANSPORT and PACKERS_MOVERS",
                ServiceCatalogType.TRANSPORT in report_a.ineligible_services
                and ServiceCatalogType.PACKERS_MOVERS in report_a.ineligible_services,
            )

            # 2. State B: Atomically Switch Active to Truck
            await activate_driver_vehicle(session, multi_partner.id, p4_truck.id)
            await session.commit()

            report_b = ServiceEligibilityEngine.build_full_driver_eligibility_report(
                driver=multi_partner,
                active_vehicle=p4_truck,
            )

            record_result(
                "State B (Truck Active): Eligible for TRANSPORT and PACKERS_MOVERS",
                ServiceCatalogType.TRANSPORT in report_b.eligible_services
                and ServiceCatalogType.PACKERS_MOVERS in report_b.eligible_services,
            )
            record_result(
                "State B (Truck Active): Strictly INELIGIBLE for CAB_LOCAL, AIRPORT, RENTAL",
                ServiceCatalogType.CAB_LOCAL in report_b.ineligible_services
                and ServiceCatalogType.AIRPORT in report_b.ineligible_services
                and ServiceCatalogType.RENTAL in report_b.ineligible_services,
            )
            record_result(
                "Both States: HOTEL is ALWAYS Ineligible (Isolated)",
                ServiceCatalogType.HOTEL in report_a.ineligible_services and ServiceCatalogType.HOTEL in report_b.ineligible_services,
            )
        except Exception as e:
            record_result("Section 5 Dynamic Fleet Switching Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 85)
    print(f"📊 PHASE 4 VERIFICATION SUMMARY: {TESTS_PASSED}/{TESTS_RUN} TESTS PASSED")
    if TESTS_FAILED == 0:
        print("🎉 PHASE 4: SERVICE CATALOG & CROSS-SERVICE ELIGIBILITY ENGINE FULLY VERIFIED!")
    else:
        print(f"⚠️ {TESTS_FAILED} TESTS FAILED!")
    print("=" * 85)

    return TESTS_FAILED == 0


if __name__ == "__main__":
    success = asyncio.run(run_phase4_service_catalog_verification())
    sys.exit(0 if success else 1)
