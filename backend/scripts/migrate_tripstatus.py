import asyncio, sys
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")
from common.database import async_session_maker
from sqlalchemy import text
from common.models.all_models import TripStatus

async def migrate_tripstatus():
    async with async_session_maker() as session:
        for val in TripStatus:
            for variant in [val.value, val.name, val.value.upper(), val.value.lower()]:
                try:
                    await session.execute(text(f"ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS '{variant}';"))
                    await session.commit()
                except Exception:
                    await session.rollback()
        res = await session.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'tripstatus';"))
        labels = [r[0] for r in res.fetchall()]
        print("Updated DB tripstatus enum values:", labels)

if __name__ == "__main__":
    asyncio.run(migrate_tripstatus())
