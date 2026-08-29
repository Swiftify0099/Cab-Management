import asyncio
import os
import sys

backend_root = r"c:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, "common"))

from sqlalchemy import text
from common.database import async_session_maker, engine

async def check():
    async with async_session_maker() as session:
        # Get all public tables
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"))
        tables = [r[0] for r in res]
        print(f"Total tables detected in database: {len(tables)}")
        
        # Build dynamic query to get counts in a single round-trip
        # Or execute in batches
        results = []
        for tbl in tables:
            try:
                cnt_res = await session.execute(text(f'SELECT count(*) FROM "{tbl}"'))
                cnt = cnt_res.scalar()
                results.append((tbl, cnt, None))
            except Exception as e:
                results.append((tbl, None, str(e)))
        
        non_empty = [(t, c) for t, c, err in results if err is None and c > 0]
        empty = [t for t, c, err in results if err is None and c == 0]
        errors = [(t, err) for t, c, err in results if err is not None]
        
        print("\n" + "="*75)
        print("                CABBOOKING DATABASE TRUNCATION & HEALTH AUDIT")
        print("="*75)
        print(f" Total Public Tables in DB  : {len(tables)}")
        print(f" Clean / Truncated (0 rows) : {len(empty)}")
        print(f" Populated Tables (>0 rows) : {len(non_empty)}")
        print(f" Query Errors               : {len(errors)}")
        print("="*75)
        
        if non_empty:
            print("\n[TABLES CURRENTLY CONTAINING DATA]:")
            for tbl, count in sorted(non_empty, key=lambda x: x[0]):
                print(f"  * {tbl:<45} : {count:>6} rows")
        else:
            print("\n[ALL TABLES ARE CLEAN / 100% TRUNCATED (0 rows in all tables)]")
            
        if empty:
            print(f"\n[TRUNCATED / EMPTY TABLES ({len(empty)} tables)]:")
            for i in range(0, len(empty), 2):
                col1 = empty[i]
                col2 = empty[i+1] if i+1 < len(empty) else ""
                print(f"  - {col1:<36} {('- ' + col2) if col2 else ''}")

        if errors:
            print("\n[TABLES WITH QUERY ERRORS]:")
            for tbl, err in errors:
                print(f"  ! {tbl}: {err}")
                
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
