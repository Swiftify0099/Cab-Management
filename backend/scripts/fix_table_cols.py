import asyncio
import sys, os

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
os.chdir(backend_root)
sys.path.insert(0, backend_root)

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DB_URL = "postgresql+asyncpg://cabooking_user:cabooking_pass@127.0.0.1:5432/cabooking"

statements = [
    "ALTER TABLE driver_earning_ledger ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
    "ALTER TABLE driver_customer_ratings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
]

async def fix():
    engine = create_async_engine(DB_URL, echo=False)
    async with engine.begin() as conn:
        for stmt in statements:
            await conn.execute(text(stmt))
            print(f"Executed: {stmt}")
    await engine.dispose()
    print("Database columns fixed!")

if __name__ == '__main__':
    asyncio.run(fix())
