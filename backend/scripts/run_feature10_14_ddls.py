import asyncio
import os
import sys

backend_root = r"c:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, "common"))

from sqlalchemy import text
from common.database import engine, async_session_maker

from scripts.migrate_feature10_ddl import statements as s10
from scripts.migrate_feature11_12_ddl import statements as s11_12
from scripts.migrate_feature13_14_ddl import statements as s13_14

all_stmts = s10 + s11_12 + s13_14

async def run():
    print(f"Executing {len(all_stmts)} statements from Features 10, 11, 12, 13, 14 using active Supabase Engine...")
    async with async_session_maker() as session:
        for idx, stmt in enumerate(all_stmts, 1):
            clean = stmt.strip()
            if not clean:
                continue
            try:
                await session.execute(text(clean))
                await session.commit()
                print(f"  [{idx}/{len(all_stmts)}] SUCCESS: {clean.splitlines()[0][:60]}...")
            except Exception as e:
                await session.rollback()
                print(f"  [{idx}/{len(all_stmts)}] NOTICE/ERROR: {e}")

    # Verify tables
    check_tables = [
        "ride_stops", "ride_sos_events", "ride_cancellation_events",
        "ride_receipts", "driver_earning_ledger", "driver_customer_ratings"
    ]
    async with async_session_maker() as session:
        for tbl in check_tables:
            try:
                res = await session.execute(text(f'SELECT count(*) FROM "{tbl}"'))
                print(f"Verified table '{tbl}': {res.scalar()} rows")
            except Exception as e:
                print(f"Error on table '{tbl}': {e}")

    await engine.dispose()
    print("Feature 10-14 DDL migration complete!")

if __name__ == "__main__":
    asyncio.run(run())
