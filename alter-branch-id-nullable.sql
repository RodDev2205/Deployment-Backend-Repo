-- Allow branch_id to be NULL for global products created by superadmin
ALTER TABLE products 
MODIFY COLUMN branch_id INT(11) NULL;
