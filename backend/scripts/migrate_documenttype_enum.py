import asyncio, sys
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")
from common.database import async_session_maker
from sqlalchemy import text

async def migrate_enum():
    async with async_session_maker() as session:
        values_to_add = ["POLICE_VERIFICATION", "PERMIT", "PUC", "BANK_ACCOUNT", "FITNESS", "fitness"]
        for v in values_to_add:
            try:
                # PostgreSQL requires commit per ALTER TYPE ADD VALUE or running outside a multi-statement transaction block
                await session.execute(text(f"ALTER TYPE documenttype ADD VALUE IF NOT EXISTS '{v}';"))
                await session.commit()
                print(f"Added enum value '{v}' to documenttype")
            except Exception as e:
                print(f"Enum value '{v}' note: {e}")
                await session.rollback()

if __name__ == "__main__":
    asyncio.run(migrate_enum())
