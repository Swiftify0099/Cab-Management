"""
Migration: Add partial unique index on ride_requests to prevent duplicate active rides per driver.

This script is idempotent (uses CREATE UNIQUE INDEX IF NOT EXISTS).

IMPORTANT: Run fix_duplicate_active_rides.py FIRST to clean existing dirty data,
otherwise this script will fail with a unique-constraint violation on existing duplicates.

Usage (from backend/ directory):
    python scripts/add_ride_uniqueness_constraint.py
    python scripts/add_ride_uniqueness_constraint.py --check   # only check, don't create
"""
import asyncio
import sys
import os
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy import text
from common.database import engine


INDEX_NAME = "ix_ride_requests_one_active_per_driver"

CREATE_INDEX_SQL = f"""
CREATE UNIQUE INDEX IF NOT EXISTS {INDEX_NAME}
ON ride_requests (assigned_driver_id)
WHERE status IN ('assigned', 'pickup', 'in_progress')
  AND assigned_driver_id IS NOT NULL;
"""

CHECK_INDEX_SQL = f"""
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ride_requests'
  AND indexname = '{INDEX_NAME}';
"""

CHECK_DUPLICATES_SQL = """
SELECT assigned_driver_id, COUNT(*) as cnt
FROM ride_requests
WHERE status IN ('assigned', 'pickup', 'in_progress')
  AND assigned_driver_id IS NOT NULL
GROUP BY assigned_driver_id
HAVING COUNT(*) > 1;
"""


async def run(check_only: bool = False):
    async with engine.connect() as conn:
        # 1. Check for existing duplicates first
        dup_res = await conn.execute(text(CHECK_DUPLICATES_SQL))
        duplicates = dup_res.fetchall()
        if duplicates:
            print("\nERROR: Duplicate active rides still exist in the DB:")
            for row in duplicates:
                print(f"  driver_id={row[0]}  count={row[1]}")
            print("\nRun fix_duplicate_active_rides.py first, then re-run this script.")
            sys.exit(1)

        print("No duplicate active rides found. Safe to proceed.")

        # 2. Check if index already exists
        idx_res = await conn.execute(text(CHECK_INDEX_SQL))
        existing = idx_res.fetchone()
        if existing:
            print(f"\nIndex '{INDEX_NAME}' already exists:")
            print(f"  {existing[1]}")
            print("\nNothing to do.")
            return

        if check_only:
            print(f"\n[CHECK] Index '{INDEX_NAME}' does NOT exist yet. Run without --check to create it.")
            return

        # 3. Create the index
        print(f"\nCreating index '{INDEX_NAME}'...")
        await conn.execute(text(CREATE_INDEX_SQL))
        await conn.commit()

        # 4. Verify
        idx_res2 = await conn.execute(text(CHECK_INDEX_SQL))
        created = idx_res2.fetchone()
        if created:
            print(f"\nIndex created successfully:")
            print(f"  {created[1]}")
        else:
            print("\nWARNING: Index creation returned no error but index not found in pg_indexes.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add partial unique index to ride_requests.")
    parser.add_argument("--check", action="store_true",
                        help="Only check status without creating the index.")
    args = parser.parse_args()
    asyncio.run(run(check_only=args.check))
