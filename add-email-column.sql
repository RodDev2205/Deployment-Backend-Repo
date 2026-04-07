-- Migration: add email column to users table
ALTER TABLE users
ADD COLUMN email VARCHAR(255) NULL AFTER contact_number;

-- Optional: Update existing users with a default email if needed
-- UPDATE users SET email = CONCAT(username, '@example.com') WHERE email IS NULL;