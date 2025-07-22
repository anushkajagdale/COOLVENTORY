const express = require('express');
const app = express();
const cors = require('cors');
const mysql = require('mysql2/promise');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('refFE'));

// Update database configuration with password
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',  // Use the password you set when logging in to MySQL
    database: 'coolventory',
    waitForConnections: true,
    connectionLimit: 10
};

// Create connection pool with better error handling
let pool;

async function initializeDatabase() {
    try {
        // First try to connect to MySQL server
        pool = mysql.createPool({
            ...dbConfig,
            database: null  // Don't specify database yet
        });

        // Create database if it doesn't exist
        await pool.query('CREATE DATABASE IF NOT EXISTS coolventory');

        // Close initial pool
        await pool.end();

        // Create new pool with database selected
        pool = mysql.createPool(dbConfig);

        const connection = await pool.getConnection();
        console.log('Connected to database successfully');
        connection.release();

        return true;
    } catch (error) {
        console.error('Database connection error:', error.message);
        console.log('\nTo fix:');
        console.log('1. Verify MySQL is running');
        console.log('2. Check password in dbConfig matches your MySQL password');
        console.log('3. Run these commands in MySQL:');
        console.log('   CREATE DATABASE coolventory;');
        console.log('   USE coolventory;');
        process.exit(1);
    }
}

// Add error handling for database
pool?.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
        console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
        console.error('Database connection was refused.');
    }
});

// Update query executor
async function executeQuery(sql, params = []) {
    try {
        const [results] = await pool.execute(sql, params);
        return [results];
    } catch (error) {
        console.error('Query error:', error.message);
        console.error('SQL:', sql);
        console.error('Parameters:', params);
        throw error;
    }
}

// Keep only ONE authenticateToken function near the top of the file
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    executeQuery('SELECT * FROM sessions WHERE auth_token = ? AND is_active = true', [token])
        .then(([rows]) => {
            if (!rows.length) {
                return res.status(401).json({ success: false, message: 'Invalid token' });
            }
            req.user = rows[0];
            next();
        })
        .catch(error => {
            console.error('Auth error:', error);
            res.status(500).json({ success: false, message: 'Authentication failed' });
        });
};

