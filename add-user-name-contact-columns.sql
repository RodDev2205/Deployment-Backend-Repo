-- Migration: add first_name, last_name, contact_number to users table
-- Run this on the database once (or include in your deployment script)

ALTER TABLE users
  ADD COLUMN first_name VARCHAR(100) NULL AFTER full_name,
  ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN contact_number VARCHAR(20) NULL AFTER branch_id;

-- Optional: populate first/last from existing full_name (split on first space)
UPDATE users
SET first_name = TRIM(SUBSTRING_INDEX(full_name, ' ', 1)),
    last_name = TRIM(SUBSTRING_INDEX(full_name, ' ', -1));

-- If you no longer need full_name, you can drop or keep it for compatibility
-- ALTER TABLE users DROP COLUMN full_name;
