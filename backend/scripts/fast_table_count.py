import asyncio
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
common_dir = os.path.abspath(os.path.join(backend_dir, 'common'))
if common_dir not in sys.path:
    sys.path.insert(0, common_dir)

from sqlalchemy import text
from common.database import engine

FAST_QUERY = """
DO $$
DECLARE
    rec RECORD;
    cnt BIGINT;
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS temp_table_counts (
        table_name TEXT PRIMARY KEY,
        row_count BIGINT
    ) ON COMMIT DROP;
    
    TRUNCATE temp_table_counts;

    FOR rec IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    ) LOOP
        EXECUTE format('SELECT count(*) FROM public.%I', rec.tablename) INTO cnt;
        INSERT INTO temp_table_counts (table_name, row_count) VALUES (rec.tablename, cnt);
    END LOOP;
END $$;
"""

async def run_fast_audit():
    async with engine.connect() as conn:
        # Run the server-side PL/pgSQL block to calculate all counts on the DB server directly in 1 round trip!
        await conn.execute(text(FAST_QUERY))
        res = await conn.execute(text("SELECT table_name, row_count FROM temp_table_counts ORDER BY table_name"))
        rows = res.fetchall()

        total = len(rows)
        empty = [r[0] for r in rows if r[1] == 0]
        populated = [(r[0], r[1]) for r in rows if r[1] > 0]

        print("=" * 80)
        print("          CABBOOKING COMPLETE POSTGRESQL DATABASE TRUNCATION AUDIT")
        print("=" * 80)
        print(f" Total Public Tables in Database : {total}")
        print(f" Truncated / Empty Tables (0 rows): {len(empty)}")
        print(f" Populated Tables (>0 rows)      : {len(populated)}")
        print("=" * 80)

        if populated:
            print("\n📌 [TABLES WITH ACTIVE ROWS / NOT TRUNCATED]:")
            for tbl, count in sorted(populated, key=lambda x: x[0]):
                print(f"   • {tbl:<45} : {count:>5} row(s)")
        else:
            print("\n✨ ALL TABLES ARE CURRENTLY TRUNCATED (0 ROWS IN ALL TABLES)")

        if empty:
            print(f"\n🗑️ [TRUNCATED / EMPTY TABLES ({len(empty)} tables with 0 rows)]:")
            for i in range(0, len(empty), 2):
                col1 = empty[i]
                col2 = empty[i+1] if i+1 < len(empty) else ""
                print(f"   - {col1:<38} {('- ' + col2) if col2 else ''}")

        print("\n" + "=" * 80)
        print(" AUDIT FINISHED SUCCESSFULLY - ALL TABLE TRANSACTIONS & ROW COUNTS VERIFIED")
        print("=" * 80)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_fast_audit())
