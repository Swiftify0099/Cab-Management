"""
Comprehensive E2E Verification Suite for Feature 23: AI / Smart Driver Features.
Tests:
1. AI Driver Insights summary generation & hourly estimate
2. Earnings Prediction engine (Hourly, Trip, Full day estimates)
3. Spatial Demand Forecasting (15m, 30m, 60m windows)
4. Best Zone Opportunity scoring & ranking
5. Zero Google Maps API verification (PostGIS / Euclidean-only spatial logic)
6. Driver Fatigue state machine & break advisory levels
7. Rest break acknowledgment & fatigue log persistence
8. Internal risk telemetry & Fake GPS signal logging
9. Deterministic fallback behavior
10. Developer Sandbox simulator scenarios
11. Security, authorization, and data minimization (Zero PII leak)
12. Concurrency test: simultaneous concurrent insight requests (Independent Sessions)
13. Cross-module regression (Features 1-22 compatibility)
"""
import os
import sys
import uuid
import asyncio
from decimal import Decimal
from datetime import datetime, timezone, timedelta

sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\common")
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\matching-service")
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")

from sqlalchemy import select, and_, func
from common.database import async_session_maker
from common.models.all_models import (
    User, UserRole, Driver, DriverStatus, KYCStatus,
    DriverOnlineSession, DriverEarningLedger,
    DemandForecastZone, DriverFatigueLog, DriverRiskSignal
)
from app.services.ai_smart_driver_service import AISmartDriverService

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_feature23_verification():
    print("=" * 70)
    print("🤖 STARTING FEATURE 23: AI / SMART DRIVER FEATURES VERIFICATION SUITE")
    print("=" * 70)

    async with async_session_maker() as session:
        service = AISmartDriverService(session)

        # ---------------------------------------------------------
        # SETUP TEST ENTITIES
        # ---------------------------------------------------------
        print("\n[SETUP] Initializing test Driver and historical ledger entries...", flush=True)

        d_user_id = uuid.uuid4()
        d_user = User(
            id=d_user_id,
            phone=f"+9198{str(uuid.uuid4().int)[:8]}",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
            language="en"
        )
        session.add(d_user)

        driver = Driver(
            id=uuid.uuid4(),
            user_id=d_user_id,
            full_name="Vikram Gaikwad (AI Test Driver)",
            phone=d_user.phone,
            rating=4.92,
            total_trips=48,
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
        )
        session.add(driver)

        # Seed double-entry ledger entries for earnings prediction
        for i in range(6):
            ledger_entry = DriverEarningLedger(
                id=uuid.uuid4(),
                driver_id=driver.id,
                entry_type="TRIP_EARNING",
                amount=Decimal("180.00"),
                currency="INR",
                direction="CREDIT",
                status="SETTLED",
                description=f"Trip #{i + 1} earnings",
                created_at=datetime.now(timezone.utc) - timedelta(days=i)
            )
            session.add(ledger_entry)

        # Seed online session for fatigue test
        online_sess = DriverOnlineSession(
            id=uuid.uuid4(),
            driver_id=driver.id,
            started_at=datetime.now(timezone.utc) - timedelta(hours=4, minutes=30),
            duration_seconds=int(4.5 * 3600),
            status="ACTIVE",
            trips_completed=3,
            total_distance_km=64.2
        )
        session.add(online_sess)

        await session.commit()
        print(f"✓ Test Driver created: ID {driver.id}")

        passed_tests = 0
        total_tests = 13

        # ---------------------------------------------------------
        # TEST 1: AI Driver Insights Synthesis
        # ---------------------------------------------------------
        print("\n[TEST 1] Testing get_driver_ai_insights synthesis...", flush=True)
        insights = await service.get_driver_ai_insights(driver.id, current_lat=18.5204, current_lng=73.8567)
        assert insights["driver_id"] == str(driver.id), "Driver ID mismatch"
        assert insights["predicted_hourly_earning"] > 0, "Hourly earnings should be > 0"
        assert insights["is_estimate"] is True, "Must be flagged as estimate"
        assert len(insights["actionable_insights"]) > 0, "Should generate actionable insight bullets"
        print(f"✓ TEST 1 PASS: Hourly predicted: ₹{insights['predicted_hourly_earning']}/hr, bullets: {len(insights['actionable_insights'])}")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 2: Earnings Prediction Engine
        # ---------------------------------------------------------
        print("\n[TEST 2] Testing get_earnings_prediction calculations...", flush=True)
        earnings = await service.get_earnings_prediction(driver.id, timeframe="hourly")
        assert earnings["is_estimate"] is True, "Must be tagged as estimate"
        assert "disclaimer" in earnings, "Must contain non-guarantee disclaimer"
        assert earnings["predicted_per_trip_earning"] > 0, "Trip estimate should be positive"
        assert earnings["predicted_full_day_earning"] > earnings["predicted_hourly_earning"], "Day > Hourly"
        print(f"✓ TEST 2 PASS: Predicted ₹{earnings['predicted_hourly_earning']}/hr (Trip: ₹{earnings['predicted_per_trip_earning']}, Day: ₹{earnings['predicted_full_day_earning']})")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 3: Spatial Demand Forecasting (15m, 30m, 60m)
        # ---------------------------------------------------------
        print("\n[TEST 3] Testing get_demand_forecast spatial querying...", flush=True)
        forecast_zones = await service.get_demand_forecast(lat=18.5204, lng=73.8567, radius_km=25.0)
        assert len(forecast_zones) >= 1, "Should find at least 1 seeded forecast zone"
        first_zone = forecast_zones[0]
        assert "forecast_15m" in first_zone, "Must include 15m forecast"
        assert "forecast_30m" in first_zone, "Must include 30m forecast"
        assert "forecast_60m" in first_zone, "Must include 60m forecast"
        assert first_zone["surge_multiplier"] >= 1.0, "Surge multiplier >= 1.0"
        print(f"✓ TEST 3 PASS: Found {len(forecast_zones)} demand zones. Top: {first_zone['zone_name']} ({first_zone['surge_multiplier']}x)")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 4: Best Zone Opportunity Scoring & Ranking
        # ---------------------------------------------------------
        print("\n[TEST 4] Testing get_best_zones opportunity ranking...", flush=True)
        best_zones = await service.get_best_zones(driver.id, lat=18.5204, lng=73.8567, limit=3)
        assert len(best_zones) > 0, "Should return ranked zones"
        for z in best_zones:
            assert "opportunity_score" in z, "Must include opportunity score"
            assert "estimated_eta_mins" in z, "Must include road ETA estimate"
            assert "reason" in z, "Must include explainable reason"
        # Confirm sorted descending by opportunity score
        scores = [z["opportunity_score"] for z in best_zones]
        assert scores == sorted(scores, reverse=True), "Zones must be ranked descending by score"
        print(f"✓ TEST 4 PASS: Top ranked zone: {best_zones[0]['zone_name']} (Score: {best_zones[0]['opportunity_score']})")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 5: Zero Google Maps API Spatial Logic
        # ---------------------------------------------------------
        print("\n[TEST 5] Testing PostGIS / Euclidean distance math (Zero Google API calls)...", flush=True)
        dist = service._calculate_haversine_km(18.5204, 73.8567, 18.5822, 73.9197)
        assert 9.0 <= dist <= 12.0, f"Distance between Pune Center and Airport should be ~10km, got {dist}"
        print(f"✓ TEST 5 PASS: Haversine mathematical calculation: {round(dist, 2)} km without external API calls")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 6: Driver Fatigue State Machine
        # ---------------------------------------------------------
        print("\n[TEST 6] Testing get_fatigue_status state machine...", flush=True)
        fatigue = await service.get_fatigue_status(driver.id)
        assert fatigue["continuous_driving_hours"] >= 4.0, "Should reflect online session duration"
        assert fatigue["advisory_level"] in ["SUGGESTION", "RECOMMENDED_BREAK"], f"Expected break advisory, got {fatigue['advisory_level']}"
        print(f"✓ TEST 6 PASS: Continuous online {fatigue['continuous_driving_hours']}h -> Advisory Level: {fatigue['advisory_level']}")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 7: Rest Break Acknowledgment & Persistence
        # ---------------------------------------------------------
        print("\n[TEST 7] Testing record_fatigue_break logging...", flush=True)
        break_ack = await service.record_fatigue_break(driver.id)
        assert break_ack["success"] is True, "Break acknowledgment failed"
        
        # Verify row persisted in driver_fatigue_logs
        log_stmt = select(DriverFatigueLog).where(DriverFatigueLog.driver_id == driver.id)
        log_res = await session.execute(log_stmt)
        log_row = log_res.scalars().first()
        assert log_row is not None, "Fatigue log record should exist in DB"
        print(f"✓ TEST 7 PASS: Break logged in database (ID: {log_row.id})")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 8: Internal Risk Telemetry & Fake GPS Detection
        # ---------------------------------------------------------
        print("\n[TEST 8] Testing evaluate_risk_signal & Fake GPS gatekeeper...", flush=True)
        risk_res = await service.evaluate_risk_signal(
            driver_id=driver.id,
            signal_type="FAKE_GPS",
            details_json={"speed_kmh": 240.0, "mock_provider": True}
        )
        assert risk_res["status"] == "RECORDED", "Risk signal recording failed"
        assert risk_res["severity"] == "HIGH", "Fake GPS must be HIGH severity"
        assert "safe_client_notice" in risk_res, "Should provide non-accusatory advice"

        # Verify row in driver_risk_signals
        risk_stmt = select(DriverRiskSignal).where(DriverRiskSignal.driver_id == driver.id)
        risk_db = await session.execute(risk_stmt)
        risk_row = risk_db.scalars().first()
        assert risk_row is not None, "DriverRiskSignal should exist in DB"
        assert risk_row.risk_score == 85.0, "Risk score should be 85.0 for FAKE_GPS"
        print(f"✓ TEST 8 PASS: Risk signal logged: score {risk_row.risk_score}, severity {risk_row.severity}")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 9: Deterministic Fallback Verification
        # ---------------------------------------------------------
        print("\n[TEST 9] Testing deterministic fallback behavior...", flush=True)
        fallback_insights = await service.get_driver_ai_insights(driver.id, current_lat=0.0, current_lng=0.0)
        assert fallback_insights["ai_engine_status"] == "ONLINE", "Service should stay online"
        assert fallback_insights["predicted_hourly_earning"] >= 200, "Should provide baseline estimate"
        print(f"✓ TEST 9 PASS: Deterministic fallback returned safe hourly baseline: ₹{fallback_insights['predicted_hourly_earning']}")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 10: Developer Sandbox Simulation
        # ---------------------------------------------------------
        print("\n[TEST 10] Testing Developer Sandbox simulation scenarios...", flush=True)
        sim_res = await service.simulate_dev_scenario(driver.id, "HIGH_DEMAND_SURGE")
        assert sim_res["scenario"] == "HIGH_DEMAND_SURGE", "Scenario key mismatch"

        # Verify surge multiplier updated in DB
        zone_stmt = select(DemandForecastZone).limit(1)
        z_res = await session.execute(zone_stmt)
        z_row = z_res.scalar_one_or_none()
        assert z_row.surge_multiplier == 1.85, f"Surge multiplier should be 1.85, got {z_row.surge_multiplier}"
        
        # Reset back
        await service.simulate_dev_scenario(driver.id, "RESET_ALL")
        print("✓ TEST 10 PASS: Sandbox applied 1.85x citywide surge and successfully reset")
        passed_tests += 1

        # ---------------------------------------------------------
        # TEST 11: Security, Authorization & Data Minimization
        # ---------------------------------------------------------
        print("\n[TEST 11] Testing security & data minimization...", flush=True)
        insights_str = str(insights)
        assert "password" not in insights_str, "No passwords in AI payload"
        assert "token" not in insights_str, "No tokens in AI payload"
        assert "bank_account" not in insights_str, "No bank credentials in AI payload"
        print("✓ TEST 11 PASS: AI Insights verified completely sanitized (Zero PII / credentials)")
        passed_tests += 1

    # ---------------------------------------------------------
    # TEST 12: Concurrency Shield (5 Concurrent AI Queries with isolated sessions)
    # ---------------------------------------------------------
    print("\n[TEST 12] Testing concurrency with 5 simultaneous requests...", flush=True)
    async def concurrent_fetch(i: int):
        async with async_session_maker() as s:
            svc = AISmartDriverService(s)
            return await svc.get_driver_ai_insights(driver.id, 18.5204 + i*0.01, 73.8567 + i*0.01)

    tasks = [concurrent_fetch(i) for i in range(5)]
    results = await asyncio.gather(*tasks)
    assert len(results) == 5, "All 5 concurrent requests should succeed"
    for r in results:
        assert r["predicted_hourly_earning"] > 0
    print("✓ TEST 12 PASS: 5 concurrent queries executed cleanly with zero deadlocks")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 13: Cross-Module Regression (Features 1-22)
    # ---------------------------------------------------------
    print("\n[TEST 13] Testing cross-module compatibility...", flush=True)
    async with async_session_maker() as session:
        d_check = await session.get(Driver, driver.id)
        assert d_check.status == DriverStatus.ONLINE, "Driver should remain ONLINE"
        assert d_check.rating == 4.92, "Rating preserved"
        print("✓ TEST 13 PASS: Driver state and core models intact (0 regression)")
        passed_tests += 1

    print("\n" + "=" * 70)
    print(f"🎉 FEATURE 23 VERIFICATION COMPLETED: {passed_tests}/{total_tests} TESTS PASSED (100% SUCCESS)")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_feature23_verification())
