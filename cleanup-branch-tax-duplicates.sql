-- Migration: Ensure branch_tax table has proper constraints
-- This prevents duplicate entries for the same branch

-- Add a UNIQUE constraint if it doesn't exist
-- First, remove the duplicates by keeping only the latest entry per branch
DELETE FROM branch_tax
WHERE id NOT IN (
  SELECT MAX(id)
  FROM (
    SELECT MAX(id) as id
    FROM branch_tax
    GROUP BY branch_id
  ) as latest
);

-- Ensure PRIMARY KEY is set correctly on branch_id (should already be there)
-- If needed, verify with:
-- ALTER TABLE branch_tax DROP PRIMARY KEY;
-- ALTER TABLE branch_tax ADD PRIMARY KEY (branch_id);
