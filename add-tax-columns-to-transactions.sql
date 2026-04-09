-- Migration: Add tax columns to transactions table
-- Adds tax_rate and tax_amount columns for proper tax handling

ALTER TABLE `transactions`
ADD COLUMN `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Tax rate as percentage (e.g., 12.00 for 12%)',
ADD COLUMN `tax_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Calculated tax amount';

-- Update existing records to have tax_rate from branch_tax
UPDATE `transactions` t
JOIN `branch_tax` bt ON t.branch_id = bt.branch_id
SET t.tax_rate = bt.tax_rate;

-- Optional: Recalculate tax_amount for existing records if needed
-- This assumes subtotal exists and is correct
UPDATE `transactions`
SET tax_amount = ROUND(subtotal * (tax_rate / 100), 2)
WHERE subtotal > 0;