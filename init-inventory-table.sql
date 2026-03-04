-- Create the inventory table with proper column definitions
-- This table stores menu items inventory tracked per branch

CREATE TABLE IF NOT EXISTS `inventory` (
  `inventory_id` INT AUTO_INCREMENT PRIMARY KEY,
  `branch_id` INT NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `servings_per_unit` DECIMAL(10,2) NOT NULL DEFAULT 1,
  `total_servings` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `low_stock_threshold` DECIMAL(10,2) NOT NULL DEFAULT 10,
  `status` ENUM('available', 'low_stock', 'out_of_stock') NOT NULL DEFAULT 'available',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
