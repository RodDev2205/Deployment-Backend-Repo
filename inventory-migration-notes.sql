-- Migration script to fix inventory table schema and data
-- This script handles existing data with empty status values

-- Step 1: Alter status column to ENUM type (run if status is currently VARCHAR/TEXT)
ALTER TABLE inventory MODIFY COLUMN status ENUM('available', 'low_stock', 'out_of_stock') NOT NULL DEFAULT 'available';

-- Step 2: Update empty status values based on quantity and low_stock_threshold
-- This matches the logic in inventoryController.js
-- Added inventory_id IS NOT NULL to satisfy MySQL safe mode
UPDATE inventory
SET status = CASE
  WHEN quantity = 0 THEN 'out_of_stock'
  WHEN quantity <= low_stock_threshold THEN 'low_stock'
  ELSE 'available'
END
WHERE (status = '' OR status IS NULL) AND inventory_id IS NOT NULL;

-- Verify the update
SELECT inventory_id, item_name, quantity, low_stock_threshold, status 
FROM inventory 
ORDER BY inventory_id;
