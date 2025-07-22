const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');

const connection = mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password
});

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`, (err) => {
    if (err) throw err;
    connection.changeUser({ database: config.database }, (err) => {
        if (err) throw err;
        connection.query(schema, (err) => {
            if (err) throw err;
            console.log('Database initialized successfully.');
            connection.end();
        });
    });
});
