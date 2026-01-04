-- Run this SQL in your Supabase SQL Editor to add the brand_settings column

ALTER TABLE upgrade_sections 
ADD COLUMN IF NOT EXISTS brand_settings JSONB;

-- This will add the brand_settings column to your upgrade_sections table
-- After running this, brand color changes will save and appear on the upgrade page

