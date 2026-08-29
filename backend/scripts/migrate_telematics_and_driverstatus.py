"""
Database Migration for Phase 5: Partner Availability & Telematics Engine.
1. Adds BUSY, PAUSED to driverstatus enum in PostgreSQL.
2. Adds telematics and freshness columns to drivers table.
3. Creates driver_telematics_history table for immutable GPS log trail.
"""
import asyncio
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

import asyncio
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from common.database import engine
from sqlalchemy import text

async def run_telematics_migration():
    print("Starting Phase 5 Telematics & Availability Database Migration...")
    
    # 1. Update driverstatus enum
    new_statuses = ["BUSY", "PAUSED", "busy", "paused"]
    for st in new_statuses:
        try:
            async with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                await conn.execute(text(f"ALTER TYPE driverstatus ADD VALUE IF NOT EXISTS '{st}';"))
                print(f"Added enum value '{st}' to driverstatus")
        except Exception as e:
            print(f"Enum note for '{st}': {e}")

    # 2. Add columns and table in transaction
    async with engine.begin() as conn:
        driver_cols = [
            ("current_latitude", "FLOAT"),
            ("current_longitude", "FLOAT"),
            ("current_accuracy_m", "FLOAT DEFAULT 10.0"),
            ("current_heading", "FLOAT DEFAULT 0.0"),
            ("current_speed_kmh", "FLOAT DEFAULT 0.0"),
            ("last_location_updated_at", "TIMESTAMPTZ"),
            ("last_online_at", "TIMESTAMPTZ"),
            ("last_offline_at", "TIMESTAMPTZ"),
            ("offline_reason", "VARCHAR(100)"),
            ("telematics_battery_pct", "INTEGER DEFAULT 100"),
            ("telematics_is_charging", "BOOLEAN DEFAULT FALSE"),
            ("telematics_app_state", "VARCHAR(30) DEFAULT 'foreground'"),
        ]

        for col_name, col_type in driver_cols:
            try:
                await conn.execute(text(f"ALTER TABLE drivers ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                print(f"Added column '{col_name}' to drivers")
            except Exception as e:
                print(f"Column '{col_name}' note: {e}")

        try:
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_drivers_status_freshness ON drivers(status, last_location_updated_at);"
            ))
            print("Created index idx_drivers_status_freshness on drivers")
        except Exception as e:
            print(f"Index note: {e}")

        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS driver_telematics_history (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
                    location GEOGRAPHY(POINT, 4326),
                    latitude FLOAT NOT NULL,
                    longitude FLOAT NOT NULL,
                    accuracy_m FLOAT DEFAULT 10.0,
                    heading FLOAT DEFAULT 0.0,
                    speed_kmh FLOAT DEFAULT 0.0,
                    battery_pct INTEGER,
                    is_charging BOOLEAN DEFAULT FALSE,
                    app_state VARCHAR(30) DEFAULT 'foreground',
                    network_status VARCHAR(30) DEFAULT 'online',
                    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """))
            print("Created table driver_telematics_history")

            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_telematics_driver_recorded ON driver_telematics_history(driver_id, recorded_at DESC);
            """))
            print("Created index on driver_telematics_history")
        except Exception as e:
            print(f"History table note: {e}")

    print("Phase 5 Telematics & Availability Migration Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(run_telematics_migration())
