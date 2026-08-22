import asyncio
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, os.path.join(backend_root, "common"))
sys.path.insert(0, os.path.join(backend_root, "matching-service"))
sys.path.insert(0, backend_root)

from common.database import async_session_maker, engine
from sqlalchemy import text


async def migrate_feature23():
    print("=" * 60)
    print("🚀 MIGRATING FEATURE 23: DDL & DATABASE TABLES")
    print("=" * 60)

    ddl_statements = [
        # 1. driver_risk_signals
        """
        CREATE TABLE IF NOT EXISTS driver_risk_signals (
            id UUID PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
            ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
            signal_type VARCHAR(50) NOT NULL,
            risk_score FLOAT NOT NULL DEFAULT 0.0,
            severity VARCHAR(20) NOT NULL DEFAULT 'LOW',
            status VARCHAR(30) NOT NULL DEFAULT 'LOGGED',
            details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_driver_risk_signals_driver_id ON driver_risk_signals(driver_id)",
        "CREATE INDEX IF NOT EXISTS ix_driver_risk_signals_signal_type ON driver_risk_signals(signal_type)",
        # 2. driver_fatigue_logs
        """
        CREATE TABLE IF NOT EXISTS driver_fatigue_logs (
            id UUID PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
            continuous_online_seconds INTEGER NOT NULL DEFAULT 0,
            continuous_driving_seconds INTEGER NOT NULL DEFAULT 0,
            advisory_level VARCHAR(20) NOT NULL DEFAULT 'NONE',
            reminder_sent_at TIMESTAMPTZ,
            driver_acknowledged_at TIMESTAMPTZ
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_driver_fatigue_logs_driver_id ON driver_fatigue_logs(driver_id)",
        # 3. demand_forecast_zones
        """
        CREATE TABLE IF NOT EXISTS demand_forecast_zones (
            id UUID PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            zone_name VARCHAR(100) NOT NULL,
            zone_code VARCHAR(50) NOT NULL UNIQUE,
            center_latitude FLOAT NOT NULL,
            center_longitude FLOAT NOT NULL,
            current_demand_level VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
            forecast_15m_level VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
            forecast_30m_level VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
            forecast_60m_level VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
            surge_multiplier FLOAT NOT NULL DEFAULT 1.0,
            expected_hourly_earning FLOAT NOT NULL DEFAULT 250.0,
            active_drivers_count INTEGER NOT NULL DEFAULT 0,
            polygon_geojson JSONB NOT NULL DEFAULT '{}'::jsonb
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_demand_forecast_zones_zone_name ON demand_forecast_zones(zone_name)",
        "CREATE INDEX IF NOT EXISTS ix_demand_forecast_zones_zone_code ON demand_forecast_zones(zone_code)"
    ]

    async with engine.begin() as conn:
        for stmt in ddl_statements:
            cleaned = stmt.strip()
            if cleaned:
                await conn.execute(text(cleaned))
                print(f"✓ Executed: {cleaned[:45]}...")

    # Seed initial test demand zones if table is empty
    async with async_session_maker() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM demand_forecast_zones"))
        count = result.scalar()
        if count == 0:
            seed_sql = text("""
                INSERT INTO demand_forecast_zones (
                    id, created_at, updated_at, zone_name, zone_code,
                    center_latitude, center_longitude, current_demand_level,
                    forecast_15m_level, forecast_30m_level, forecast_60m_level,
                    surge_multiplier, expected_hourly_earning, active_drivers_count,
                    polygon_geojson
                ) VALUES 
                (
                    gen_random_uuid(), NOW(), NOW(), 'Pune Airport Zone', 'PUN_AIRPORT_ZONE',
                    18.5822, 73.9197, 'HIGH',
                    'SURGE', 'SURGE', 'HIGH',
                    1.45, 380.0, 12,
                    '{"type": "Polygon", "coordinates": [[[73.910, 18.575], [73.930, 18.575], [73.930, 18.590], [73.910, 18.590], [73.910, 18.575]]]}'::jsonb
                ),
                (
                    gen_random_uuid(), NOW(), NOW(), 'Hinjawadi IT Park Zone', 'HINJAWADI_PHASE1',
                    18.5912, 73.7389, 'SURGE',
                    'SURGE', 'HIGH', 'NORMAL',
                    1.60, 420.0, 8,
                    '{"type": "Polygon", "coordinates": [[[73.725, 18.580], [73.750, 18.580], [73.750, 18.605], [73.725, 18.605], [73.725, 18.580]]]}'::jsonb
                ),
                (
                    gen_random_uuid(), NOW(), NOW(), 'Shivajinagar Central Station', 'SHIVAJINAGAR_CENTRAL',
                    18.5308, 73.8475, 'NORMAL',
                    'HIGH', 'HIGH', 'HIGH',
                    1.20, 310.0, 18,
                    '{"type": "Polygon", "coordinates": [[[73.835, 18.520], [73.860, 18.520], [73.860, 18.545], [73.835, 18.545], [73.835, 18.520]]]}'::jsonb
                );
            """)
            await session.execute(seed_sql)
            await session.commit()
            print("✓ Seeded default demand forecast zones for Pune Metro")

    print("\n✅ FEATURE 23 DATABASE DDL MIGRATION COMPLETED SUCCESSFULLY")


if __name__ == "__main__":
    asyncio.run(migrate_feature23())
