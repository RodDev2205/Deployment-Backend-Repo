-- Add or modify status column on transaction_items table
-- This tracks whether each item is 'sold' or 'void'

-- First check if column exists, if not add it
ALTER TABLE transaction_items 
ADD COLUMN status ENUM('sold', 'void') NOT NULL DEFAULT 'sold' AFTER total;

-- If column already exists with wrong definition, uncomment and run this instead:
-- ALTER TABLE transaction_items MODIFY COLUMN status ENUM('sold', 'void') NOT NULL DEFAULT 'sold';

-- Update any existing transaction_items to have 'sold' status if they don't already have a status
UPDATE transaction_items 
SET status = 'sold' 
WHERE status IS NULL OR status = '';

-- Update items that belong to fully voided transactions to be marked as void
UPDATE transaction_items ti
INNER JOIN transactions t ON ti.transaction_id = t.transaction_id
SET ti.status = 'void'
WHERE t.status = 'Voided' AND ti.status = 'sold';

