import asyncio
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'common')))

from sqlalchemy import text
from common.database import async_session_maker

async def inspect():
    async with async_session_maker() as session:
        result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
        tables = [r[0] for r in result]
        print("TABLES IN DB:")
        for t in tables:
            print(" -", t)

if __name__ == "__main__":
    asyncio.run(inspect())
