-- Update branches table status enum to use 'active' and 'deactivate'
-- This migration changes the status column from ('Active','Closed','Suspended') to ('active','deactivate')

-- First update existing data to match new enum values
UPDATE branches SET status = 'active' WHERE status = 'Active';
UPDATE branches SET status = 'deactivate' WHERE status IN ('Closed', 'Suspended');

-- Then modify the column enum
ALTER TABLE branches MODIFY COLUMN status ENUM('active','deactivate') DEFAULT 'active';