-- Migration: Ensure branch_tax table has proper constraints
-- This prevents duplicate entries for the same branch and makes branch_id unique

-- Remove any malformed rows without a branch_id
DELETE FROM branch_tax
WHERE branch_id IS NULL;

-- Remove duplicate tax rows for the same branch, keeping the latest entry by id
DELETE t1
FROM branch_tax t1
JOIN branch_tax t2
  ON t1.branch_id = t2.branch_id
  AND t1.id < t2.id;

-- Enforce uniqueness on branch_id so ON DUPLICATE KEY UPDATE works correctly
ALTER TABLE branch_tax
  MODIFY branch_id INT NOT NULL,
  MODIFY tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  ADD UNIQUE KEY uniq_branch_id (branch_id);
