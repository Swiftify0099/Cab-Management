-- ============================================================
-- CabBooking Migration: Phase 6 — Full Matching Flow
-- Run against PostgreSQL with PostGIS extension enabled
-- ============================================================

-- 0. Ensure PostGIS is enabled
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ============================================================
-- 1. FIX: live_tracking — add UUID pk, new columns
-- (safe: uses ALTER with IF NOT EXISTS guards)
-- ============================================================

-- Add UUID primary key id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'id'
  ) THEN
    ALTER TABLE live_tracking ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
  END IF;
END $$;

-- Add driver_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'driver_id'
  ) THEN
    ALTER TABLE live_tracking ADD COLUMN driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS ix_live_tracking_driver_id ON live_tracking(driver_id);
  END IF;
END $$;

-- Add booking_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE live_tracking ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Rename accuracy → accuracy_m (backward-safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'accuracy'
  ) THEN
    ALTER TABLE live_tracking RENAME COLUMN accuracy TO accuracy_m;
  END IF;
END $$;

-- Add accuracy_m if doesn't exist at all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'accuracy_m'
  ) THEN
    ALTER TABLE live_tracking ADD COLUMN accuracy_m FLOAT DEFAULT 0.0;
  END IF;
END $$;

-- Add altitude_m
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'altitude_m'
  ) THEN
    ALTER TABLE live_tracking ADD COLUMN altitude_m FLOAT;
  END IF;
END $$;

-- Add eta_minutes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'eta_minutes'
  ) THEN
    ALTER TABLE live_tracking ADD COLUMN eta_minutes INTEGER;
  END IF;
END $$;

-- Add distance_remaining_km
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'distance_remaining_km'
  ) THEN
    ALTER TABLE live_tracking ADD COLUMN distance_remaining_km FLOAT;
  END IF;
END $$;

-- Add arrival_alert_sent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'arrival_alert_sent'
  ) THEN
    ALTER TABLE live_tracking ADD COLUMN arrival_alert_sent BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add recorded_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_tracking' AND column_name = 'recorded_at'
  ) THEN
    ALTER TABLE live_tracking ADD COLUMN recorded_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Make driver_location nullable (was NOT NULL before)
ALTER TABLE live_tracking ALTER COLUMN driver_location DROP NOT NULL;

-- Spatial index on driver_location
CREATE INDEX IF NOT EXISTS ix_live_tracking_location
    ON live_tracking USING GIST(driver_location);

-- ============================================================
-- 2. pending_bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS pending_bookings (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_name        VARCHAR(255) NOT NULL,

    -- Pickup (full address + coordinates + PostGIS point)
    pickup_address       TEXT NOT NULL,
    pickup_lat           FLOAT NOT NULL,
    pickup_lng           FLOAT NOT NULL,
    pickup_location      GEOGRAPHY(POINT, 4326),

    -- Destination
    destination_address  TEXT NOT NULL,
    destination_lat      FLOAT NOT NULL,
    destination_lng      FLOAT NOT NULL,
    destination_location GEOGRAPHY(POINT, 4326),

    -- Travel window
    travel_date          DATE NOT NULL,
    from_time            TIME NOT NULL,
    to_time              TIME NOT NULL,

    -- Preferences
    seats_required       INTEGER NOT NULL DEFAULT 1,
    parcel               BOOLEAN NOT NULL DEFAULT FALSE,
    women_only           BOOLEAN NOT NULL DEFAULT FALSE,  -- Women-Only safety filter

    -- Status lifecycle
    status               VARCHAR(20) NOT NULL DEFAULT 'waiting'
                             CHECK (status IN ('waiting','matched','cancelled','expired')),
    expires_at           TIMESTAMPTZ NOT NULL,

    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast geo-matching queries
CREATE INDEX IF NOT EXISTS ix_pending_bookings_customer_id  ON pending_bookings(customer_id);
CREATE INDEX IF NOT EXISTS ix_pending_bookings_status       ON pending_bookings(status);
CREATE INDEX IF NOT EXISTS ix_pending_bookings_travel_date  ON pending_bookings(travel_date);
CREATE INDEX IF NOT EXISTS ix_pending_bookings_expires_at   ON pending_bookings(expires_at);
CREATE INDEX IF NOT EXISTS ix_pending_bookings_pickup_geo
    ON pending_bookings USING GIST(pickup_location);
CREATE INDEX IF NOT EXISTS ix_pending_bookings_dest_geo
    ON pending_bookings USING GIST(destination_location);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pending_bookings_updated_at ON pending_bookings;
CREATE TRIGGER trg_pending_bookings_updated_at
    BEFORE UPDATE ON pending_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. driver_rejections (industry-standard DB-persisted reject-hide)
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_rejections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    pending_booking_id  UUID NOT NULL REFERENCES pending_bookings(id) ON DELETE CASCADE,
    booking_id          UUID REFERENCES bookings(id),          -- seat booking that was rejected
    rejected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (driver_id, pending_booking_id)                     -- idempotent
);

CREATE INDEX IF NOT EXISTS ix_driver_rejections_driver_id  ON driver_rejections(driver_id);
CREATE INDEX IF NOT EXISTS ix_driver_rejections_pb_id      ON driver_rejections(pending_booking_id);

-- ============================================================
-- 4. driver_point_wallets
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_point_wallets (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id  UUID NOT NULL UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
    balance    INTEGER NOT NULL DEFAULT 2500,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_driver_point_wallets_updated_at ON driver_point_wallets;
CREATE TRIGGER trg_driver_point_wallets_updated_at
    BEFORE UPDATE ON driver_point_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. driver_point_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_point_transactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id  UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    wallet_id  UUID NOT NULL REFERENCES driver_point_wallets(id),
    delta      INTEGER NOT NULL,              -- negative = debit
    reason     VARCHAR(255) NOT NULL,
    ref_id     UUID,                          -- booking_id
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_driver_pt_driver_id ON driver_point_transactions(driver_id);

-- ============================================================
-- 6. showrooms
-- ============================================================
CREATE TABLE IF NOT EXISTS showrooms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    brand       VARCHAR(100),
    address     TEXT NOT NULL,
    city        VARCHAR(100),
    state       VARCHAR(100),
    lat         FLOAT NOT NULL,
    lng         FLOAT NOT NULL,
    location    GEOGRAPHY(POINT, 4326),
    contact     VARCHAR(20),
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_showrooms_location ON showrooms USING GIST(location);

-- ============================================================
-- 7. Seed: Auto-expire job (PostgreSQL pg_cron - optional)
-- Uncomment if pg_cron is available
-- ============================================================
-- SELECT cron.schedule('expire-pending-bookings', '*/15 * * * *',
--   $$UPDATE pending_bookings SET status = 'expired'
--     WHERE status = 'waiting' AND expires_at < NOW()$$);

-- ============================================================
-- Verify
-- ============================================================
SELECT
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = t.tablename) AS column_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'live_tracking', 'pending_bookings', 'driver_rejections',
    'driver_point_wallets', 'driver_point_transactions', 'showrooms'
  )
ORDER BY tablename;
