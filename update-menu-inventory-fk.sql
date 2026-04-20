-- Migration to update menu_inventory foreign key to reference inventory table instead of ingredients
-- Run this after backing up your database

-- 1. Drop the existing foreign key constraint
ALTER TABLE menu_inventory DROP FOREIGN KEY fk_menu_inventory_ingredient;

-- 2. Update the foreign key constraint to reference inventory.inventory_id
ALTER TABLE menu_inventory
ADD CONSTRAINT fk_menu_inventory_inventory
FOREIGN KEY (ingredient_id) REFERENCES inventory(inventory_id) ON DELETE CASCADE;

-- 3. Verify the constraint was updated
SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'menu_inventory' AND REFERENCED_TABLE_NAME IS NOT NULL;