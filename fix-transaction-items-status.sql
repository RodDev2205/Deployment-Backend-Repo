-- Comprehensive migration for transaction_items status column
-- Run this script in your MySQL database to fix the void issue

-- Step 1: Check if status column exists and has correct definition
-- If it doesn't exist, add it
ALTER TABLE transaction_items 
ADD COLUMN IF NOT EXISTS status ENUM('sold', 'void') NOT NULL DEFAULT 'sold' AFTER total;

-- Step 2: If the column exists but with wrong definition, modify it
-- (This handles the case where the column might have been created differently)
-- Uncomment the line below if you're getting truncation errors
-- ALTER TABLE transaction_items MODIFY COLUMN status ENUM('sold', 'void') NOT NULL DEFAULT 'sold';

-- Step 3: Set default values for any NULL or empty status
UPDATE transaction_items 
SET status = 'sold' 
WHERE status IS NULL OR status = '' OR status NOT IN ('sold', 'void');

-- Step 4: Verify the column exists and has correct values
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'transaction_items' AND COLUMN_NAME = 'status';

-- Step 5: Show sample data to verify
SELECT transaction_id, menu_id, quantity, status 
FROM transaction_items 
ORDER BY transaction_id DESC 
LIMIT 10;
