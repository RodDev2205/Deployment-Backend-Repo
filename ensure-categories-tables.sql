-- Migration: Ensure main_categories and sub_categories tables exist
-- This is for the inventory categorization feature

-- Create main_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS main_categories (
  main_category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create sub_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS sub_categories (
  sub_category_id INT AUTO_INCREMENT PRIMARY KEY,
  main_category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (main_category_id) REFERENCES main_categories(main_category_id) ON DELETE CASCADE,
  UNIQUE KEY unique_sub_category (main_category_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Create indexes for better query performance
ALTER TABLE sub_categories ADD INDEX idx_main_category_id (main_category_id);
