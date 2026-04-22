-- Create branch_operating_period table
CREATE TABLE IF NOT EXISTS branch_operating_period (
  branch_op_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
  UNIQUE KEY unique_operating_period (branch_id, start_date)
);

-- Create branch_schedule table
CREATE TABLE IF NOT EXISTS branch_schedule (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  open_time TIME,
  close_time TIME,
  is_closed TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
  UNIQUE KEY unique_day_schedule (branch_id, day_of_week)
);

-- Create branch_closures table
CREATE TABLE IF NOT EXISTS branch_closures (
  closure_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE,
  INDEX idx_branch_dates (branch_id, start_date, end_date)
);

-- Create branch_break_times table (optional, for lunch/break periods)
CREATE TABLE IF NOT EXISTS branch_break_times (
  break_id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  break_start_time TIME NOT NULL,
  break_end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES branch_schedule(schedule_id) ON DELETE CASCADE
);
