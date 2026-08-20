import asyncio, sys
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")
from common.database import async_session_maker
from sqlalchemy import text

async def check_enum():
    async with async_session_maker() as session:
        res = await session.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'documenttype';"))
        labels = [r[0] for r in res.fetchall()]
        print("DB documenttype enum values:", labels)

if __name__ == "__main__":
    asyncio.run(check_enum())
