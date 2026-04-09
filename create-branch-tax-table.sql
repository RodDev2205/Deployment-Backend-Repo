-- Migration: Create branch_tax table
-- This table stores tax rates for each branch

CREATE TABLE IF NOT EXISTS `branch_tax` (
  `branch_id` int(11) NOT NULL,
  `tax_rate` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Tax rate as percentage (e.g., 12.00 for 12%)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`branch_id`),
  CONSTRAINT `fk_branch_tax_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default tax rates for ALL branches (including newly created ones)
INSERT IGNORE INTO `branch_tax` (`branch_id`, `tax_rate`)
SELECT `branch_id`, 0.00 FROM `branches`;