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

async def check_all_tables_status():
    print("=========================================================================", flush=True)
    print("         CABBOOKING SYSTEM: COMPREHENSIVE DATABASE TABLE & TRUNCATION AUDIT", flush=True)
    print("=========================================================================", flush=True)

    async with engine.connect() as conn:
        # Fetch all public tables
        res = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """))
        tables = [r[0] for r in res.fetchall()]
        print(f"Total Base Tables found in database: {len(tables)}\n", flush=True)

        # Get counts for every table
        empty_tables = []
        populated_tables = []
        error_tables = []

        for tbl in tables:
            try:
                c_res = await conn.execute(text(f'SELECT count(*) FROM "{tbl}"'))
                cnt = c_res.scalar()
                if cnt == 0:
                    empty_tables.append(tbl)
                else:
                    populated_tables.append((tbl, cnt))
            except Exception as e:
                error_tables.append((tbl, str(e)))

        print("=" * 75, flush=True)
        print(f" 📊 AUDIT SUMMARY")
        print(f"   • Total Tables Evaluated    : {len(tables)}")
        print(f"   • Truncated / Empty (0 rows): {len(empty_tables)}")
        print(f"   • Populated Tables (>0 rows): {len(populated_tables)}")
        print(f"   • Query Errors              : {len(error_tables)}")
        print("=" * 75, flush=True)

        if populated_tables:
            print("\n📌 [TABLES WITH ACTIVE DATA (NOT TRUNCATED)]:", flush=True)
            for tbl, count in sorted(populated_tables, key=lambda x: x[0]):
                print(f"   • {tbl:<45} : {count:>5} row(s)", flush=True)

        if empty_tables:
            print(f"\n🗑️ [TRUNCATED / EMPTY TABLES ({len(empty_tables)} tables with 0 rows)]:", flush=True)
            for i in range(0, len(empty_tables), 2):
                col1 = empty_tables[i]
                col2 = empty_tables[i+1] if i+1 < len(empty_tables) else ""
                print(f"   - {col1:<36} {('- ' + col2) if col2 else ''}", flush=True)

        if error_tables:
            print("\n❌ [TABLES WITH ERRORS]:", flush=True)
            for tbl, err in error_tables:
                print(f"   ! {tbl}: {err}", flush=True)

    await engine.dispose()
    print("\n" + "=" * 75, flush=True)
    print(" ✅ AUDIT COMPLETE", flush=True)
    print("=" * 75, flush=True)

if __name__ == "__main__":
    asyncio.run(check_all_tables_status())
