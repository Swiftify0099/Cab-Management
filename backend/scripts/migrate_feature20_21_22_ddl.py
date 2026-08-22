"""
Database DDL migration for Feature 20 (Destination Mode), Feature 21 (Back-to-Back Rides), and Feature 22 (Driver Safety).
Executes ALTER TABLE and CREATE TABLE statements with PostgreSQL/PostGIS support.
"""
import os
import sys
import asyncio
from sqlalchemy import text

# Ensure backend root in path
backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from common.database import async_session_maker

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

STATEMENTS = [
    # 1. Feature 20: Driver Preferences columns
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS destination_mode_state VARCHAR(30) NOT NULL DEFAULT 'OFF';",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS destination_mode_pref VARCHAR(20) NOT NULL DEFAULT 'balanced';",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS destination_activated_at TIMESTAMPTZ;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS destination_expires_at TIMESTAMPTZ;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS destination_rides_completed INTEGER NOT NULL DEFAULT 0;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS destination_max_rides INTEGER NOT NULL DEFAULT 2;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS destination_radius_km FLOAT NOT NULL DEFAULT 1.5;",

    # 2. Feature 21: Ride Request back-to-back columns
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS is_back_to_back BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS next_ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS next_ride_reserved_at TIMESTAMPTZ;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS next_ride_expires_at TIMESTAMPTZ;",
    "CREATE INDEX IF NOT EXISTS ix_ride_requests_next_ride_id ON ride_requests(next_ride_id);",

    # 3. Feature 22: Driver Trusted Contacts Table
    """
    CREATE TABLE IF NOT EXISTS driver_trusted_contacts (
        id UUID PRIMARY KEY,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone_masked VARCHAR(50) NOT NULL,
        phone_hash VARCHAR(128) NOT NULL,
        relationship VARCHAR(50) NOT NULL DEFAULT 'Family',
        is_verified BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_driver_trusted_contacts_driver_id ON driver_trusted_contacts(driver_id);",

    # 4. Feature 22: Live Trip Share Sessions Table
    """
    CREATE TABLE IF NOT EXISTS live_trip_share_sessions (
        id UUID PRIMARY KEY,
        ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        share_token VARCHAR(64) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_live_trip_share_sessions_ride_id ON live_trip_share_sessions(ride_id);",
    "CREATE INDEX IF NOT EXISTS ix_live_trip_share_sessions_driver_id ON live_trip_share_sessions(driver_id);",
    "CREATE INDEX IF NOT EXISTS ix_live_trip_share_sessions_share_token ON live_trip_share_sessions(share_token);",

    # 5. Feature 22: Driver Safety Alerts Table
    """
    CREATE TABLE IF NOT EXISTS driver_safety_alerts (
        id UUID PRIMARY KEY,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'WARNING',
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        resolved_at TIMESTAMPTZ,
        resolution_type VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_driver_safety_alerts_driver_id ON driver_safety_alerts(driver_id);",
    "CREATE INDEX IF NOT EXISTS ix_driver_safety_alerts_ride_id ON driver_safety_alerts(ride_id);",
    "CREATE INDEX IF NOT EXISTS ix_driver_safety_alerts_alert_type ON driver_safety_alerts(alert_type);",
    "CREATE INDEX IF NOT EXISTS ix_driver_safety_alerts_status ON driver_safety_alerts(status);",

    # 6. Feature 22: Safety Incident Reports Table
    """
    CREATE TABLE IF NOT EXISTS safety_incident_reports (
        id UUID PRIMARY KEY,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
        incident_category VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        status VARCHAR(30) NOT NULL DEFAULT 'REPORTED',
        description TEXT NOT NULL,
        evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
        latitude FLOAT,
        longitude FLOAT,
        resolution_note TEXT,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_safety_incident_reports_driver_id ON safety_incident_reports(driver_id);",
    "CREATE INDEX IF NOT EXISTS ix_safety_incident_reports_ride_id ON safety_incident_reports(ride_id);",
    "CREATE INDEX IF NOT EXISTS ix_safety_incident_reports_incident_category ON safety_incident_reports(incident_category);",
    "CREATE INDEX IF NOT EXISTS ix_safety_incident_reports_status ON safety_incident_reports(status);",
]

async def run_migrations():
    print("Starting Features 20, 21, and 22 DDL migrations...")
    async with async_session_maker() as session:
        for i, stmt in enumerate(STATEMENTS, 1):
            cleaned = stmt.strip()
            title = cleaned.split("\n")[0] if "\n" in cleaned else cleaned
            print(f"[{i}/{len(STATEMENTS)}] Executing: {title[:70]}...")
            try:
                await session.execute(text(cleaned))
                await session.commit()
                print(f"  ✓ Success")
            except Exception as e:
                print(f"  ❌ Error: {e}")
                await session.rollback()
                raise e
    print("\nFeatures 20, 21, and 22 DDL migrations completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migrations())
