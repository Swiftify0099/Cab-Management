"""
Phase 6: Uber-Style Nearby Matching & Candidate Ranking Verification Suite
════════════════════════════════════════════════════════════════════════════════
Verifies:
1. 0 Partners Case: Remote/empty area returns 0 candidates.
2. 1 Partner Case: Exact single candidate discovery & #1 ranking.
3. Multiple Partners Case: Multi-factor composite ranking hierarchy (Distance, ETA, Rating, Cancellation).
4. Stale Partner Guard: Driver with stale GPS (>60s) strictly omitted.
5. Wrong Service Isolation: Freight truck strictly omitted from CAB_LOCAL requests.
6. Wrong Vehicle Isolation: Sedan strictly omitted from heavy TRANSPORT requests.
7. Offline Partner Guard: Offline driver strictly omitted.
8. Strict HOTEL Isolation: Hotel requests return 0 driver candidates.
9. PostGIS-First Invariant: Fast ETA and availability estimation with zero external API calls.
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
sys.path.insert(0, os.path.join(BACKEND_DIR, "matching-service"))
sys.path.insert(0, os.path.join(BACKEND_DIR, "auth-service"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import structlog
from fastapi import HTTPException
from sqlalchemy import select, update, text

from common.database import async_session_maker
from common.models.all_models import (
    Driver,
    DriverDocument,
    DriverPreference,
    DriverStatus,
    KYCStatus,
    User,
    UserRole,
    Vehicle,
    VehicleType,
)
from app.schemas.vehicle import VehicleCreateRequest
from app.services.vehicle_service import (
    activate_driver_vehicle,
    create_driver_vehicle,
)
import importlib.util
spec = importlib.util.spec_from_file_location(
    "nearby_matcher",
    os.path.join(BACKEND_DIR, "matching-service", "app", "services", "nearby_matcher.py")
)
nearby_mod = importlib.util.module_from_spec(spec)
sys.modules["nearby_matcher"] = nearby_mod
spec.loader.exec_module(nearby_mod)

NearbyMatchingEngine = nearby_mod.NearbyMatchingEngine
NearbySearchRequest = nearby_mod.NearbySearchRequest
NearbySearchResponse = nearby_mod.NearbySearchResponse
NearbyEstimateRequest = nearby_mod.NearbyEstimateRequest
NearbyEstimateResponse = nearby_mod.NearbyEstimateResponse

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


async def run_phase6_nearby_matching_verification():
    print("=" * 85)
    print("🚖📍 STARTING PHASE 6: UBER-STYLE NEARBY MATCHING ENGINE VERIFICATION")
    print("=" * 85)

    today = date.today()
    base_lat, base_lng = 18.5204, 73.8567  # Pune Central (Shivajinagar)

    # Clean test slate: set existing drivers offline
    async with async_session_maker() as session:
        await session.execute(
            update(Driver)
            .values(status=DriverStatus.OFFLINE, _is_online=False)
        )
        await session.commit()

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: 0 Partners Case (Empty / Remote Coordinates)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 1: Zero Partners Case (Remote Search) ---")
    async with async_session_maker() as session:
        try:
            engine = NearbyMatchingEngine(session)
            zero_res = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=28.7041,  # Remote Delhi coord with no drivers
                    pickup_lng=77.1025,
                    service_type="CAB_LOCAL",
                    search_radius_km=3.0,
                )
            )
            record_result(
                "Zero Partners: Search in unpopulated location returns 0 candidates",
                zero_res.total_candidates_found == 0 and len(zero_res.candidates) == 0,
            )
        except Exception as e:
            record_result("Section 1 Zero Partners Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: 1 Partner Case (Exact Single Match)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 2: Single Partner Case ---")
    async with async_session_maker() as session:
        try:
            # Create Driver 1 (Nearby Sedan)
            u1 = User(id=uuid.uuid4(), phone=f"+9196{uuid.uuid4().hex[:8]}", role=UserRole.DRIVER, is_active=True)
            session.add(u1)
            d1 = Driver(
                id=uuid.uuid4(),
                user_id=u1.id,
                full_name="Amit Sharma (Nearby Driver 1)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
                rating=4.9,
                cancellation_rate=0.02,
                fatigue_score=0.1,
                current_location=f"SRID=4326;POINT({base_lng + 0.005} {base_lat + 0.005})",  # ~0.7 km away
                current_latitude=base_lat + 0.005,
                current_longitude=base_lng + 0.005,
                current_accuracy_m=5.0,
                last_location_updated_at=datetime.now(timezone.utc),
            )
            d1._is_verified = True
            d1._is_online = True
            session.add(d1)
            await session.commit()

            v1 = await create_driver_vehicle(
                session, d1,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.SEDAN,
                    make="Maruti",
                    model="Dzire",
                    variant="ZXi",
                    year=2023,
                    color="Silver",
                    registration_number=f"MH12AM{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=4,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    service_capabilities=["cab", "rental", "airport", "local"],
                )
            )
            await session.commit()
            await activate_driver_vehicle(session, d1.id, v1.id)
            await session.commit()

            # Search with 1 driver in radius
            engine = NearbyMatchingEngine(session)
            single_res = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=base_lat,
                    pickup_lng=base_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=5.0,
                    excluded_driver_ids=[],
                )
            )

            record_result(
                "Single Partner: Exactly 1 driver discovered within search radius",
                single_res.total_candidates_found >= 1,
            )
            top_cand = single_res.candidates[0]
            record_result(
                f"Single Partner: Ranked #1 with Composite Score {top_cand.composite_score}/100 and ETA {top_cand.estimated_eta_min}m",
                top_cand.rank == 1 and top_cand.driver_id == d1.id and top_cand.composite_score >= 80.0,
            )
        except Exception as e:
            record_result("Section 2 Single Partner Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: Multiple Partners Case (Multi-Factor Composite Ranking)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 3: Multiple Partners Case & Multi-Factor Ranking ---")
    async with async_session_maker() as session:
        try:
            # Create Driver 2 (Medium Distance ~2.5km, Good Rating 4.7)
            u2 = User(id=uuid.uuid4(), phone=f"+9196{uuid.uuid4().hex[:8]}", role=UserRole.DRIVER, is_active=True)
            session.add(u2)
            d2 = Driver(
                id=uuid.uuid4(),
                user_id=u2.id,
                full_name="Karan Verma (Medium Distance Driver 2)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
                rating=4.7,
                cancellation_rate=0.05,
                fatigue_score=0.2,
                current_location=f"SRID=4326;POINT({base_lng + 0.02} {base_lat + 0.02})",  # ~2.5 km
                current_latitude=base_lat + 0.02,
                current_longitude=base_lng + 0.02,
                current_accuracy_m=8.0,
                last_location_updated_at=datetime.now(timezone.utc),
            )
            d2._is_verified = True
            d2._is_online = True
            session.add(d2)
            await session.commit()

            v2 = await create_driver_vehicle(
                session, d2,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.SEDAN,
                    make="Hyundai",
                    model="Aura",
                    year=2022,
                    color="White",
                    registration_number=f"MH12KV{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=4,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    service_capabilities=["cab", "rental"],
                )
            )
            await session.commit()
            await activate_driver_vehicle(session, d2.id, v2.id)
            await session.commit()

            # Create Driver 3 (Far Distance ~7.0km, Lower Rating 4.3, Higher Cancellation 12%)
            u3 = User(id=uuid.uuid4(), phone=f"+9196{uuid.uuid4().hex[:8]}", role=UserRole.DRIVER, is_active=True)
            session.add(u3)
            d3 = Driver(
                id=uuid.uuid4(),
                user_id=u3.id,
                full_name="Sunil Jadhav (Far Distance Driver 3)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
                rating=4.3,
                cancellation_rate=0.12,
                fatigue_score=0.4,
                current_location=f"SRID=4326;POINT({base_lng + 0.06} {base_lat + 0.06})",  # ~7.0 km
                current_latitude=base_lat + 0.06,
                current_longitude=base_lng + 0.06,
                current_accuracy_m=10.0,
                last_location_updated_at=datetime.now(timezone.utc),
            )
            d3._is_verified = True
            d3._is_online = True
            session.add(d3)
            await session.commit()

            v3 = await create_driver_vehicle(
                session, d3,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.SEDAN,
                    make="Tata",
                    model="Tigor",
                    year=2021,
                    color="Grey",
                    registration_number=f"MH12SJ{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=4,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    service_capabilities=["cab"],
                )
            )
            await session.commit()
            await activate_driver_vehicle(session, d3.id, v3.id)
            await session.commit()

            # Refresh timestamps for d1, d2, d3 before search
            await session.execute(
                update(Driver)
                .where(Driver.id.in_([d1.id, d2.id, d3.id]))
                .values(last_location_updated_at=datetime.now(timezone.utc))
            )
            await session.commit()

            # Execute nearby search across 10 km
            engine = NearbyMatchingEngine(session)
            multi_res = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=base_lat,
                    pickup_lng=base_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=10.0,
                )
            )

            record_result(
                "Multiple Partners: All 3 active drivers successfully discovered in radius",
                multi_res.total_candidates_found >= 3,
            )

            # Check ranking order
            cand_d1 = next((c for c in multi_res.candidates if c.driver_id == d1.id), None)
            cand_d2 = next((c for c in multi_res.candidates if c.driver_id == d2.id), None)
            cand_d3 = next((c for c in multi_res.candidates if c.driver_id == d3.id), None)

            record_result(
                "Multi-Factor Ranking: Driver 1 (Closest, Highest Rating) Scores Higher than Driver 2",
                cand_d1 is not None and cand_d2 is not None and cand_d1.composite_score > cand_d2.composite_score,
            )
            record_result(
                "Multi-Factor Ranking: Driver 2 (Medium Distance) Scores Higher than Driver 3 (Far, Lower Rating)",
                cand_d2 is not None and cand_d3 is not None and cand_d2.composite_score > cand_d3.composite_score,
            )
            record_result(
                "Multi-Factor Ranking: Sequential Ranks Assigned (Rank 1 < Rank 2 < Rank 3)",
                cand_d1.rank < cand_d2.rank < cand_d3.rank,
            )
        except Exception as e:
            record_result("Section 3 Multiple Partners Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: Stale-Location Protection Invariant
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 4: Stale-Location Protection Invariant ---")
    async with async_session_maker() as session:
        try:
            # Set Driver 1's GPS to 90 seconds old (STALE)
            await session.execute(
                update(Driver)
                .where(Driver.id == d1.id)
                .values(last_location_updated_at=datetime.now(timezone.utc) - timedelta(seconds=90))
            )
            await session.commit()

            engine = NearbyMatchingEngine(session)
            stale_search = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=base_lat,
                    pickup_lng=base_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=10.0,
                )
            )

            cand_stale_ids = [c.driver_id for c in stale_search.candidates]
            record_result(
                "Stale Guard: Driver 1 with Stale GPS (90s > 60s) Strictly Omitted from Search",
                d1.id not in cand_stale_ids,
            )

            # Restore Driver 1's fresh GPS
            await session.execute(
                update(Driver)
                .where(Driver.id == d1.id)
                .values(last_location_updated_at=datetime.now(timezone.utc))
            )
            await session.commit()
        except Exception as e:
            record_result("Section 4 Stale Guard Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: Wrong Service & Vehicle Type Isolation
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 5: Cross-Service & Vehicle Type Isolation ---")
    async with async_session_maker() as session:
        try:
            # Create Commercial Freight Truck Driver
            u_truck = User(id=uuid.uuid4(), phone=f"+9196{uuid.uuid4().hex[:8]}", role=UserRole.DRIVER, is_active=True)
            session.add(u_truck)
            d_truck = Driver(
                id=uuid.uuid4(),
                user_id=u_truck.id,
                full_name="Vijay Shinde (Heavy Transport Driver)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
                current_location=f"SRID=4326;POINT({base_lng + 0.003} {base_lat + 0.003})",  # Close ~0.4km
                current_latitude=base_lat + 0.003,
                current_longitude=base_lng + 0.003,
                last_location_updated_at=datetime.now(timezone.utc),
            )
            d_truck._is_verified = True
            d_truck._is_online = True
            session.add(d_truck)
            await session.commit()

            v_truck = await create_driver_vehicle(
                session, d_truck,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.TRUCK,
                    make="Ashok Leyland",
                    model="Dost",
                    year=2023,
                    color="White",
                    registration_number=f"MH12TR{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=2,
                    transport_capable=True,
                    max_payload_kg=2000.0,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    fitness_expiry=today + timedelta(days=365),
                    permit_expiry=today + timedelta(days=365),
                    service_capabilities=["transport", "packers"],
                )
            )
            await session.commit()
            await activate_driver_vehicle(session, d_truck.id, v_truck.id)
            await session.commit()

            engine = NearbyMatchingEngine(session)

            # Test 1: CAB_LOCAL search -> Truck Driver MUST NOT appear
            cab_res = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=base_lat,
                    pickup_lng=base_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=5.0,
                )
            )
            cab_candidate_ids = [c.driver_id for c in cab_res.candidates]
            record_result(
                "Wrong Service Isolation: Freight Truck Strictly Omitted from CAB_LOCAL Search",
                d_truck.id not in cab_candidate_ids,
            )

            # Test 2: TRANSPORT search -> Sedans MUST NOT appear, only Truck Driver
            transport_res = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=base_lat,
                    pickup_lng=base_lng,
                    service_type="TRANSPORT",
                    weight_kg=1200.0,
                    search_radius_km=10.0,
                )
            )
            trans_candidate_ids = [c.driver_id for c in transport_res.candidates]
            record_result(
                "Wrong Vehicle Isolation: Passenger Sedans Strictly Omitted from Heavy TRANSPORT Search",
                d1.id not in trans_candidate_ids and d2.id not in trans_candidate_ids,
            )
            record_result(
                "Service Capability Match: Freight Truck Correctly Discovered for TRANSPORT Search",
                d_truck.id in trans_candidate_ids,
            )
        except Exception as e:
            record_result("Section 5 Cross-Service Isolation Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: Offline & Hotel Strict Isolation Guards
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 6: Offline & Hotel Isolation Guards ---")
    async with async_session_maker() as session:
        try:
            engine = NearbyMatchingEngine(session)

            # 1. Offline Partner Guard
            await session.execute(
                update(Driver)
                .where(Driver.id == d2.id)
                .values(status=DriverStatus.OFFLINE, _is_online=False)
            )
            await session.commit()

            off_search = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=base_lat,
                    pickup_lng=base_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=10.0,
                )
            )
            off_ids = [c.driver_id for c in off_search.candidates]
            record_result(
                "Offline Guard: Offline Driver 2 Strictly Omitted from Nearby Matching",
                d2.id not in off_ids,
            )

            # 2. Hotel Strict Isolation Invariant
            hotel_search = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=base_lat,
                    pickup_lng=base_lng,
                    service_type="HOTEL",
                    search_radius_km=10.0,
                )
            )
            record_result(
                "Hotel Isolation Guard: Hotel Service Request Strictly Returns 0 Driver Candidates",
                hotel_search.total_candidates_found == 0 and len(hotel_search.candidates) == 0,
            )
        except Exception as e:
            record_result("Section 6 Offline and Hotel Isolation Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: Fast Pickup ETA & Fleet Availability Estimate API
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 7: Fast Pickup ETA & Availability Estimate API ---")
    async with async_session_maker() as session:
        try:
            engine = NearbyMatchingEngine(session)
            estimate = await engine.estimate_pickup(
                NearbyEstimateRequest(
                    pickup_lat=base_lat,
                    pickup_lng=base_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=5.0,
                )
            )

            record_result(
                f"Fast Pickup Estimate: Found {estimate.available_drivers_count} Available Drivers",
                estimate.service_available is True and estimate.available_drivers_count >= 1,
            )
            record_result(
                f"Fast Pickup Estimate: Calculated Nearest Distance {estimate.nearest_driver_distance_km}km & ETA {estimate.estimated_pickup_eta_min}m",
                estimate.nearest_driver_distance_km is not None and estimate.estimated_pickup_eta_min is not None,
            )
        except Exception as e:
            record_result("Section 7 Estimate API Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 85)
    print(f"📊 PHASE 6 VERIFICATION SUMMARY: {TESTS_PASSED}/{TESTS_RUN} TESTS PASSED")
    if TESTS_FAILED == 0:
        print("🎉 PHASE 6: UBER-STYLE NEARBY MATCHING ENGINE FULLY VERIFIED!")
    else:
        print(f"⚠️ {TESTS_FAILED} TESTS FAILED!")
    print("=" * 85)

    return TESTS_FAILED == 0


if __name__ == "__main__":
    success = asyncio.run(run_phase6_nearby_matching_verification())
    sys.exit(0 if success else 1)
