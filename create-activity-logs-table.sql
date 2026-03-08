-- Create activity_logs table if it doesn't exist
-- Run this on your database to enable activity logging

CREATE TABLE IF NOT EXISTS `activity_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `activity_type` varchar(100) NOT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  KEY `branch_id` (`branch_id`),
  KEY `activity_type` (`activity_type`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `activity_logs_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add some sample data for testing (optional)
-- INSERT INTO activity_logs (user_id, branch_id, activity_type, description) VALUES
-- (1, 1, 'test', 'Test activity log entry');