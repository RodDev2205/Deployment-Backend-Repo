-- Migration: Apply after deployment to add columns that the app expects
-- This migration adds first_name, last_name, and contact_number columns to users table
-- if they don't already exist

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NULL AFTER full_name,
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20) NULL AFTER branch_id;

-- Optional: populate first/last from existing full_name (split on first space)
UPDATE users
SET first_name = TRIM(SUBSTRING_INDEX(full_name, ' ', 1)),
    last_name = TRIM(SUBSTRING_INDEX(full_name, ' ', -1))
WHERE (first_name IS NULL OR first_name = '') AND full_name IS NOT NULL;

-- Verify the columns exist
DESCRIBE users;