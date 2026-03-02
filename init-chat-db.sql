-- Chat Tables SQL Init Script
-- Run this on your MySQL database to create the chat schema

-- 1. Chat Rooms table (one per branch)
CREATE TABLE IF NOT EXISTS chat_rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE
);

-- 2. Chat Room Members (who is in which room)
CREATE TABLE IF NOT EXISTS chat_room_members (
  member_id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(room_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. Messages table
CREATE TABLE IF NOT EXISTS messages (
  message_id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  sender_id INT NOT NULL,
  message LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (room_id, created_at),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(room_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_messages_room ON messages(room_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_chat_room_members_user ON chat_room_members(user_id);
