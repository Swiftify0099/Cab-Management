-- ============================================================================
-- Supabase & PostgreSQL Migration Script: Driver App Features & Hubs
-- Tables: driver_fuel_expenses, driver_training_progress, driver_settlements
-- ============================================================================

-- 1. Create Driver Fuel Expenses Table
CREATE TABLE IF NOT EXISTS driver_fuel_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    liters NUMERIC(8, 2) NOT NULL,
    price_per_liter NUMERIC(8, 2) NOT NULL,
    total_cost NUMERIC(10, 2) NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    odometer_km INTEGER,
    fuel_type VARCHAR(50) DEFAULT 'petrol',
    notes TEXT,
    receipt_photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_driver_created 
ON driver_fuel_expenses(driver_id, created_at DESC);

-- 2. Create Driver Training & Certification Progress Table
CREATE TABLE IF NOT EXISTS driver_training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    module_id VARCHAR(100) NOT NULL,
    module_title VARCHAR(255),
    score INTEGER DEFAULT 100,
    is_completed BOOLEAN NOT NULL DEFAULT TRUE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(driver_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_training_driver 
ON driver_training_progress(driver_id);

-- 3. Ensure Driver Settlements Table Columns Exist
CREATE TABLE IF NOT EXISTS driver_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_label VARCHAR(50) NOT NULL,
    gross_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tds_deducted NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Processed',
    payout_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_driver_period 
ON driver_settlements(driver_id, period_start DESC);

-- 4. Ensure Vehicle Active Column Exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

-- 5. Row Level Security (RLS) Policies for Supabase
ALTER TABLE driver_fuel_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_settlements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view only their own records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'driver_fuel_expenses_driver_isolation'
    ) THEN
        CREATE POLICY driver_fuel_expenses_driver_isolation ON driver_fuel_expenses
        FOR ALL USING (
            driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'driver_training_driver_isolation'
    ) THEN
        CREATE POLICY driver_training_driver_isolation ON driver_training_progress
        FOR ALL USING (
            driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
        );
    END IF;
END $$;
