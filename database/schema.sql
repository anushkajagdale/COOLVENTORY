CREATE DATABASE IF NOT EXISTS coolventory;
USE coolventory;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in correct dependency order
DROP TABLE IF EXISTS expiring_soon;
DROP TABLE IF EXISTS expiry_notifications;
DROP TABLE IF EXISTS deleted_products;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS expired_items;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS user_preferences;

SET FOREIGN_KEY_CHECKS = 1;

-- Create tables in order of dependencies
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_name VARCHAR(100),
    profile_image VARCHAR(255),
    theme VARCHAR(20) DEFAULT 'light' -- Add this line
);

CREATE TABLE IF NOT EXISTS products (
    product_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(64),
    category VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit VARCHAR(50) NOT NULL,
    expiry DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expired_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    barcode VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit VARCHAR(50) NOT NULL,
    expiry_date DATETIME NOT NULL,
    marked_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales (
    sale_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    barcode VARCHAR(64),
    product_name VARCHAR(255),
    category VARCHAR(255),
    quantity INT NOT NULL,
    unit VARCHAR(50),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Ensure this column exists
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS deleted_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    barcode VARCHAR(64),
    name VARCHAR(255),
    category VARCHAR(255),
    quantity INT,
    unit VARCHAR(50),
    expiry_date DATETIME,
    reason ENUM('SOLD', 'EXPIRED', 'MANUAL', 'DUMP') NOT NULL,
    deletion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS expiry_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    barcode VARCHAR(64),
    name VARCHAR(255),
    category VARCHAR(255),
    expiry_date DATETIME,
    days_until_expiry INT,
    status ENUM('PENDING', 'NOTIFIED', 'EXPIRED') DEFAULT 'PENDING',
    notification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS expiring_soon (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(36),
    barcode VARCHAR(255),
    name VARCHAR(255),
    category VARCHAR(100),
    quantity INT,
    unit VARCHAR(50),
    expiry_date DATE,
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    auth_token VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(36) PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Add relationships between tables
CREATE TABLE IF NOT EXISTS expired_products AS
SELECT 
    p.product_id,
    p.barcode,
    p.name,
    p.category,
    p.quantity,
    p.unit,
    p.expiry,
    DATEDIFF(CURDATE(), p.expiry) as days_expired
FROM products p
WHERE p.expiry < CURDATE();

-- Add foreign key relationships
ALTER TABLE sales
ADD FOREIGN KEY (product_id) REFERENCES products(product_id);

-- Create expiring_soon_view for products expiring within 7 days
CREATE OR REPLACE VIEW expiring_soon_view AS
SELECT 
    p.*,
    DATEDIFF(p.expiry, CURDATE()) as days_remaining
FROM products p
WHERE p.expiry > CURDATE()
  AND DATEDIFF(p.expiry, CURDATE()) <= 7;
