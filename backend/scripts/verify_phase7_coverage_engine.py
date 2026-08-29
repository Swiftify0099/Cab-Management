"""
Phase 7: Coverage Engine (ALL_CITY, SPECIFIC_CITY, SPECIFIC_HEX, ZONE) Verification Suite
═════════════════════════════════════════════════════════════════════════════════════════
Verifies:
1. Spatial Hierarchy Resolution: Coordinates -> ServiceCity (Polygon/Radius) + ServiceZone + ServiceHex (H3).
2. Customer Transparency: Customer sends pickup coords without choosing dispatch mode.
3. ALL_CITY Mode: Partner receives requests across all operational platform cities.
4. SPECIFIC_CITY Mode:
   - Positive: Partner configured for City A receives requests in City A.
   - Negative (Wrong City): Partner configured for City B strictly omitted from City A requests.
5. SPECIFIC_HEX Mode:
   - Positive: Partner configured for Hex cell A receives requests in Hex A.
   - Negative (Wrong Hex): Partner configured for Hex cell B strictly omitted from Hex A requests.
6. Overlapping Multi-Mode Coverage: ALL_CITY, SPECIFIC_CITY, and SPECIFIC_HEX partners coexist in radar pool.
7. Boundary Coordinates: Pickup near perimeter correctly resolved and filtered.
8. Stale Partner in Matching Coverage: Stale GPS (>60s) partner strictly omitted despite matching coverage.
"""
from __future__ import annotations

import asyncio
import importlib.util
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
from sqlalchemy import select, update, text

