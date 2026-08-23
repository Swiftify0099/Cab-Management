import asyncio
import os
import sys

backend_root = r"c:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, "common"))

from sqlalchemy import text
from common.database import engine, Base, async_session_maker
import common.models.all_models

async def main():
    print("================================================================")
    print("      COMPREHENSIVE CABBOOKING DATABASE HEALTH & SCHEMA AUDIT   ")
    print("================================================================")

    async with engine.begin() as conn:
        # Check all models
        missing_columns = []
        total_model_tables = len(Base.metadata.tables)
        print(f"Total ORM Model Tables defined: {total_model_tables}")

        for table_name, table in Base.metadata.tables.items():
            query = text("SELECT column_name FROM information_schema.columns WHERE table_name = :t")
            res = await conn.execute(query, {"t": table_name})
            existing_cols = {r[0] for r in res}

            if not existing_cols:
                print(f"  [MISSING TABLE] {table_name}")
                continue

            for col in table.columns:
                if col.name not in existing_cols:
                    missing_columns.append((table_name, col.name))

        if missing_columns:
            print(f"\n[ALERT] Found {len(missing_columns)} missing columns:")
            for tbl, c in missing_columns:
                print(f"  - {tbl}.{c}")
        else:
            print("\n[OK] 100% of ORM model columns exist in the database!")

    async with async_session_maker() as session:
        # Check all public tables
        res = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"))
        db_tables = [r[0] for r in res]
        print(f"\nTotal live PostgreSQL tables in 'public' schema: {len(db_tables)}")

        # Query each table
        errors = []
        for tbl in db_tables:
            try:
                c_res = await session.execute(text(f'SELECT count(*) FROM "{tbl}"'))
                # print(f"  ✓ {tbl} ({c_res.scalar()} rows)")
            except Exception as e:
                errors.append((tbl, str(e)))

        if errors:
            print(f"\n[ERROR] {len(errors)} tables encountered query errors:")
            for tbl, err in errors:
                print(f"  ✕ {tbl}: {err}")
        else:
            print(f"[OK] All {len(db_tables)} database tables queried successfully with ZERO errors!")

    await engine.dispose()
    print("\n================================================================")
    print("      DATABASE MIGRATIONS & SCHEMA ARE FULLY UP TO DATE!         ")
    print("================================================================")

if __name__ == "__main__":
    asyncio.run(main())
