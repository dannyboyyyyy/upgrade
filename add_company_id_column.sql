-- Quick migration: Add company_id column to upgrade_sections table
-- Run this in your Supabase SQL Editor

-- Step 1: Add company_id column (allows NULL initially for migration)
ALTER TABLE upgrade_sections 
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_upgrade_sections_company_id ON upgrade_sections(company_id);

-- Step 3: Make company_id unique (allows one config per company)
-- Remove old owner_id unique constraint if it exists
ALTER TABLE upgrade_sections 
DROP CONSTRAINT IF EXISTS upgrade_sections_owner_id_key;

-- Add unique constraint on company_id
ALTER TABLE upgrade_sections 
ADD CONSTRAINT upgrade_sections_company_id_key UNIQUE (company_id);

-- Step 4: (Optional) Migrate existing data
-- If you have existing data with owner_id = "whop-app", you can map it to actual company_ids
-- UPDATE upgrade_sections 
-- SET company_id = '<actual-company-id>' 
-- WHERE company_id IS NULL AND owner_id = 'whop-app';

