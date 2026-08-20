import sys, os, asyncio
backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, 'common'))

from common.database import engine, Base
import common.models.all_models
from sqlalchemy import text

async def sync():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            print("Base.metadata.create_all executed successfully!", flush=True)
            
            for table_name, table in Base.metadata.tables.items():
                query = text('SELECT column_name FROM information_schema.columns WHERE table_name = :t')
                res = await conn.execute(query, {'t': table_name})
                existing_cols = {r[0] for r in res}
                if not existing_cols:
                    continue
                for col in table.columns:
                    if col.name not in existing_cols:
                        col_type = col.type.compile(engine.dialect)
                        stmt = f'ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col.name} {col_type}'
                        print(f'Migrating column: {stmt}', flush=True)
                        try:
                            await conn.execute(text(stmt))
                        except Exception as e:
                            print(f'Error on {stmt}: {e}', flush=True)
    finally:
        await engine.dispose()
        print("Engine disposed.", flush=True)

if __name__ == '__main__':
    asyncio.run(sync())
    print("Database sync completed successfully!", flush=True)
