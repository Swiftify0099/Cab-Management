import asyncio, sys
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")
from common.database import async_session_maker
from sqlalchemy import text

async def inspect():
    async with async_session_maker() as session:
        cols = await session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vehicles';"))
        print("Columns in vehicles table:", cols.fetchall())
        constrs = await session.execute(text("""
            SELECT conname, contype, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'vehicles';
        """))
        print("\nConstraints in vehicles table:")
        for r in constrs.fetchall():
            print(" ", r)

if __name__ == "__main__":
    asyncio.run(inspect())
