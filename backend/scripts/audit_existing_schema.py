import sys, os, asyncio
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, 'common'))

from common.database import async_session_maker
from sqlalchemy import text

async def audit():
    async with async_session_maker() as session:
        # Check all tables
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
        tables = [r[0] for r in res]
        print(f"Total tables: {len(tables)}")
        print("Tables:", tables)

        for t in ['ride_requests', 'ride_offers', 'drivers', 'users', 'vehicles', 'customer_profiles', 'driver_locations']:
            if t in tables:
                col_res = await session.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{t}'"))
                cols = [(r[0], r[1]) for r in col_res]
                print(f"\nColumns for '{t}':")
                for c, dt in cols:
                    print(f"  - {c} ({dt})")

if __name__ == '__main__':
    asyncio.run(audit())
