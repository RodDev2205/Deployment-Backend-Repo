-- Migration to implement global ingredient system
-- Run this after backing up your database

-- 1. Create global ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(100) NOT NULL,
  quantity_per_unit DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  servings_per_unit INT NOT NULL DEFAULT 1,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create branch_inventory table (if not exists, or adjust existing)
-- Assuming old inventory table exists, we'll create branch_inventory separately
CREATE TABLE IF NOT EXISTS branch_inventory (
  inventory_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  stock_units DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_branch_ingredient (branch_id, ingredient_id),
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
);

-- 3. Update menu_inventory to reference global ingredients
-- First, backup old data if needed
-- ALTER TABLE menu_inventory ADD COLUMN ingredient_id INT AFTER inventory_id;

-- If menu_inventory doesn't exist, create it
CREATE TABLE IF NOT EXISTS menu_inventory (
  menu_inventory_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  servings_required DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
);

-- 4. Migrate data from old inventory to new structure (if applicable)
-- This assumes old inventory table has branch-specific data
-- INSERT INTO ingredients (item_name, quantity_per_unit, servings_per_unit, low_stock_threshold)
-- SELECT DISTINCT item_name, 1.00, servings_per_unit, low_stock_threshold FROM inventory;

-- Then insert into branch_inventory
-- INSERT INTO branch_inventory (branch_id, ingredient_id, stock_units)
-- SELECT i.branch_id, ing.ingredient_id, i.quantity
-- FROM inventory i
-- JOIN ingredients ing ON i.item_name = ing.item_name;

-- Update menu_inventory to use ingredient_id
-- UPDATE menu_inventory mi
-- JOIN inventory i ON mi.inventory_id = i.inventory_id
-- JOIN ingredients ing ON i.item_name = ing.item_name
-- SET mi.ingredient_id = ing.ingredient_id
-- WHERE mi.ingredient_id IS NULL;

-- After migration, you can drop old inventory table if no longer needed
-- DROP TABLE inventory;