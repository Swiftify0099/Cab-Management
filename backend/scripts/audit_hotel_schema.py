import asyncio
import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
_COMMON_DIR = os.path.join(_BACKEND_DIR, "common")
if _COMMON_DIR not in sys.path:
    sys.path.insert(0, _COMMON_DIR)

from sqlalchemy import text
from common.database import async_session_maker

async def audit():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    async with async_session_maker() as session:
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
        tables = [r[0] for r in res]
        print(f"Total tables in database: {len(tables)}")
        hotel_tables = [t for t in tables if any(k in t for k in ['hotel', 'property', 'vendor', 'room', 'stay', 'lodge'])]
        print("Hotel/Property related tables found:", hotel_tables)
        for t in hotel_tables:
            col_res = await session.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{t}'"))
            cols = [(r[0], r[1]) for r in col_res]
            print(f"\nColumns for '{t}':")
            for c, dt in cols:
                print(f"  - {c} ({dt})")

if __name__ == '__main__':
    asyncio.run(audit())
