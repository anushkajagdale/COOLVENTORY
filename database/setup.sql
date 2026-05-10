ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password123';
FLUSH PRIVILEGES;
CREATE USER IF NOT EXISTS 'coolventory'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON coolventory.* TO 'coolventory'@'localhost';
FLUSH PRIVILEGES;

CREATE DATABASE IF NOT EXISTS coolventory;
USE coolventory;

-- Drop and recreate expiring_soon_view with correct conditions
DROP VIEW IF EXISTS expiring_soon_view;
CREATE VIEW expiring_soon_view AS
SELECT 
    p.*,
    DATEDIFF(p.expiry, CURDATE()) as days_remaining
FROM products p
WHERE p.expiry > CURDATE() 
AND DATEDIFF(p.expiry, CURDATE()) <= 7
AND p.product_id NOT IN (SELECT product_id FROM expired_items)
ORDER BY days_remaining ASC;

-- Ensure products table has required columns
CREATE TABLE IF NOT EXISTS products (
    product_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    barcode VARCHAR(50),
    name VARCHAR(255),
    category VARCHAR(50),
    quantity INT,
    unit VARCHAR(20),
    expiry DATE,
    user_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create expired_items table with barcode
CREATE TABLE IF NOT EXISTS expired_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36),
    barcode VARCHAR(50),
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Update expired products view to include barcode
CREATE OR REPLACE VIEW expired_products_view AS
SELECT 
    p.*,
    ei.barcode,
    ei.created_at as moved_to_expired_at,
    DATEDIFF(CURDATE(), p.expiry) as days_expired
FROM products p
LEFT JOIN expired_items ei ON p.product_id = ei.product_id
WHERE p.expiry < CURDATE();

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    sale_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36),
    quantity INT,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(36),
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create sales view
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
    p.name,
    p.category,
    SUM(s.quantity) as total_quantity,
    p.unit
FROM sales s
JOIN products p ON s.product_id = p.product_id
GROUP BY p.name, p.category, p.unit;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    auth_token VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
