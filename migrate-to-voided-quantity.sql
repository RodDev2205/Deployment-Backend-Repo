-- Quick migration: Add voided_quantity column to transaction_items
-- Run this in your MySQL database (phpMyAdmin or command line)

-- Add the voided_quantity column
ALTER TABLE transaction_items
ADD COLUMN voided_quantity INT NOT NULL DEFAULT 0 AFTER total;

-- Set existing voided transactions to have voided_quantity = quantity
UPDATE transaction_items ti
INNER JOIN transactions t ON ti.transaction_id = t.transaction_id
SET ti.voided_quantity = ti.quantity
WHERE t.status IN ('Voided', 'Partial Voided');

-- Optional: Remove old status column if it exists
-- ALTER TABLE transaction_items DROP COLUMN IF EXISTS status;

-- Verify the changes
SELECT transaction_id, menu_id, quantity, voided_quantity
FROM transaction_items
WHERE voided_quantity > 0
ORDER BY transaction_id DESC
LIMIT 5;