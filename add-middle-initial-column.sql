-- Migration: Add middle_initial column to users table
-- This adds support for middle initial/middle name in user profiles

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS middle_initial VARCHAR(10) NULL AFTER first_name;

-- Optional: You can populate it from existing full_name data if needed
-- Update the logic based on how names are stored in your database
