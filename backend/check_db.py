import asyncio
from sqlalchemy import text
from common.database import async_session_maker

async def check():
    async with async_session_maker() as session:
        result = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='trips'"))
        cols = [r[0] for r in result]
        print("COLUMNS IN DB:")
        print(cols)

asyncio.run(check())
