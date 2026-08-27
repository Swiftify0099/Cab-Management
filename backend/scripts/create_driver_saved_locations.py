import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from common.database import engine

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS driver_saved_locations (
        id            UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
        driver_id     UUID             NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        location_type VARCHAR(20)      NOT NULL DEFAULT 'both',
        label         VARCHAR(100)     NOT NULL,
        address       VARCHAR(500)     NOT NULL,
        latitude      DOUBLE PRECISION NOT NULL,
        longitude     DOUBLE PRECISION NOT NULL,
        city          VARCHAR(100),
        state         VARCHAR(100),
        postal_code   VARCHAR(20),
        landmark      VARCHAR(200),
        is_default    BOOLEAN          NOT NULL DEFAULT FALSE,
        created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_dsl_driver ON driver_saved_locations (driver_id)",
    "CREATE INDEX IF NOT EXISTS idx_dsl_default ON driver_saved_locations (driver_id, is_default DESC, created_at DESC)",
    """
    CREATE OR REPLACE FUNCTION update_dsl_updated_at() RETURNS TRIGGER AS $f$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $f$ LANGUAGE plpgsql
    """,
    "DROP TRIGGER IF EXISTS trg_dsl_updated_at ON driver_saved_locations",
    """
    CREATE TRIGGER trg_dsl_updated_at BEFORE UPDATE ON driver_saved_locations
        FOR EACH ROW EXECUTE FUNCTION update_dsl_updated_at()
    """,
]

async def run():
    import sqlalchemy
    print("[Migration] Creating driver_saved_locations table...")
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(sqlalchemy.text(stmt.strip()))
            print(f"  OK: {stmt.strip()[:60]}...")
    print("[Migration] SUCCESS: driver_saved_locations created.")
    await engine.dispose()

asyncio.run(run())
