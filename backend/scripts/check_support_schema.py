import asyncio
import os
import sys

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, os.path.join(backend_root, "common"))

from common.database import async_session_maker
from sqlalchemy import text


async def check():
    async with async_session_maker() as session:
        res = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='support_tickets'"))
        cols = [r[0] for r in res]
        print("support_tickets columns:", cols)

        res2 = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%support%' OR table_name LIKE '%faq%' OR table_name LIKE '%ticket%')"))
        tables = [r[0] for r in res2]
        print("Support related tables:", tables)

if __name__ == "__main__":
    asyncio.run(check())
