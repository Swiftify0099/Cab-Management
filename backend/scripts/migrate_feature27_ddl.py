import asyncio
import sys

sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\common")
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")

from sqlalchemy import text
from common.database import async_session_maker, engine

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def migrate_ddl():
    print("Running individual DDL commands for ride_receipts...")
    await engine.dispose()
    async with async_session_maker() as session:
        commands = [
            "ALTER TABLE ride_receipts ADD COLUMN IF NOT EXISTS is_back_to_back BOOLEAN DEFAULT FALSE",
            "ALTER TABLE ride_receipts ADD COLUMN IF NOT EXISTS next_ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL",
            "ALTER TABLE ride_receipts ADD COLUMN IF NOT EXISTS next_ride_reserved_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE ride_receipts ADD COLUMN IF NOT EXISTS next_ride_expires_at TIMESTAMP WITH TIME ZONE",
        ]
        for cmd in commands:
            await session.execute(text(cmd))
            print(f"✓ Executed: {cmd[:50]}...")
        await session.commit()
        print("✓ Successfully executed DDL for ride_receipts!")


if __name__ == "__main__":
    asyncio.run(migrate_ddl())
