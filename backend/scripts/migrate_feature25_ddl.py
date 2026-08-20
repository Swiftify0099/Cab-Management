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


async def migrate_feature25():
    print("=" * 60)
    print("🔔 MIGRATING FEATURE 25: DDL (NOTIFICATION CENTER & PREFERENCES)")
    print("=" * 60)

    ddl_statements = [
        # 1. driver_notification_preferences table
        """
        CREATE TABLE IF NOT EXISTS driver_notification_preferences (
            id UUID PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            driver_id UUID NOT NULL UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
            trip_alerts BOOLEAN NOT NULL DEFAULT TRUE,
            earnings_alerts BOOLEAN NOT NULL DEFAULT TRUE,
            payout_alerts BOOLEAN NOT NULL DEFAULT TRUE,
            safety_alerts BOOLEAN NOT NULL DEFAULT TRUE,
            promotions_alerts BOOLEAN NOT NULL DEFAULT TRUE,
            sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            vibration_enabled BOOLEAN NOT NULL DEFAULT TRUE
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_driver_notif_pref_driver_id ON driver_notification_preferences(driver_id)",
        # 2. Indexes on notifications table
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)",
        "CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read)",
        "CREATE INDEX IF NOT EXISTS ix_notifications_type ON notifications(notification_type)"
    ]

    async with engine.begin() as conn:
        for stmt in ddl_statements:
            cleaned = stmt.strip()
            if cleaned:
                await conn.execute(text(cleaned))
                print(f"✓ Executed: {cleaned[:45]}...")

    print("\n✅ FEATURE 25 DATABASE DDL MIGRATION COMPLETED SUCCESSFULLY")


if __name__ == "__main__":
    asyncio.run(migrate_feature25())
