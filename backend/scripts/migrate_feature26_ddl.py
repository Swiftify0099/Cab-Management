import asyncio
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, os.path.join(backend_root, "common"))
sys.path.insert(0, os.path.join(backend_root, "matching-service"))
sys.path.insert(0, backend_root)

from common.database import engine
from sqlalchemy import text


async def migrate_feature26():
    print("=" * 60)
    print("🗓️ MIGRATING FEATURE 26: DDL (SCHEDULED / RESERVED TRIPS)")
    print("=" * 60)

    ddl_statements = [
        "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS scheduled_pickup_time TIMESTAMPTZ",
        "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS scheduled_status VARCHAR(30) DEFAULT 'UNASSIGNED'",
        "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS reservation_accepted_at TIMESTAMPTZ",
        "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS dispatch_buffer_minutes INT NOT NULL DEFAULT 45",
        "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ",
        "CREATE INDEX IF NOT EXISTS ix_ride_requests_is_scheduled ON ride_requests(is_scheduled)",
        "CREATE INDEX IF NOT EXISTS ix_ride_requests_scheduled_time ON ride_requests(scheduled_pickup_time)",
        "CREATE INDEX IF NOT EXISTS ix_ride_requests_scheduled_status ON ride_requests(scheduled_status)"
    ]

    async with engine.begin() as conn:
        for stmt in ddl_statements:
            cleaned = stmt.strip()
            if cleaned:
                await conn.execute(text(cleaned))
                print(f"✓ Executed: {cleaned[:50]}...")

    print("\n✅ FEATURE 26 DATABASE DDL MIGRATION COMPLETED SUCCESSFULLY")


if __name__ == "__main__":
    asyncio.run(migrate_feature26())
