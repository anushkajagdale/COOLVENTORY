const mysql = require('mysql2');
const path = require('path');

// Read config
const config = require('./config.json');

const connection = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password
});

// Create database and tables
connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`, (err) => {
    if (err) {
        console.error('Error creating database:', err);
        return;
    }
    console.log('Database created successfully');

    connection.changeUser({ database: config.database }, (err) => {
        if (err) {
            console.error('Error switching to database:', err);
            return;
        }

        // Create users table (fix table name and columns)
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        connection.query(createUsersTable, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
            } else {
                console.log('users table created successfully');
            }
            connection.end();
        });
    });
});
