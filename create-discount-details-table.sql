-- Create discount_details table for storing senior/PWD discount verification details
CREATE TABLE IF NOT EXISTS discount_details (
  discount_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  id_number VARCHAR(50) NOT NULL,
  discount_type ENUM('senior', 'pwd') NOT NULL,
  transaction_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX idx_discount_details_transaction_id ON discount_details(transaction_id);
CREATE INDEX idx_discount_details_id_number ON discount_details(id_number);