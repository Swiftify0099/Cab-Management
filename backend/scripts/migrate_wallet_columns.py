import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common.database import async_session_maker
from sqlalchemy import text

async def migrate_wallet_columns():
    async with async_session_maker() as db:
        await db.execute(text("ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS direction VARCHAR(10) DEFAULT 'CREDIT'"))
        await db.execute(text("ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS bucket VARCHAR(30) DEFAULT 'CASH'"))
        await db.execute(text("ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL"))
        await db.execute(text("ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) NULL"))
        await db.commit()
        print("Migrated wallet_transactions columns successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_wallet_columns())
