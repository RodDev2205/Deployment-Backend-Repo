-- Add status column to transaction_items table
-- This tracks whether each item is 'sold' or 'void'

ALTER TABLE transaction_items 
ADD COLUMN status ENUM('sold', 'void') NOT NULL DEFAULT 'sold' AFTER total;

-- Update any existing rows to have 'sold' status if they're part of completed transactions
UPDATE transaction_items ti
INNER JOIN transactions t ON ti.transaction_id = t.transaction_id
SET ti.status = CASE 
  WHEN t.status = 'Voided' THEN 'void'
  WHEN t.status = 'Partial Voided' THEN 'void'
  ELSE 'sold'
END
WHERE ti.status = 'sold';
