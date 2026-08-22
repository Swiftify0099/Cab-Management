import sys, os
backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
os.chdir(backend_root)
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, 'common'))

import asyncio
from common.database import engine, Base
import common.models.all_models
from sqlalchemy import text

DDL_STATEMENTS = [
    # 1. Alter ride_requests columns
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pickup_arrived_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS last_contact_attempt_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS contact_attempts_count INTEGER DEFAULT 0",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS start_pin_hash VARCHAR(128)",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS start_pin_plain VARCHAR(10)",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS start_lat DOUBLE PRECISION",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS start_lng DOUBLE PRECISION",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS start_accuracy DOUBLE PRECISION",

    # 2. Create ride_messages
    """
    CREATE TABLE IF NOT EXISTS ride_messages (
        id UUID PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL,
        message_type VARCHAR(30) NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_ride_messages_ride_id ON ride_messages(ride_id)",
    "CREATE INDEX IF NOT EXISTS ix_ride_messages_sender_id ON ride_messages(sender_id)",
    "CREATE INDEX IF NOT EXISTS ix_ride_messages_receiver_id ON ride_messages(receiver_id)",

    # 3. Create call_sessions
    """
    CREATE TABLE IF NOT EXISTS call_sessions (
        id UUID PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        caller_role VARCHAR(20) NOT NULL DEFAULT 'driver',
        status VARCHAR(30) NOT NULL DEFAULT 'requesting',
        virtual_proxy_number VARCHAR(30) NOT NULL DEFAULT '+91-80-4567-8900',
        provider_ref VARCHAR(100),
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMP WITH TIME ZONE,
        ended_at TIMESTAMP WITH TIME ZONE
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_call_sessions_ride_id ON call_sessions(ride_id)",
    "CREATE INDEX IF NOT EXISTS ix_call_sessions_driver_id ON call_sessions(driver_id)",
    "CREATE INDEX IF NOT EXISTS ix_call_sessions_customer_id ON call_sessions(customer_id)",

    # 4. Create ride_event_logs
    """
    CREATE TABLE IF NOT EXISTS ride_event_logs (
        id UUID PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        actor_id UUID,
        actor_role VARCHAR(20),
        details JSONB NOT NULL DEFAULT '{}'::jsonb
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_ride_event_logs_ride_id ON ride_event_logs(ride_id)",
    "CREATE INDEX IF NOT EXISTS ix_ride_event_logs_event_type ON ride_event_logs(event_type)"
]

async def run_ddl():
    try:
        async with engine.begin() as conn:
            for stmt in DDL_STATEMENTS:
                stmt_clean = stmt.strip()
                if stmt_clean:
                    await conn.execute(text(stmt_clean))
        print("ALL DDL MIGRATIONS EXECUTED CLEANLY!", flush=True)
    finally:
        await engine.dispose()

if __name__ == '__main__':
    asyncio.run(run_ddl())
