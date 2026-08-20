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
    # 1. Add columns to drivers
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cancellation_rate FLOAT DEFAULT 0.0;",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_cancellations INTEGER DEFAULT 0;",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS penalty_cancellations INTEGER DEFAULT 0;",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS restriction_status VARCHAR(30) DEFAULT 'NORMAL';",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS restriction_reason TEXT;",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS restriction_expires_at TIMESTAMP WITH TIME ZONE;",

    # 2. Add columns to ride_requests
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS free_waiting_ended_at TIMESTAMP WITH TIME ZONE;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS paid_waiting_started_at TIMESTAMP WITH TIME ZONE;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pickup_waiting_seconds INTEGER DEFAULT 0;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pickup_waiting_fare NUMERIC(10, 2) DEFAULT 0.00;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS is_no_show_eligible BOOLEAN DEFAULT FALSE;",

    # 3. Create ride_cancellation_events table
    """
    CREATE TABLE IF NOT EXISTS ride_cancellation_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
        actor_type VARCHAR(20) NOT NULL DEFAULT 'driver',
        actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason_code VARCHAR(50) NOT NULL,
        reason_details TEXT,
        cancellation_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        driver_penalty NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        driver_payout NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        is_penalty_exempt BOOLEAN NOT NULL DEFAULT TRUE,
        policy_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_ride_cancellation_events_ride_id ON ride_cancellation_events(ride_id);",
    "CREATE INDEX IF NOT EXISTS ix_ride_cancellation_events_actor_id ON ride_cancellation_events(actor_id);",
    "CREATE INDEX IF NOT EXISTS ix_ride_cancellation_events_reason_code ON ride_cancellation_events(reason_code);",
]

async def run_migration():
    engine = create_async_engine(DB_URL, echo=False)
    print("Executing Feature 11 & 12 DDL migrations...")
    async with engine.begin() as conn:
        for stmt in statements:
            clean_stmt = stmt.strip()
            if clean_stmt:
                await conn.execute(text(clean_stmt))
                print(f"  [✓] Executed: {clean_stmt[:50]}...")
    await engine.dispose()
    print("DDL MIGRATION FOR FEATURES 11 & 12 COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(run_migration())