from common.database import async_session_maker
from common.models.all_models import (
    Driver,
    DriverCityCoverage,
    DriverDocument,
    DriverHexCoverage,
    DriverPreference,
    DriverStatus,
    KYCStatus,
    ServiceCity,
    ServiceHex,
    ServiceZone,
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

# Dynamically import nearby_matcher from matching-service
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


async def run_phase7_coverage_engine_verification():
    print("=" * 85)
    print("🗺️🌐 STARTING PHASE 7: COVERAGE ENGINE (ALL_CITY, SPECIFIC_CITY, SPECIFIC_HEX, ZONE) VERIFICATION")
    print("=" * 85)

    today = date.today()
    now_utc = datetime.now(timezone.utc)
    pune_lat, pune_lng = 18.5204, 73.8567
    sangli_lat, sangli_lng = 16.8524, 74.5815

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: Spatial Hierarchy Setup & Resolution Test
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 1: Spatial Hierarchy Resolution (City, Zone, H3 Hex) ---")
    async with async_session_maker() as session:
        try:
            # 1. Ensure Pune City exists
            pune_city_res = await session.execute(select(ServiceCity).where(ServiceCity.name == "Pune"))
            pune_city = pune_city_res.scalar_one_or_none()
            if not pune_city:
                pune_city = ServiceCity(
                    id=uuid.uuid4(),
                    name="Pune",
                    state="Maharashtra",
                    country="India",
                    center_lat=pune_lat,
                    center_lng=pune_lng,
                    center_location=f"SRID=4326;POINT({pune_lng} {pune_lat})",
                    radius_km=25.0,
                    is_active=True,
                )
                session.add(pune_city)
                await session.commit()

            # 2. Ensure Sangli City exists
            sangli_city_res = await session.execute(select(ServiceCity).where(ServiceCity.name == "Sangli"))
            sangli_city = sangli_city_res.scalar_one_or_none()
            if not sangli_city:
                sangli_city = ServiceCity(
                    id=uuid.uuid4(),
                    name="Sangli",
                    state="Maharashtra",
                    country="India",
                    center_lat=sangli_lat,
                    center_lng=sangli_lng,
                    center_location=f"SRID=4326;POINT({sangli_lng} {sangli_lat})",
                    radius_km=20.0,
                    is_active=True,
                )
                session.add(sangli_city)
                await session.commit()

            # 3. Ensure Pune Central Zone exists
            pune_zone_res = await session.execute(
                select(ServiceZone).where(ServiceZone.name == "Pune Central Zone")
            )
            pune_zone = pune_zone_res.scalar_one_or_none()
            if not pune_zone:
                pune_zone = ServiceZone(
                    id=uuid.uuid4(),
                    city_id=pune_city.id,
                    name="Pune Central Zone",
                    center_lat=pune_lat,
                    center_lng=pune_lng,
                    center_location=f"SRID=4326;POINT({pune_lng} {pune_lat})",
                    is_active=True,
                )
                session.add(pune_zone)
                await session.commit()

            # 4. Ensure H3 Hex for Pune exists
            import h3
            pune_h3 = h3.latlng_to_cell(pune_lat, pune_lng, 7)
            hex_res = await session.execute(
                select(ServiceHex).where(ServiceHex.h3_index == pune_h3)
            )
            pune_hex = hex_res.scalar_one_or_none()
            if not pune_hex:
                pune_hex = ServiceHex(
                    id=uuid.uuid4(),
                    city_id=pune_city.id,
                    zone_id=pune_zone.id,
                    h3_index=pune_h3,
                    resolution=7,
                    display_name="Pune Shivajinagar Hex",
                    center_lat=pune_lat,
                    center_lng=pune_lng,
                    is_active=True,
                )
                session.add(pune_hex)
                await session.commit()

            # Test spatial hierarchy resolution
            engine = NearbyMatchingEngine(session)
            spatial_res = await engine.resolve_spatial_hierarchy(pune_lat, pune_lng)

            record_result(
                "Spatial Resolution: Pune coordinates resolve to ServiceCity 'Pune'",
                spatial_res.city_id == pune_city.id and spatial_res.city_name == "Pune",
            )
            record_result(
                f"Spatial Resolution: Pune coordinates resolve to H3 Hex Index '{pune_h3}'",
                spatial_res.h3_index == pune_h3 and spatial_res.hex_id == pune_hex.id,
            )
        except Exception as e:
            record_result("Section 1 Spatial Resolution Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: ALL_CITY Coverage Mode
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 2: ALL_CITY Coverage Mode ---")
    async with async_session_maker() as session:
        try:
            # Create Driver 1 with ALL_CITY mode
            u_all = User(id=uuid.uuid4(), phone=f"+9196{uuid.uuid4().hex[:8]}", role=UserRole.DRIVER, is_active=True)
            session.add(u_all)
            d_all = Driver(
                id=uuid.uuid4(),
                user_id=u_all.id,
                full_name="Rajesh Patil (ALL_CITY Driver)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
                rating=4.9,
                current_location=f"SRID=4326;POINT({pune_lng + 0.005} {pune_lat + 0.005})",
                current_latitude=pune_lat + 0.005,
                current_longitude=pune_lng + 0.005,
                last_location_updated_at=datetime.now(timezone.utc),
            )
            d_all._is_verified = True
            d_all._is_online = True
            session.add(d_all)

            pref_all = DriverPreference(
                driver_id=d_all.id,
                visibility_mode="all_city",
                allow_local=True,
            )
            session.add(pref_all)
            await session.commit()

            v_all = await create_driver_vehicle(
                session, d_all,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.SEDAN,
                    make="Maruti",
                    model="Dzire",
                    year=2023,
                    color="White",
                    registration_number=f"MH12AL{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=4,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    service_capabilities=["cab", "rental", "airport", "local"],
                )
            )
            await session.commit()
            await activate_driver_vehicle(session, d_all.id, v_all.id)
            await session.commit()

            # Execute nearby search in Pune
            engine = NearbyMatchingEngine(session)
            search_res = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=pune_lat,
                    pickup_lng=pune_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=5.0,
                )
            )

            cand_ids = [c.driver_id for c in search_res.candidates]
            record_result(
                "ALL_CITY Mode: Driver with visibility_mode='all_city' discovered in Pune",
                d_all.id in cand_ids,
            )
            cand_obj = next((c for c in search_res.candidates if c.driver_id == d_all.id), None)
            record_result(
                "ALL_CITY Mode: Candidate coverage_mode correctly tagged as 'all_city'",
                cand_obj is not None and cand_obj.coverage_mode == "all_city",
            )
        except Exception as e:
            record_result("Section 2 ALL_CITY Mode Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: SPECIFIC_CITY Mode (Positive Match & Negative Wrong City)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 3: SPECIFIC_CITY Mode (Positive & Negative Wrong City) ---")
    async with async_session_maker() as session:
        try:
            # Driver B: SPECIFIC_CITY (Selected City = Pune)
            u_pune = User(id=uuid.uuid4(), phone=f"+9196{uuid.uuid4().hex[:8]}", role=UserRole.DRIVER, is_active=True)
            session.add(u_pune)
            d_pune = Driver(
                id=uuid.uuid4(),
                user_id=u_pune.id,
                full_name="Sanjay Kadam (Pune City Driver)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
                rating=4.8,
                current_location=f"SRID=4326;POINT({pune_lng + 0.008} {pune_lat + 0.008})",
                current_latitude=pune_lat + 0.008,
                current_longitude=pune_lng + 0.008,
                last_location_updated_at=datetime.now(timezone.utc),
            )
            d_pune._is_verified = True
            d_pune._is_online = True
            session.add(d_pune)

            pref_pune = DriverPreference(
                driver_id=d_pune.id,
                visibility_mode="specific_city",
                allow_local=True,
            )
            session.add(pref_pune)

            cov_pune = DriverCityCoverage(
                driver_id=d_pune.id,
                city_id=pune_city.id,
                is_selected=True,
                is_active=True,
            )
            session.add(cov_pune)
            await session.commit()

            v_pune = await create_driver_vehicle(
                session, d_pune,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.SEDAN,
                    make="Hyundai",
                    model="Aura",
                    year=2023,
                    color="White",
                    registration_number=f"MH12PC{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=4,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    service_capabilities=["cab", "rental", "local"],
                )
            )
            await session.commit()
            await activate_driver_vehicle(session, d_pune.id, v_pune.id)
            await session.commit()

            # Driver C: SPECIFIC_CITY (Selected City = Sangli, stationed physically close to Pune for test)
            u_sangli = User(id=uuid.uuid4(), phone=f"+9196{uuid.uuid4().hex[:8]}", role=UserRole.DRIVER, is_active=True)
            session.add(u_sangli)
            d_sangli = Driver(
                id=uuid.uuid4(),
                user_id=u_sangli.id,
                full_name="Ramesh Sanglikar (Sangli-Only Driver)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
                rating=4.7,
                current_location=f"SRID=4326;POINT({pune_lng + 0.006} {pune_lat + 0.006})",
                current_latitude=pune_lat + 0.006,
                current_longitude=pune_lng + 0.006,
                last_location_updated_at=datetime.now(timezone.utc),
            )
            d_sangli._is_verified = True
            d_sangli._is_online = True
            session.add(d_sangli)

            pref_sangli = DriverPreference(
                driver_id=d_sangli.id,
                visibility_mode="specific_city",
                allow_local=True,
            )
            session.add(pref_sangli)

            cov_sangli = DriverCityCoverage(
                driver_id=d_sangli.id,
                city_id=sangli_city.id,  # Selected Sangli only!
                is_selected=True,
                is_active=True,
            )
            session.add(cov_sangli)
            await session.commit()

            v_sangli = await create_driver_vehicle(
                session, d_sangli,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.SEDAN,
                    make="Tata",
                    model="Tigor",
                    year=2022,
                    color="Silver",
                    registration_number=f"MH10SG{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=4,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    service_capabilities=["cab", "rental", "local"],
                )
            )
            await session.commit()
            await activate_driver_vehicle(session, d_sangli.id, v_sangli.id)
            await session.commit()

            # Execute nearby search in Pune
            engine = NearbyMatchingEngine(session)
            city_search = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=pune_lat,
                    pickup_lng=pune_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=5.0,
                )
            )

            cand_ids = [c.driver_id for c in city_search.candidates]

            record_result(
                "SPECIFIC_CITY Positive: Driver B (Selected Pune) is MATCHED for Pune pickup",
                d_pune.id in cand_ids,
            )
            record_result(
                "SPECIFIC_CITY Negative (Wrong City): Driver C (Selected Sangli) is STRICTLY OMITTED from Pune pickup",
                d_sangli.id not in cand_ids,
            )
        except Exception as e:
            record_result("Section 3 SPECIFIC_CITY Mode Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: SPECIFIC_HEX Mode (Positive Match & Negative Wrong Hex)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 4: SPECIFIC_HEX Mode (Positive & Negative Wrong Hex) ---")
    async with async_session_maker() as session:
        try:
            # Create a separate remote Hex (e.g. Kothrud Hex or Sangli Hex)
            import h3
            remote_h3 = h3.latlng_to_cell(sangli_lat, sangli_lng, 7)
            remote_hex_res = await session.execute(
                select(ServiceHex).where(ServiceHex.h3_index == remote_h3)
            )
            remote_hex = remote_hex_res.scalar_one_or_none()
            if not remote_hex:
                remote_hex = ServiceHex(
                    id=uuid.uuid4(),
                    city_id=sangli_city.id,
                    h3_index=remote_h3,
                    resolution=7,
                    display_name="Sangli Remote Hex",
                    center_lat=sangli_lat,
                    center_lng=sangli_lng,
                    is_active=True,
                )
                session.add(remote_hex)
                await session.commit()

            # Driver D: SPECIFIC_HEX (Selected Pune Hex)
            u_hex_pune = User(id=uuid.uuid4(), phone=f"+9196{uuid.uuid4().hex[:8]}", role=UserRole.DRIVER, is_active=True)
            session.add(u_hex_pune)
            d_hex_pune = Driver(
                id=uuid.uuid4(),
                user_id=u_hex_pune.id,
                full_name="Nitin Deshmukh (Pune Hex Driver)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
                rating=4.9,
                current_location=f"SRID=4326;POINT({pune_lng + 0.004} {pune_lat + 0.004})",
                current_latitude=pune_lat + 0.004,
                current_longitude=pune_lng + 0.004,
                last_location_updated_at=datetime.now(timezone.utc),
            )
            d_hex_pune._is_verified = True
            d_hex_pune._is_online = True
            session.add(d_hex_pune)

            pref_hex_pune = DriverPreference(
                driver_id=d_hex_pune.id,
                visibility_mode="specific_hex",
                allow_local=True,
            )
            session.add(pref_hex_pune)

            cov_hex_pune = DriverHexCoverage(
                driver_id=d_hex_pune.id,
                hex_id=pune_hex.id,
                is_active=True,
            )
            session.add(cov_hex_pune)
            await session.commit()

            v_hex_pune = await create_driver_vehicle(
                session, d_hex_pune,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.SEDAN,
                    make="Maruti",
                    model="Ciaz",
                    year=2023,
                    color="Blue",
                    registration_number=f"MH12HX{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=4,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    service_capabilities=["cab", "rental", "local"],
                )
            )
            await session.commit()
            await activate_driver_vehicle(session, d_hex_pune.id, v_hex_pune.id)
            await session.commit()

            # Driver E: SPECIFIC_HEX (Selected Remote Hex, stationed in Pune)
            u_hex_remote = User(id=uuid.uuid4(), phone=f"+9196{uuid.uuid4().hex[:8]}", role=UserRole.DRIVER, is_active=True)
            session.add(u_hex_remote)
            d_hex_remote = Driver(
                id=uuid.uuid4(),
                user_id=u_hex_remote.id,
                full_name="Anand Joshi (Remote Hex Driver)",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_active=True,
                rating=4.8,
                current_location=f"SRID=4326;POINT({pune_lng + 0.003} {pune_lat + 0.003})",
                current_latitude=pune_lat + 0.003,
                current_longitude=pune_lng + 0.003,
                last_location_updated_at=datetime.now(timezone.utc),
            )
            d_hex_remote._is_verified = True
            d_hex_remote._is_online = True
            session.add(d_hex_remote)

            pref_hex_remote = DriverPreference(
                driver_id=d_hex_remote.id,
                visibility_mode="specific_hex",
                allow_local=True,
            )
            session.add(pref_hex_remote)

            cov_hex_remote = DriverHexCoverage(
                driver_id=d_hex_remote.id,
                hex_id=remote_hex.id,  # Selected remote hex only
                is_active=True,
            )
            session.add(cov_hex_remote)
            await session.commit()

            v_hex_remote = await create_driver_vehicle(
                session, d_hex_remote,
                VehicleCreateRequest(
                    vehicle_type=VehicleType.SEDAN,
                    make="Honda",
                    model="Amaze",
                    year=2021,
                    color="Grey",
                    registration_number=f"MH12RH{uuid.uuid4().hex[:4].upper()}",
                    seat_capacity=4,
                    insurance_expiry=today + timedelta(days=365),
                    pollution_expiry=today + timedelta(days=180),
                    service_capabilities=["cab", "rental", "local"],
                )
            )
            await session.commit()
            await activate_driver_vehicle(session, d_hex_remote.id, v_hex_remote.id)
            await session.commit()

            # Execute nearby search at Pune Hex coordinates
            engine = NearbyMatchingEngine(session)
            hex_search = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=pune_lat,
                    pickup_lng=pune_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=5.0,
                )
            )

            cand_ids = [c.driver_id for c in hex_search.candidates]

            record_result(
                "SPECIFIC_HEX Positive: Driver D (Selected Pune Hex) is MATCHED for Pune Hex pickup",
                d_hex_pune.id in cand_ids,
            )
            record_result(
                "SPECIFIC_HEX Negative (Wrong Hex): Driver E (Selected Remote Hex) is STRICTLY OMITTED from Pune Hex pickup",
                d_hex_remote.id not in cand_ids,
            )
        except Exception as e:
            record_result("Section 4 SPECIFIC_HEX Mode Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: Overlapping Multi-Mode Coverage
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 5: Overlapping Multi-Mode Coverage Coexistence ---")
    async with async_session_maker() as session:
        try:
            # Refresh timestamps for all 3 drivers
            await session.execute(
                update(Driver)
                .where(Driver.id.in_([d_all.id, d_pune.id, d_hex_pune.id]))
                .values(last_location_updated_at=datetime.now(timezone.utc))
            )
            await session.commit()

            engine = NearbyMatchingEngine(session)
            overlap_search = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=pune_lat,
                    pickup_lng=pune_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=5.0,
                )
            )

            discovered_ids = [c.driver_id for c in overlap_search.candidates]
            record_result(
                "Overlapping Coverage: ALL_CITY, SPECIFIC_CITY (Pune), and SPECIFIC_HEX (Pune Hex) Drivers Coexist in Radar",
                d_all.id in discovered_ids and d_pune.id in discovered_ids and d_hex_pune.id in discovered_ids,
            )
            record_result(
                "Overlapping Coverage: Discovered candidates ranked properly by composite multi-factor score",
                len(overlap_search.candidates) >= 3 and all(overlap_search.candidates[i].composite_score >= overlap_search.candidates[i+1].composite_score for i in range(len(overlap_search.candidates)-1)),
            )
        except Exception as e:
            record_result("Section 5 Overlapping Coverage Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: Boundary Coordinates & Outside City Handling
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 6: Boundary Coordinates & Unconfigured City ---")
    async with async_session_maker() as session:
        try:
            engine = NearbyMatchingEngine(session)

            # 1. Edge of Pune City (~22km from center, within 25km radius)
            boundary_lat = pune_lat + 0.18
            boundary_lng = pune_lng + 0.10
            bound_spatial = await engine.resolve_spatial_hierarchy(boundary_lat, boundary_lng)
            record_result(
                f"Boundary Coordinates: Point at (18.70, 73.95) correctly resolves to Pune City (Boundary radius: 25km)",
                bound_spatial.city_name == "Pune",
            )

            # 2. Remote location far from any city
            remote_lat, remote_lng = 28.6139, 77.2090  # Delhi (no ServiceCity configured in test DB)
            remote_spatial = await engine.resolve_spatial_hierarchy(remote_lat, remote_lng)
            record_result(
                "Unconfigured Location: Coordinates outside all service cities return city_id=None",
                remote_spatial.city_id is None and remote_spatial.city_name is None,
            )
        except Exception as e:
            record_result("Section 6 Boundary Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: Stale Partner in Matching Coverage
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 7: Stale Partner in Matching Coverage ---")
    async with async_session_maker() as session:
        try:
            # Set Driver B (Pune City Driver) GPS timestamp to 100 seconds old
            await session.execute(
                update(Driver)
                .where(Driver.id == d_pune.id)
                .values(last_location_updated_at=now_utc - timedelta(seconds=100))
            )
            await session.commit()

            engine = NearbyMatchingEngine(session)
            stale_search = await engine.find_and_rank_nearby_drivers(
                NearbySearchRequest(
                    pickup_lat=pune_lat,
                    pickup_lng=pune_lng,
                    service_type="CAB_LOCAL",
                    search_radius_km=5.0,
                )
            )

            stale_ids = [c.driver_id for c in stale_search.candidates]
            record_result(
                "Stale Guard: Driver B with Stale Location (>60s) Strictly Omitted Despite Valid City Coverage",
                d_pune.id not in stale_ids,
            )

            # Restore Driver B GPS timestamp
            await session.execute(
                update(Driver)
                .where(Driver.id == d_pune.id)
                .values(last_location_updated_at=datetime.now(timezone.utc))
            )
            await session.commit()
        except Exception as e:
            record_result("Section 7 Stale Guard Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 85)
    print(f"📊 PHASE 7 VERIFICATION SUMMARY: {TESTS_PASSED}/{TESTS_RUN} TESTS PASSED")
    if TESTS_FAILED == 0:
        print("🎉 PHASE 7: COVERAGE ENGINE FULLY VERIFIED!")
    else:
        print(f"⚠️ {TESTS_FAILED} TESTS FAILED!")
    print("=" * 85)

    return TESTS_FAILED == 0


if __name__ == "__main__":
    success = asyncio.run(run_phase7_coverage_engine_verification())
    sys.exit(0 if success else 1)
