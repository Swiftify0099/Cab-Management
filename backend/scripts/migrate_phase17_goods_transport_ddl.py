"""
===============================================================================
MIGRATION SCRIPT: PHASE 17 — GOODS TRANSPORT ENHANCEMENTS
===============================================================================
Enriches PostgreSQL tables with:
- Floor & elevator handling columns
- Tarpaulin & tie-down ropes equipment flags
- Pickup OTP confirmation
- Indian GST E-Way Bill fields
- Itemized quotation components (base rate, helper charge, toll/taxes)
===============================================================================
"""
import asyncio
import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import text
from common.database import async_session_maker


async def migrate_phase17_goods_transport():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("🚀 Starting Phase 17 Goods Transport DDL Migration...")

    async with async_session_maker() as db:
        # 1. Update transport_orders table
        await db.execute(text("ALTER TABLE transport_orders ADD COLUMN IF NOT EXISTS loading_floor INTEGER NOT NULL DEFAULT 0;"))
        await db.execute(text("ALTER TABLE transport_orders ADD COLUMN IF NOT EXISTS loading_has_elevator BOOLEAN NOT NULL DEFAULT TRUE;"))
        await db.execute(text("ALTER TABLE transport_orders ADD COLUMN IF NOT EXISTS unloading_floor INTEGER NOT NULL DEFAULT 0;"))
        await db.execute(text("ALTER TABLE transport_orders ADD COLUMN IF NOT EXISTS unloading_has_elevator BOOLEAN NOT NULL DEFAULT TRUE;"))
        await db.execute(text("ALTER TABLE transport_orders ADD COLUMN IF NOT EXISTS tarp_required BOOLEAN NOT NULL DEFAULT FALSE;"))
        await db.execute(text("ALTER TABLE transport_orders ADD COLUMN IF NOT EXISTS ropes_required BOOLEAN NOT NULL DEFAULT FALSE;"))
        await db.execute(text("ALTER TABLE transport_orders ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(10) NULL;"))
        await db.execute(text("ALTER TABLE transport_orders ADD COLUMN IF NOT EXISTS pickup_otp_verified_at TIMESTAMPTZ NULL;"))
        print("  ✓ Updated 'transport_orders' with floors, elevators, equipment & pickup OTP")

        # 2. Update transport_loads table
        await db.execute(text("ALTER TABLE transport_loads ADD COLUMN IF NOT EXISTS eway_bill_required BOOLEAN NOT NULL DEFAULT FALSE;"))
        await db.execute(text("ALTER TABLE transport_loads ADD COLUMN IF NOT EXISTS eway_bill_number VARCHAR(50) NULL;"))
        await db.execute(text("ALTER TABLE transport_loads ADD COLUMN IF NOT EXISTS eway_bill_url VARCHAR(512) NULL;"))
        await db.execute(text("ALTER TABLE transport_loads ADD COLUMN IF NOT EXISTS eway_bill_verified BOOLEAN NOT NULL DEFAULT FALSE;"))
        print("  ✓ Updated 'transport_loads' with GST E-Way Bill fields")

        # 3. Update transport_quotes table
        await db.execute(text("ALTER TABLE transport_quotes ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00;"))
        await db.execute(text("ALTER TABLE transport_quotes ADD COLUMN IF NOT EXISTS helper_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00;"))
        await db.execute(text("ALTER TABLE transport_quotes ADD COLUMN IF NOT EXISTS toll_and_taxes NUMERIC(10, 2) NOT NULL DEFAULT 0.00;"))
        await db.execute(text("ALTER TABLE transport_quotes ADD COLUMN IF NOT EXISTS notes TEXT NULL;"))
        print("  ✓ Updated 'transport_quotes' with itemized rate components")

        await db.commit()

    print("🎉 Phase 17 Goods Transport DDL Migration Complete!")


if __name__ == "__main__":
    asyncio.run(migrate_phase17_goods_transport())
