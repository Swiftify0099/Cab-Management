import asyncio
import sys, os

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
os.chdir(backend_root)
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, 'common'))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DB_URL = "postgresql+asyncpg://cabooking_user:cabooking_pass@127.0.0.1:5432/cabooking"

statements = [
    # 1. Add columns to ride_requests
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS distance_travelled_km FLOAT DEFAULT 0.0;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS waiting_duration_seconds INTEGER DEFAULT 0;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS waiting_fare NUMERIC(10, 2) DEFAULT 0.0;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS current_estimated_fare NUMERIC(10, 2) DEFAULT 0.0;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS has_active_sos BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS destination_change_count INTEGER DEFAULT 0;",

    # 2. Create ride_stops table
    """
    CREATE TABLE IF NOT EXISTS ride_stops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL DEFAULT 1,
        address TEXT NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        requested_by VARCHAR(20) NOT NULL DEFAULT 'customer',
        stop_fee NUMERIC(10, 2) NOT NULL DEFAULT 30.00,
        waiting_time_seconds INTEGER NOT NULL DEFAULT 0,
        arrived_at TIMESTAMP WITH TIME ZONE,
        departed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_ride_stops_ride_id ON ride_stops(ride_id);",
    "CREATE INDEX IF NOT EXISTS ix_ride_stops_location ON ride_stops USING GIST(location);",

    # 3. Create ride_sos_events table
    """
    CREATE TABLE IF NOT EXISTS ride_sos_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        triggered_by VARCHAR(20) NOT NULL DEFAULT 'driver',
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        accuracy FLOAT NOT NULL DEFAULT 10.0,
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        reason TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_ride_sos_ride_id ON ride_sos_events(ride_id);",
    "CREATE INDEX IF NOT EXISTS ix_ride_sos_status ON ride_sos_events(status);",
    "CREATE INDEX IF NOT EXISTS ix_ride_sos_location ON ride_sos_events USING GIST(location);",
]

async def run_migration():
    engine = create_async_engine(DB_URL, echo=False)
    print("Executing Feature 10 DDL migrations...")
    async with engine.begin() as conn:
        for stmt in statements:
            clean_stmt = stmt.strip()
            if clean_stmt:
                await conn.execute(text(clean_stmt))
                print(f"  [✓] Executed: {clean_stmt[:50]}...")
    await engine.dispose()
    print("DDL MIGRATION FOR FEATURE 10 COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(run_migration())
