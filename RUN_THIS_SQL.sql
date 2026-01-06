-- ============================================
-- MIGRATION: Add company_id column
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Step 1: Add company_id column
ALTER TABLE upgrade_sections 
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_upgrade_sections_company_id ON upgrade_sections(company_id);

-- Step 3: Remove old owner_id unique constraint (if exists)
ALTER TABLE upgrade_sections 
DROP CONSTRAINT IF EXISTS upgrade_sections_owner_id_key;

-- Step 4: Add unique constraint on company_id
ALTER TABLE upgrade_sections 
ADD CONSTRAINT upgrade_sections_company_id_key UNIQUE (company_id);

-- Done! The company_id column is now ready to use.

