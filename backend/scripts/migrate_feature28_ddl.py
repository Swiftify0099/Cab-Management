import asyncio
import sys

sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\common")
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")

from sqlalchemy import text
from common.database import async_session_maker, engine

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def migrate_feature28():
    print("Running DDL migration for Feature 28 (driver_app_settings)...")
    await engine.dispose()

    async with async_session_maker() as session:
        commands = [
            """
            CREATE TABLE IF NOT EXISTS driver_app_settings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                driver_id UUID UNIQUE NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
                language VARCHAR(10) NOT NULL DEFAULT 'en',
                navigation_app VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
                auto_accept_rides BOOLEAN NOT NULL DEFAULT FALSE,
                auto_accept_min_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                voice_navigation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                sound_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
                high_contrast_mode BOOLEAN NOT NULL DEFAULT FALSE,
                theme_mode VARCHAR(20) NOT NULL DEFAULT 'system',
                speed_limit_warning BOOLEAN NOT NULL DEFAULT TRUE,
                is_deactivated BOOLEAN NOT NULL DEFAULT FALSE,
                deactivation_reason TEXT,
                deactivated_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_driver_app_settings_driver_id ON driver_app_settings(driver_id);",
            "CREATE INDEX IF NOT EXISTS ix_driver_app_settings_is_deactivated ON driver_app_settings(is_deactivated);"
        ]

        for cmd in commands:
            await session.execute(text(cmd))
            print(f"✓ Executed: {cmd.strip()[:60]}...")

        await session.commit()
        print("✓ Successfully executed DDL migration for Feature 28 (driver_app_settings)!")


if __name__ == "__main__":
    asyncio.run(migrate_feature28())
