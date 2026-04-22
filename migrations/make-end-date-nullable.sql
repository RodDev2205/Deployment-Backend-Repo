-- Migration: Make end_date nullable in branch_operating_period table
-- This allows branches to have indefinite operating periods

-- Check current column definition
SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'branch_operating_period' AND COLUMN_NAME = 'end_date';

-- Alter the column to be nullable
ALTER TABLE branch_operating_period 
MODIFY COLUMN end_date DATE NULL;

-- Verify the change
SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'branch_operating_period' AND COLUMN_NAME = 'end_date';
