
import sys, os, asyncio
_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_dir, 'common'))
sys.path.insert(0, _dir)
from sqlalchemy import text
from common.database import engine, Base
import common.models.all_models

async def migrate_columns():
    async with engine.begin() as conn:
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
                    print(f'Migrating: {stmt}')
                    try:
                        await conn.execute(text(stmt))
                    except Exception as e:
                        print(f'Error on {stmt}: {e}')

asyncio.run(migrate_columns())
print('Auto-migration completed!')
