-- Add voided_quantity column to transaction_items table
-- This tracks how many items were voided per transaction item

-- First check if voided_quantity column exists, if not add it
ALTER TABLE transaction_items
ADD COLUMN voided_quantity INT NOT NULL DEFAULT 0 AFTER total;

-- If column already exists with wrong definition, uncomment and run this instead:
-- ALTER TABLE transaction_items MODIFY COLUMN voided_quantity INT NOT NULL DEFAULT 0;

-- Remove the status column if it exists (we're replacing it with voided_quantity)
-- ALTER TABLE transaction_items DROP COLUMN status;

-- Set any problematic values to 0
UPDATE transaction_items
SET voided_quantity = 0
WHERE voided_quantity IS NULL OR voided_quantity < 0;

-- For existing voided transactions, set voided_quantity to quantity
UPDATE transaction_items ti
INNER JOIN transactions t ON ti.transaction_id = t.transaction_id
SET ti.voided_quantity = ti.quantity
WHERE t.status IN ('Voided', 'Partial Voided') AND ti.voided_quantity = 0;

