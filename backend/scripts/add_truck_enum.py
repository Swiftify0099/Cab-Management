import asyncio, sys
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")
from common.database import async_session_maker
from sqlalchemy import text

async def add_truck():
    async with async_session_maker() as session:
        try:
            await session.execute(text("ALTER TYPE vehicletype ADD VALUE IF NOT EXISTS 'TRUCK';"))
            await session.commit()
            print("Added TRUCK enum")
        except Exception as e:
            print("Enum note:", e)

if __name__ == "__main__":
    asyncio.run(add_truck())
