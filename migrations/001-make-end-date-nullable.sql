-- Migration: Make end_date nullable in branch_operating_period table
-- Date: 2026-04-22
-- Purpose: Allow branches to have indefinite operating periods

-- Display current column definition before changes
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  IS_NULLABLE,
  COLUMN_TYPE,
  COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'branch_operating_period' AND COLUMN_NAME = 'end_date';

-- Alter the column to be nullable
ALTER TABLE branch_operating_period 
MODIFY COLUMN end_date DATE NULL;

-- Display the updated column definition
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  IS_NULLABLE,
  COLUMN_TYPE,
  COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'branch_operating_period' AND COLUMN_NAME = 'end_date';

-- Show table structure
DESC branch_operating_period;
