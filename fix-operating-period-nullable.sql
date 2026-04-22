-- Fix branch_operating_period table to allow nullable end_date
-- This allows branches to have indefinite operating periods

ALTER TABLE branch_operating_period 
MODIFY COLUMN end_date DATE NULL;

-- Verify the change
SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'branch_operating_period' AND COLUMN_NAME = 'end_date';
