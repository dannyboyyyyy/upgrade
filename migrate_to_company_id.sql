-- Migration script to update upgrade_sections table for multi-tenant isolation
-- Run this in your Supabase SQL Editor

-- Step 1: Add company_id column if it doesn't exist
ALTER TABLE upgrade_sections 
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Step 2: Create index on company_id for performance
CREATE INDEX IF NOT EXISTS idx_upgrade_sections_company_id ON upgrade_sections(company_id);

-- Step 3: Set company_id to unique constraint (ensures one row per company)
-- First, drop existing unique constraint on owner_id if it exists
ALTER TABLE upgrade_sections 
DROP CONSTRAINT IF EXISTS upgrade_sections_owner_id_key;

ALTER TABLE upgrade_sections 
DROP CONSTRAINT IF EXISTS upgrade_sections_pkey;

-- Add unique constraint on company_id
ALTER TABLE upgrade_sections 
ADD CONSTRAINT upgrade_sections_company_id_key UNIQUE (company_id);

-- Step 4: Set company_id as primary key (optional, but recommended for multi-tenant)
-- If you want to keep an auto-increment id, you can skip this step
-- ALTER TABLE upgrade_sections 
-- ADD PRIMARY KEY (company_id);

-- Step 5: For existing data migration (if you have data with owner_id = "whop-app")
-- Update existing rows to use company_id from owner_id
-- NOTE: This assumes you only have test data. For production, you'll need to map
-- owner_id values to actual Whop company_id values.
-- UPDATE upgrade_sections 
-- SET company_id = owner_id 
-- WHERE company_id IS NULL;

-- IMPORTANT: After migration, remove owner_id column if no longer needed
-- ALTER TABLE upgrade_sections DROP COLUMN IF EXISTS owner_id;

