/* Drop existing sales table if needed */
DROP TABLE IF EXISTS sales;

/* Recreate sales table with user_id column */
CREATE TABLE sales (
    sale_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

/* If the table already exists, add the created_at column if it's missing */
ALTER TABLE sales
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
