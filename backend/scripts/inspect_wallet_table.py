import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common.database import async_session_maker
from sqlalchemy import text

async def check():
    async with async_session_maker() as db:
        res = await db.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wallet_transactions'"))
        rows = res.fetchall()
        print("wallet_transactions columns:")
        for r in rows:
            print(f"  - {r[0]}: {r[1]}")

if __name__ == "__main__":
    asyncio.run(check())
