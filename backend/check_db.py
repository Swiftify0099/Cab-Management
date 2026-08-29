import asyncio
from sqlalchemy import text
from common.database import async_session_maker

async def check():
    async with async_session_maker() as session:
        # Check if pickup_lon exists
        res = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='saved_routes' AND column_name='pickup_lon'"))
        if res.scalar_one_or_none():
            await session.execute(text("ALTER TABLE saved_routes RENAME COLUMN pickup_lon TO pickup_lng"))
            await session.execute(text("ALTER TABLE saved_routes RENAME COLUMN drop_lon TO drop_lng"))
            await session.commit()
            print("Successfully renamed saved_routes columns to pickup_lng and drop_lng")
        else:
            print("saved_routes columns already migrated")

        # Verify
        result = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='saved_routes'"))
        print("Updated columns:", [r[0] for r in result.fetchall()])

asyncio.run(check())