async function initDatabase() {
    try {
        // Create tables without dropping existing ones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
                username VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                session_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
                user_id VARCHAR(36) NOT NULL,
                auth_token VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                product_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
                user_id VARCHAR(36) NOT NULL,
                name VARCHAR(100) NOT NULL,
                barcode VARCHAR(50) NOT NULL UNIQUE,
                category VARCHAR(50) NOT NULL,
                brand VARCHAR(100) NOT NULL,
                quantity INT NOT NULL DEFAULT 0,
                unit VARCHAR(20) NOT NULL,
                expiry DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS expired_items (
                id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
                product_id VARCHAR(36),
                expiry_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sales (
                sale_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
                product_id VARCHAR(36) NOT NULL,
                quantity INT NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            )
        `);

        console.log('Database tables initialized/verified');
    } catch (error) {
        console.error('Database initialization error:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

// Add UUID generation function
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// API Routes

// Update login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);

        // First check if user exists with complete user data
        let [existingUsers] = await executeQuery(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        let userId;
        if (existingUsers.length === 0) {
            // Auto-create account if email doesn't exist
            await executeQuery(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [email, email, password]
            );

            [existingUsers] = await executeQuery(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
        }

        userId = existingUsers[0].user_id;
        console.log('User ID:', userId);

        // Create new session
        const authToken = generateUUID();
        await executeQuery(
            'UPDATE sessions SET is_active = false WHERE user_id = ?',
            [userId]
        );

        await executeQuery(
            'INSERT INTO sessions (user_id, auth_token, is_active) VALUES (?, ?, true)',
            [userId, authToken]
        );

        // Get user's existing products with detailed info
        const [products] = await executeQuery(`
            SELECT 
                p.*,
                DATEDIFF(p.expiry, CURDATE()) as days_to_expiry,
                CASE 
                    WHEN p.expiry < CURDATE() THEN 'expired'
                    WHEN DATEDIFF(p.expiry, CURDATE()) <= 7 THEN 'expiring_soon'
                    ELSE 'ok'
                END as status
            FROM products p
            WHERE p.user_id = ?
            ORDER BY 
                CASE 
                    WHEN p.expiry < CURDATE() THEN 0
                    WHEN DATEDIFF(p.expiry, CURDATE()) <= 7 THEN 1
                    ELSE 2
                END,
                p.expiry ASC`,
            [userId]
        );

        console.log(`Found ${products.length} products for user ${email}`);

        res.json({
            success: true,
            message: existingUsers.length === 0 ? 'Account created and logged in' : 'Welcome back!',
            token: authToken,
            user: {
                userId,
                email,
                username: existingUsers[0].username,
                existingProducts: products.map(p => ({
                    ...p,
                    isExpiringSoon: p.days_to_expiry <= 7 && p.days_to_expiry >= 0,
                    isExpired: p.days_to_expiry < 0
                }))
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed: ' + error.message
        });
    }
});

// Update products endpoint to filter by user_id
app.get('/api/products', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Get user_id from active session
        const [sessions] = await executeQuery(
            'SELECT s.user_id, u.email FROM sessions s JOIN users u ON s.user_id = u.user_id WHERE s.auth_token = ? AND s.is_active = true',
            [token]
        );

        if (!sessions.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session'
            });
        }

        const userId = sessions[0].user_id;
        console.log('Fetching products for user:', userId, sessions[0].email);

        // Get all user's products with detailed info
        const [products] = await executeQuery(`
            SELECT 
                p.*,
                DATEDIFF(p.expiry, CURDATE()) as days_to_expiry,
                CASE 
                    WHEN p.expiry < CURDATE() THEN 'expired'
                    WHEN DATEDIFF(p.expiry, CURDATE()) <= 7 THEN 'expiring_soon'
                    ELSE 'ok'
                END as status
            FROM products p
            WHERE p.user_id = ?
            ORDER BY 
                CASE 
                    WHEN p.expiry < CURDATE() THEN 0
                    WHEN DATEDIFF(p.expiry, CURDATE()) <= 7 THEN 1
                    ELSE 2
                END,
                p.expiry ASC`,
            [userId]
        );

        console.log(`Found ${products.length} products for user ${sessions[0].email}`);

        res.json({
            success: true,
            products: products.map(p => ({
                ...p,
                isExpiringSoon: p.days_to_expiry <= 7 && p.days_to_expiry >= 0,
                isExpired: p.days_to_expiry < 0
            }))
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await executeQuery('SELECT * FROM product_categories');
        res.json({ success: true, categories });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
});

// Add brands endpoint
app.get('/api/brands', async (req, res) => {
    try {
        const [brands] = await executeQuery('SELECT * FROM brands ORDER BY name');
        res.json({ success: true, brands });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch brands' });
    }
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        console.log('Signup request:', { username, email });

        // Validate input
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, password and confirm password are required'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password and confirm password do not match'
            });
        }

        // Only block if username or email already exists in DB
        const [existingUser] = await executeQuery(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username or email already registered'
            });
        }

        // Insert new user
        await executeQuery(
            'INSERT INTO users (user_id, username, email, password) VALUES (UUID(), ?, ?, ?)',
            [username, email, password]
        );

        console.log('User registered successfully');
        res.json({
            success: true,
            message: 'Registration successful'
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: error.code === 'ER_DUP_ENTRY' ? 'Email or username already exists' : 'Registration failed'
        });
    }
});

// Update expired products endpoint
app.get('/api/expired-products', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (!sessions.length) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const userId = sessions[0].user_id;

        // Get expired products and insert into expired_items
        const [expiredProducts] = await executeQuery(
            `SELECT * FROM products 
             WHERE user_id = ? AND expiry < CURDATE()`,
            [userId]
        );

        // Insert expired products into expired_items
        for (const product of expiredProducts) {
            await executeQuery(
                `INSERT IGNORE INTO expired_items (product_id, expiry_date) 
                 VALUES (?, ?)`,
                [product.product_id, product.expiry]
            );
        }

        res.json({ success: true, products: expiredProducts });
    } catch (error) {
        console.error('Error fetching expired products:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expired products' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    let connection;
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const productId = req.params.id;

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (!sessions.length) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        // First delete from expired_items
        await connection.query(
            'DELETE FROM expired_items WHERE product_id = ?',
            [productId]
        );

        // Then delete from sales
        await connection.query(
            'DELETE FROM sales WHERE product_id = ?',
            [productId]
        );

        // Finally delete the product
        await connection.query(
            'DELETE FROM products WHERE product_id = ? AND user_id = ?',
            [productId, sessions[0].user_id]
        );

        await connection.commit();
        res.json({ success: true, message: 'Product removed successfully' });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error removing product:', error);
        res.status(500).json({ success: false, message: 'Failed to remove product' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Add expired items endpoint
app.post('/api/expired-items', async (req, res) => {
    try {
        const { productId, expiryDate } = req.body;
        await executeQuery(
            'INSERT INTO expired_items (product_id, expiry_date) VALUES (?, ?)',
            [productId, expiryDate]
        );
        res.json({
            success: true,
            message: 'Product added to expired items successfully'
        });
    } catch (error) {
        console.error('Error adding to expired items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add to expired items'
        });
    }
});

// Add soon-to-expire products endpoint
app.get('/api/soon-to-expire', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const [[session]] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (!session) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const [products] = await executeQuery(`
            SELECT * FROM products 
            WHERE user_id = ? 
            AND expiry > CURDATE()
            AND expiry <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            ORDER BY expiry ASC`,
            [session.user_id]
        );

        res.json({ success: true, products });
    } catch (error) {
        console.error('Error fetching soon-to-expire products:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
});

// Add endpoint for expiring products
app.get('/api/products/expiring-soon', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (!sessions.length) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const userId = sessions[0].user_id;

        const [products] = await executeQuery(
            `SELECT * FROM expiring_soon_view WHERE user_id = ?`,
            [userId]
        );

        res.json({
            success: true,
            products: products
        });
    } catch (error) {
        console.error('Error fetching expiring products:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expiring products' });
    }
});

// Add endpoint for expiring soon products
app.get('/api/products/expiring-soon', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (!sessions.length) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const userId = sessions[0].user_id;

        // Get products expiring soon
        const [products] = await executeQuery(
            `SELECT * FROM expiring_soon_view WHERE user_id = ? ORDER BY days_remaining ASC`,
            [userId]
        );

        console.log('Expiring soon products:', products); // Debug log

        res.json({
            success: true,
            products: products
        });
    } catch (error) {
        console.error('Error fetching expiring products:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expiring products' });
    }
});

// Add user profile endpoint
app.get('/api/user-profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const [[session]] = await executeQuery(
            `SELECT u.*, up.theme, up.notifications_enabled 
             FROM users u 
             JOIN sessions s ON u.user_id = s.user_id 
             LEFT JOIN user_preferences up ON u.user_id = up.user_id 
             WHERE s.auth_token = ? AND s.is_active = true`,
            [token]
        );

        if (!session) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        res.json({
            success: true,
            user: {
                username: session.username,
                email: session.email,
                theme: session.theme || 'light',
                notificationsEnabled: session.notifications_enabled || true
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
});

// Add profile endpoints
app.get('/api/user-profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const [sessions] = await executeQuery(
            'SELECT u.* FROM users u JOIN sessions s ON u.user_id = s.user_id WHERE s.auth_token = ? AND s.is_active = true',
            [token]
        );

        if (sessions.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const user = sessions[0];
        res.json({
            success: true,
            user: {
                email: user.email,
                displayName: user.display_name,
                profileImage: user.profile_image
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
});

app.post('/api/update-profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const { displayName, theme } = req.body;

        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (sessions.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        await executeQuery(
            'UPDATE users SET display_name = ?, theme = ? WHERE user_id = ?',
            [displayName, theme, sessions[0].user_id]
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Add theme preference endpoint
app.post('/api/update-theme', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const { theme } = req.body;

        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (sessions.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        await executeQuery(
            'UPDATE user_preferences SET theme = ? WHERE user_id = ?',
            [theme, sessions[0].user_id]
        );

        res.json({ success: true, message: 'Theme updated successfully' });
    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).json({ success: false, message: 'Failed to update theme' });
    }
});

// Product sell endpoint records sale in sales table
// /api/sales endpoint returns all sales for the user
app.post('/api/products/sell', async (req, res) => {
    let connection;
    try {
        const { productId, quantity } = req.body;
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Get user_id from session
        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (!sessions.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session'
            });
        }

        const userId = sessions[0].user_id;

        // Get product details and lock the row
        const [products] = await connection.query(
            'SELECT * FROM products WHERE product_id = ? AND user_id = ? FOR UPDATE',
            [productId, userId]
        );

        if (!products.length) {
            throw new Error('Product not found or does not belong to user');
        }

        const product = products[0];
        const newQuantity = product.quantity - quantity;

        if (newQuantity < 0) {
            throw new Error('Insufficient quantity');
        }

        // Record the sale with all details
        await connection.query(
            `INSERT INTO sales 
            (sale_id, product_id, user_id, barcode, product_name, category, quantity, unit, sale_date)
            VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                productId,
                userId,
                product.barcode,
                product.name,
                product.category,
                quantity,
                product.unit
            ]
        );

        if (newQuantity === 0) {
            // Delete the product when quantity reaches 0
            await connection.query(
                'DELETE FROM products WHERE product_id = ? AND user_id = ?',
                [productId, userId]
            );
        } else {
            await connection.query(
                'UPDATE products SET quantity = ? WHERE product_id = ? AND user_id = ?',
                [newQuantity, productId, userId]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: newQuantity === 0 ? 'Product sold and removed' : 'Product sold successfully',
            remainingQuantity: newQuantity,
            removed: newQuantity === 0
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error selling product:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to sell product'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Fix in /api/sales endpoint (already returns p.category AS product_category):
app.get('/api/sales', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        // Get user_id from session
        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (!sessions.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session'
            });
        }

        const userId = sessions[0].user_id;

        // Get sales with product details, prefer sales.barcode/category if present, else fallback to products
        const [sales] = await executeQuery(`
            SELECT 
                s.sale_id,
                COALESCE(s.barcode, p.barcode) AS barcode,
                COALESCE(s.category, p.category) AS category,
                s.product_name,
                s.quantity,
                s.unit,
                s.sale_date
            FROM sales s
            LEFT JOIN products p ON s.product_id = p.product_id
            WHERE s.user_id = ?
            ORDER BY s.sale_date DESC
        `, [userId]);

        res.json({ success: true, sales });
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales data'
        });
    }
});

