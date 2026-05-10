require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'coolventory',
    port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10
}).promise();

// User operations
async function getUserByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
}

// User authentication operations
async function createUser(email, password) {
    const userId = require('crypto').randomUUID();
    const [result] = await pool.query(
        'INSERT INTO users (user_id, email, password) VALUES (?, ?, ?)',
        [userId, email, password]
    );
    return { success: true, userId };
}

// Login function
async function loginUser(email, password) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ? AND password = ?',
            [email, password]
        );
        return rows[0];
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Product operations
async function getProductsByUserId(userId) {
    const [rows] = await pool.query(`
        SELECT *,
        DATE_FORMAT(expiry, '%Y-%m-%d') as formatted_expiry,
        DATEDIFF(expiry, CURRENT_DATE()) as days_until_expiry
        FROM products 
        WHERE user_id = ? 
        AND DATE(expiry) >= CURRENT_DATE()
        ORDER BY expiry ASC`,
        [userId]
    );
    return rows;
}

async function addProduct(userId, product) {
    const { barcode, name, category, quantity, unit, expiry } = product;
    const [result] = await pool.query(
        `INSERT INTO products (user_id, barcode, name, category, quantity, unit, expiry)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, barcode, name, category, quantity, unit, expiry]
    );

    if (result.affectedRows === 1) {
        return {
            success: true,
            message: 'Product added successfully',
            productId: result.insertId
        };
    }
    throw new Error('Failed to add product');
}

// Export functions
module.exports = {
    pool,
    getUserByEmail,
    createUser,
    loginUser,
    getProductsByUserId,
    addProduct
};
