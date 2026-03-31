-- Recovery / password reset tables
-- Run this against your MySQL database to create required tables

CREATE TABLE IF NOT EXISTS `recovery_account` (
  `user_id` INT NOT NULL,
  `recovery_pin_hash` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_recovery_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `pass_reset_token_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) DEFAULT 0,
  INDEX (`token`),
  CONSTRAINT `fk_pass_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `password_otps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `code` VARCHAR(6) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`email`),
  INDEX (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `recovery_attempt` (
  `recovery_attempt_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `failed_attempts` INT DEFAULT 0,
  `lock_until` DATETIME NULL,
  `last_attempt_at` DATETIME NULL,
  UNIQUE KEY (`user_id`),
  CONSTRAINT `fk_recovery_attempt_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notes:
-- 1) Populate `recovery_account` with bcrypt-hashed 8-digit pins per user.
-- 2) The `password_reset_tokens.token` is stored as a hex string; it's short-lived and
--    returned to the frontend only so the client can pass it with the final reset request.
