-- Add contact_user_id column to branches table (if it doesn't already exist)
-- Note: If the column already exists, this migration is not needed
ALTER TABLE branches
ADD COLUMN contact_user_id INT DEFAULT NULL,
ADD CONSTRAINT fk_contact_user 
FOREIGN KEY (contact_user_id) 
REFERENCES users(user_id) ON DELETE SET NULL;

