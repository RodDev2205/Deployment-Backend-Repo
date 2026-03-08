-- Comprehensive migration for transaction_items voided_quantity column
-- Run this script in your MySQL database to implement quantity-based void tracking

-- Step 1: Add voided_quantity column if it doesn't exist
ALTER TABLE transaction_items
ADD COLUMN IF NOT EXISTS voided_quantity INT NOT NULL DEFAULT 0 AFTER total;

-- Step 2: If the column exists but with wrong definition, modify it
-- (This handles the case where the column might have been created differently)
-- ALTER TABLE transaction_items MODIFY COLUMN voided_quantity INT NOT NULL DEFAULT 0;

-- Step 3: Remove the old status column if it exists
-- ALTER TABLE transaction_items DROP COLUMN IF EXISTS status;

-- Step 4: Set default values for any NULL or negative voided_quantity
UPDATE transaction_items
SET voided_quantity = 0
WHERE voided_quantity IS NULL OR voided_quantity < 0;

-- Step 5: For existing voided transactions, set voided_quantity to quantity
UPDATE transaction_items ti
INNER JOIN transactions t ON ti.transaction_id = t.transaction_id
SET ti.voided_quantity = ti.quantity
WHERE t.status IN ('Voided', 'Partial Voided') AND ti.voided_quantity = 0;

-- Step 6: Verify the column exists and has correct values
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'transaction_items' AND COLUMN_NAME = 'voided_quantity';

-- Step 7: Show sample data to verify
SELECT transaction_id, menu_id, quantity, voided_quantity, price,
       (quantity - voided_quantity) as sold_quantity,
       ((quantity - voided_quantity) * price) as sold_amount
FROM transaction_items
ORDER BY transaction_id DESC
LIMIT 10;
