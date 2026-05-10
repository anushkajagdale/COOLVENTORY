-- First drop database if exists
DROP DATABASE IF EXISTS coolventory;

-- Create fresh database
CREATE DATABASE coolventory;
USE coolventory;

-- Drop all views first
DROP VIEW IF EXISTS expiring_soon;
DROP VIEW IF EXISTS expired_products;

-- Drop tables in correct dependency order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS expired_items;
DROP TABLE IF EXISTS expiry_notifications;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS userroles;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;
DROP TABLE IF EXISTS login_history;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- Drop and recreate users table with email field
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    user_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

-- Update sessions table structure
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    auth_token VARCHAR(255) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20),
    ip_address VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
    category_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    product_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    barcode VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(20),
    expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE KEY unique_barcode (barcode)
);

-- Insert default categories
INSERT INTO product_categories (name) VALUES 
('Dairy Products'),
('Frozen Foods'),
('Fresh Meat'),
('Seafood'),
('Ready-to-Eat Meals'),
('Deli Items'),
('Cold Beverages'),
('Desserts'),
('Fresh Produce'),
('Prepared Foods');

-- Create userroles table
CREATE TABLE IF NOT EXISTS userroles (
    role_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NULL,
    role_name VARCHAR(50) NOT NULL
);

-- Create sales table with user_id
CREATE TABLE IF NOT EXISTS sales (
    sale_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create expiry_notifications table
CREATE TABLE IF NOT EXISTS expiry_notifications (
    notification_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    notification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Create expired_items table
CREATE TABLE IF NOT EXISTS expired_items (
    expired_item_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    expiry_date DATE NOT NULL,
    removal_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Function to get or create user_id for email
DELIMITER //
CREATE FUNCTION IF NOT EXISTS get_user_id_by_email(email_param VARCHAR(100)) 
RETURNS VARCHAR(36)
DETERMINISTIC
BEGIN
    DECLARE existing_id VARCHAR(36);
    
    -- Check if email exists
    SELECT user_id INTO existing_id
    FROM users
    WHERE email = email_param
    LIMIT 1;
    
    -- Return existing or new UUID
    RETURN COALESCE(existing_id, UUID());
END //
DELIMITER ;

-- Remove all test user inserts and replace with roles setup
INSERT IGNORE INTO userroles (role_id, role_name) VALUES 
(UUID(), 'ADMIN'),
(UUID(), 'USER');

-- Create view for expiring products
CREATE OR REPLACE VIEW expiring_soon AS
SELECT p.*, 
    DATEDIFF(p.expiry, CURDATE()) as days_remaining
FROM products p
WHERE p.expiry > CURDATE()
AND DATEDIFF(p.expiry, CURDATE()) <= 7;

-- Create view for expired products
CREATE OR REPLACE VIEW expired_products AS
SELECT p.*, 
    ABS(DATEDIFF(p.expiry, CURDATE())) as days_expired
FROM products p
WHERE p.expiry <= CURDATE();
