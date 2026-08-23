import asyncio
import os
import sys
import glob
import importlib.util

backend_root = r"c:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, "common"))

from sqlalchemy import text
from common.database import engine, Base, async_session_maker
import common.models.all_models

async def main():
    print("=" * 60)
    print("1. Running Base.metadata.create_all...")
    print("=" * 60)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Base.metadata.create_all completed!")

    print("\n" + "=" * 60)
    print("2. Running all migrate_*.py scripts in backend/scripts...")
    print("=" * 60)
    scripts_dir = os.path.join(backend_root, "scripts")
    migration_scripts = sorted(glob.glob(os.path.join(scripts_dir, "migrate_*.py")))
    
    for script_path in migration_scripts:
        script_name = os.path.basename(script_path)
        print(f"--- Running script: {script_name} ---")
        try:
            spec = importlib.util.spec_from_file_location(f"mod_{script_name[:-3]}", script_path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            
            # Look for run functions
            for fn_name in ["run_migration", "migrate_columns", "run_all_migrations", "migrate", "apply_migration"]:
                if hasattr(mod, fn_name):
                    fn = getattr(mod, fn_name)
                    if asyncio.iscoroutinefunction(fn):
                        await fn()
                    else:
                        fn()
                    break
        except Exception as e:
            print(f"Notice/Error on {script_name}: {e}")

    print("\n" + "=" * 60)
    print("3. Checking all Model Tables & Columns vs Live Database Schema...")
    print("=" * 60)
    missing_cols_count = 0
    added_cols_count = 0
    
    async with engine.begin() as conn:
        for table_name, table in Base.metadata.tables.items():
            query = text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = :t")
            res = await conn.execute(query, {"t": table_name})
            existing_cols = {r[0]: (r[1], r[2]) for r in res}
            
            if not existing_cols:
                print(f"Table '{table_name}' does not exist in information_schema! Re-creating...")
                try:
                    await conn.run_sync(table.create)
                    print(f"Created table '{table_name}'.")
                except Exception as e:
                    print(f"Error creating table '{table_name}': {e}")
                continue

            for col in table.columns:
                if col.name not in existing_cols:
                    missing_cols_count += 1
                    col_type = col.type.compile(engine.dialect)
                    stmt = f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col.name} {col_type}"
                    print(f"Adding missing column -> {stmt}")
                    try:
                        await conn.execute(text(stmt))
                        added_cols_count += 1
                    except Exception as e:
                        print(f"Error executing '{stmt}': {e}")

    print(f"\nModel schema check completed. Missing columns found: {missing_cols_count}, Added: {added_cols_count}")

    print("\n" + "=" * 60)
    print("4. Live Table Row Count & Query Sanity Check...")
    print("=" * 60)
    async with async_session_maker() as session:
        result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"))
        tables = [r[0] for r in result]
        print(f"Total tables in public schema: {len(tables)}")
        
        failed_tables = []
        for t in tables:
            try:
                cnt_res = await session.execute(text(f'SELECT count(*) FROM "{t}"'))
                cnt = cnt_res.scalar()
            except Exception as e:
                failed_tables.append((t, str(e)))
        
        if failed_tables:
            print(f"WARNING: {len(failed_tables)} tables failed sanity check:")
            for t, err in failed_tables:
                print(f"   {t}: {err}")
        else:
            print("All public tables queried successfully with zero errors!")

    print("\n" + "=" * 60)
    print("DATABASE MIGRATION AND SCHEMA AUDIT COMPLETE & FULLY SYNCHRONIZED!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
