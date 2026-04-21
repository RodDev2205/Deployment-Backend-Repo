-- Create main_categories table
CREATE TABLE IF NOT EXISTS `main_categories` (
  `main_category_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create sub_categories table
CREATE TABLE IF NOT EXISTS `sub_categories` (
  `sub_category_id` INT AUTO_INCREMENT PRIMARY KEY,
  `main_category_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_sub_cat_per_main` (`main_category_id`, `name`),
  FOREIGN KEY (`main_category_id`) REFERENCES `main_categories`(`main_category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add category columns to inventory table if they don't exist
ALTER TABLE `inventory` 
ADD COLUMN `main_category_id` INT DEFAULT NULL AFTER `status`,
ADD COLUMN `sub_category_id` INT DEFAULT NULL AFTER `main_category_id`,
ADD FOREIGN KEY (`main_category_id`) REFERENCES `main_categories`(`main_category_id`) ON DELETE SET NULL,
ADD FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories`(`sub_category_id`) ON DELETE SET NULL;

-- Insert sample categories
INSERT INTO `main_categories` (`name`, `description`) VALUES
('Beverages', 'All types of drinks and beverages'),
('Appetizers', 'Starters and appetizers'),
('Main Course', 'Main dishes and entrees'),
('Desserts', 'Sweet treats and desserts'),
('Sides', 'Side dishes and accompaniments')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- Get the main_category_id values for inserting sub-categories
SET @beverages_id = (SELECT main_category_id FROM main_categories WHERE name = 'Beverages' LIMIT 1);
SET @appetizers_id = (SELECT main_category_id FROM main_categories WHERE name = 'Appetizers' LIMIT 1);
SET @main_id = (SELECT main_category_id FROM main_categories WHERE name = 'Main Course' LIMIT 1);
SET @desserts_id = (SELECT main_category_id FROM main_categories WHERE name = 'Desserts' LIMIT 1);
SET @sides_id = (SELECT main_category_id FROM main_categories WHERE name = 'Sides' LIMIT 1);

-- Insert sample sub-categories
INSERT INTO `sub_categories` (`main_category_id`, `name`, `description`) VALUES
(@beverages_id, 'Soft Drinks', 'Carbonated and non-carbonated soft drinks'),
(@beverages_id, 'Coffee & Tea', 'Hot and cold coffee and tea beverages'),
(@beverages_id, 'Juices', 'Fresh and packaged fruit juices'),
(@appetizers_id, 'Fried Items', 'Fried appetizers and snacks'),
(@appetizers_id, 'Grilled Items', 'Grilled appetizers'),
(@main_id, 'Filipino Dishes', 'Traditional Filipino main courses'),
(@main_id, 'Western Dishes', 'Western cuisine main courses'),
(@desserts_id, 'Cakes', 'Cake varieties'),
(@desserts_id, 'Pastries', 'Pastry items'),
(@sides_id, 'Rice Dishes', 'Rice-based side dishes'),
(@sides_id, 'Noodle Dishes', 'Noodle-based sides')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;
