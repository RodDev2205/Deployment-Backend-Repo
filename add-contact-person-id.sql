-- Add contact_person_id column to branches table
ALTER TABLE branches
ADD COLUMN contact_person_id INT DEFAULT NULL,
ADD CONSTRAINT fk_contact_person 
FOREIGN KEY (contact_person_id) 
REFERENCES users(user_id) ON DELETE SET NULL;
