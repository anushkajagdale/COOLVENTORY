const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const config = require('./database/config.json');

const app = express();
const port = 3000;

const connection = mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database
});

// API endpoint to fetch users
app.get('/api/users', (req, res) => {
    connection.query('SELECT * FROM Users', (err, results) => {
        if (err) {
            res.status(500).send('Error fetching users');
        } else {
            res.json(results);
        }
    });
});

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