// Fix in /api/sales/analytics endpoint:
app.get('/api/sales/analytics', authenticateToken, async (req, res) => {
    try {
        // Get total sales and items
        const [summary] = await executeQuery(`
            SELECT 
                COUNT(*) as totalSales,
                SUM(s.quantity) as totalItems,
                (SELECT p.category
                 FROM sales s
                 JOIN products p ON s.product_id = p.product_id
                 GROUP BY p.category
                 ORDER BY SUM(s.quantity) DESC
                 LIMIT 1) as topCategory
            FROM sales s
        `);

        // Get sales by category
        const [categoryData] = await executeQuery(`
            SELECT 
                p.category,
                SUM(s.quantity) as total
            FROM sales s
            JOIN products p ON s.product_id = p.product_id
            GROUP BY p.category
            ORDER BY total DESC
        `);

        // Get daily sales trend
        const [trendData] = await executeQuery(`
            SELECT 
                DATE(s.created_at) as sale_date,
                COUNT(*) as total_sales
            FROM sales s
            GROUP BY DATE(s.created_at)
            ORDER BY sale_date DESC
            LIMIT 7
        `);

        // Get recent sales
        const [recentSales] = await executeQuery(`
            SELECT 
                s.sale_id,
                p.name,
                p.category,
                s.quantity,
                p.unit,
                s.created_at as sale_date
            FROM sales s
            JOIN products p ON s.product_id = p.product_id
            ORDER BY s.created_at DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            summary: {
                totalSales: summary[0].totalSales,
                totalItems: summary[0].totalItems,
                topCategory: summary[0].topCategory
            },
            categoryData: {
                labels: categoryData.map(c => c.category),
                values: categoryData.map(c => c.total)
            },
            trendData: {
                dates: trendData.map(d => d.sale_date.toLocaleDateString()),
                values: trendData.map(d => d.total_sales)
            },
            recentSales
        });
    } catch (error) {
        console.error('Error fetching sales analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales analytics'
        });
    }
});

// Fix product addition endpoint
app.post('/api/products', async (req, res) => {
    try {
        console.log("Received product request:", req.body);

        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        // Get user_id from session
        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );

        if (!sessions.length) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const userId = sessions[0].user_id;
        const { name, barcode, category, quantity, unit, expiry } = req.body;

        // Check for existing barcode
        const [existingProducts] = await executeQuery(
            'SELECT * FROM products WHERE barcode = ?',
            [barcode]
        );

        if (existingProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'This barcode already exists in the system'
            });
        }

        // Validate required fields
        if (!name || !barcode || !category || !quantity || !unit || !expiry) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                received: req.body
            });
        }

        // Insert the product
        const [result] = await executeQuery(
            `INSERT INTO products 
            (product_id, user_id, name, barcode, category, brand, quantity, unit, expiry) 
            VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, name, barcode, category, 'Generic', quantity, unit, expiry]
        );

        console.log("Product added:", result);

        res.status(201).json({
            success: true,
            message: 'Product added successfully',
            productId: result.insertId
        });

    } catch (error) {
        console.error('Error adding product:', error);

        // Handle duplicate barcode error specifically
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'This barcode is already registered in the system'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to add product',
            error: error.message
        });
    }
});

