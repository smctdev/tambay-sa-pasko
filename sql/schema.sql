-- Optional: the app creates this table automatically on first request.
CREATE TABLE IF NOT EXISTS guests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  table_number VARCHAR(50) NOT NULL,
  seat_number VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_guests_name (name),
  INDEX idx_guests_table (table_number)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Already have the table from before? Add the seat column:
-- ALTER TABLE guests ADD COLUMN seat_number VARCHAR(20) NULL AFTER table_number;
