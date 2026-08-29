import os
import sys
import asyncio

_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_root, "common"))
sys.path.insert(0, _root)

from sqlalchemy import text
from common.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating corporate columns...")
        await conn.execute(text("ALTER TABLE corporate_policies ADD COLUMN IF NOT EXISTS cashless_only BOOLEAN NOT NULL DEFAULT TRUE;"))
        await conn.execute(text("ALTER TABLE corporate_policies ADD COLUMN IF NOT EXISTS allowed_payment_methods JSONB NOT NULL DEFAULT '[\"CORPORATE_WALLET\", \"INVOICE_BILLING\"]'::jsonb;"))
        await conn.execute(text("ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS cost_center_code VARCHAR(50);"))
        print("Corporate columns migrated successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
