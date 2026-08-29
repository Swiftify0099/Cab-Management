"""
===============================================================================
DATABASE MIGRATION: PHASE 21 — PACKERS & MOVERS LOGISTICS ENHANCEMENTS
===============================================================================
Enriches schema for:
1. MovingOrder: property_type, rooms_count, large_items_count, box_count,
   pickup/drop service lift availability, packing_type, helpers_count,
   pickup_otp, pickup_otp_verified_at, delivery_otp_verified_at, etc.
2. MovingItem: needs_assembly, cubic_feet_est, weight_kg_est,
   pre_existing_damage_notes, pre_inspection_photo_url, post_inspection_photo_url.
3. MovingQuote: base_shifting_rate, crew_charge, packing_materials_charge,
   vehicle_charge, toll_and_taxes.
4. MovingCrewMember: Table for multiple worker crew tracking.
5. MovingInspection: Table for Cloudinary pre/post inspection walkthroughs.
6. MovingPOD: damage_photos_json, claimed_amount, agreed_deduction,
   customer_acknowledged, mover_acknowledged.
===============================================================================
"""
import asyncio
import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import text
from common.database import async_session_maker, engine


SQL_STATEMENTS = [
    # 0. Update movingorderstatus enum values
    "ALTER TYPE movingorderstatus ADD VALUE IF NOT EXISTS 'CREW_ARRIVED';",
    "ALTER TYPE movingorderstatus ADD VALUE IF NOT EXISTS 'PRE_INSPECTION';",
    "ALTER TYPE movingorderstatus ADD VALUE IF NOT EXISTS 'ARRIVED_DESTINATION';",
    "ALTER TYPE movingorderstatus ADD VALUE IF NOT EXISTS 'POST_INSPECTION';",
    "ALTER TYPE movingorderstatus ADD VALUE IF NOT EXISTS 'DAMAGE_SIGNOFF';",

    # 1. Update moving_orders with Phase 21 fields
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS property_type VARCHAR(50) DEFAULT 'APARTMENT';",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS rooms_count INTEGER DEFAULT 2;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS large_items_count INTEGER DEFAULT 0;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS box_count INTEGER DEFAULT 10;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS pickup_service_lift_available BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS drop_service_lift_available BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS packing_required BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS packing_type VARCHAR(50) DEFAULT 'STANDARD';",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS loading_required BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS unloading_required BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS helpers_count INTEGER DEFAULT 3;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS requires_disassembly BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(6);",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS pickup_otp_verified_at TIMESTAMP WITH TIME ZONE;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(6);",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS delivery_otp_verified_at TIMESTAMP WITH TIME ZONE;",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PAID';",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'WALLET';",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS gross_fare NUMERIC(10, 2);",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS mover_earning NUMERIC(10, 2);",
    "ALTER TABLE moving_orders ADD COLUMN IF NOT EXISTS platform_commission NUMERIC(10, 2);",

    # 2. Update moving_items with disassembly/assembly & inspection photos
    "ALTER TABLE moving_items ADD COLUMN IF NOT EXISTS needs_assembly BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE moving_items ADD COLUMN IF NOT EXISTS cubic_feet_est DOUBLE PRECISION DEFAULT 10.0;",
    "ALTER TABLE moving_items ADD COLUMN IF NOT EXISTS weight_kg_est DOUBLE PRECISION DEFAULT 25.0;",
    "ALTER TABLE moving_items ADD COLUMN IF NOT EXISTS pre_existing_damage_notes TEXT;",
    "ALTER TABLE moving_items ADD COLUMN IF NOT EXISTS pre_inspection_photo_url VARCHAR(512);",
    "ALTER TABLE moving_items ADD COLUMN IF NOT EXISTS post_inspection_photo_url VARCHAR(512);",

    # 3. Update moving_quotes with itemized financial breakdown
    "ALTER TABLE moving_quotes ADD COLUMN IF NOT EXISTS base_shifting_rate NUMERIC(10, 2);",
    "ALTER TABLE moving_quotes ADD COLUMN IF NOT EXISTS crew_charge NUMERIC(10, 2);",
    "ALTER TABLE moving_quotes ADD COLUMN IF NOT EXISTS packing_materials_charge NUMERIC(10, 2);",
    "ALTER TABLE moving_quotes ADD COLUMN IF NOT EXISTS vehicle_charge NUMERIC(10, 2);",
    "ALTER TABLE moving_quotes ADD COLUMN IF NOT EXISTS toll_and_taxes NUMERIC(10, 2);",

    # 4. Create moving_crew_members table
    """
    CREATE TABLE IF NOT EXISTS moving_crew_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES moving_orders(id) ON DELETE CASCADE,
        mover_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
        member_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'HELPER',
        is_present BOOLEAN NOT NULL DEFAULT FALSE,
        check_in_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_moving_crew_members_order_id ON moving_crew_members(order_id);",

    # 5. Create moving_inspections table for Cloudinary pre/post inspection walkthroughs
    """
    CREATE TABLE IF NOT EXISTS moving_inspections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES moving_orders(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        inspector_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
        photos_json JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        customer_signature_url VARCHAR(512),
        customer_acknowledged BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_moving_inspections_order_id ON moving_inspections(order_id);",

    # 6. Update moving_pods with damage photos & claim signoff fields
    "ALTER TABLE moving_pods ADD COLUMN IF NOT EXISTS damage_photos_json JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE moving_pods ADD COLUMN IF NOT EXISTS claimed_amount NUMERIC(10, 2) DEFAULT 0.00;",
    "ALTER TABLE moving_pods ADD COLUMN IF NOT EXISTS agreed_deduction NUMERIC(10, 2) DEFAULT 0.00;",
    "ALTER TABLE moving_pods ADD COLUMN IF NOT EXISTS customer_acknowledged BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE moving_pods ADD COLUMN IF NOT EXISTS mover_acknowledged BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE moving_pods ADD COLUMN IF NOT EXISTS mover_signature_url VARCHAR(512);",
]


async def run_migrations():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    print("================================================================================")
    print("APPLYING DDL MIGRATIONS: PHASE 21 -- PACKERS & MOVERS LOGISTICS")
    print("================================================================================")

    async with async_session_maker() as session:
        for idx, statement in enumerate(SQL_STATEMENTS, 1):
            stmt_clean = statement.strip()
            if not stmt_clean:
                continue
            print(f"Executing statement {idx}/{len(SQL_STATEMENTS)}...", flush=True)
            await session.execute(text(stmt_clean))
            await session.commit()

    await engine.dispose()
    print("\nAll Phase 21 DDL Migrations Applied Successfully!\n", flush=True)


if __name__ == "__main__":
    asyncio.run(run_migrations())