// Add endpoint to return total sold, expired, and remaining products
app.get('/api/products/counts', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        // Get user_id from session
        const [sessions] = await executeQuery(
            'SELECT user_id FROM sessions WHERE auth_token = ? AND is_active = true',
            [token]
        );
        if (!sessions.length) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }
        const userId = sessions[0].user_id;

        // Count sold products
        const [soldRows] = await executeQuery(
            'SELECT SUM(quantity) AS total_sold FROM sales WHERE user_id = ?',
            [userId]
        );
        const totalSold = soldRows[0].total_sold || 0;

        // Count expired products
        const [expiredRows] = await executeQuery(
            'SELECT COUNT(*) AS total_expired FROM expired_items WHERE user_id = ?',
            [userId]
        );
        const totalExpired = expiredRows[0].total_expired || 0;

        // Count remaining products
        const [remainingRows] = await executeQuery(
            'SELECT COUNT(*) AS total_remaining FROM products WHERE user_id = ?',
            [userId]
        );
        const totalRemaining = remainingRows[0].total_remaining || 0;

        res.json({
            success: true,
            counts: {
                totalSold,
                totalExpired,
                totalRemaining
            }
        });
    } catch (error) {
        console.error('Error fetching product counts:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch product counts' });
    }
});

// Update server startup
async function startServer() {
    await initializeDatabase();
    await initDatabase();

    app.listen(3000, () => {
        console.log('Server running at http://localhost:3000');
    });
}

startServer();