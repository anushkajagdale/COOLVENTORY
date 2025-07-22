# Coolventory

## Project Description

- Inventory management system for cold storage and perishable products.
- User authentication and profile management.
- Add, update, delete products with expiry tracking.
- Expiry alerts and notifications for soon-to-expire and expired items.
- Sales management: sell products, record sales, and view sales history.
- Dashboard with analytics and pie chart for sales by category.
- User preferences: theme selection, profile photo upload.
- Responsive frontend with modern UI (HTML, CSS, JS).
- Backend API built with Node.js and Express.
- MySQL database with normalized schema and views.
- Secure endpoints with session-based authentication.
- Easy setup and deployment instructions.

## Setup Instructions

1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure database in `database/config.json`
4. Run SQL scripts in `database/` to set up tables and views.
5. Start the server: `node server.js`
6. Access the frontend in your browser.

## Features

- Product management (add, edit, delete)
- Expiry alerts and notifications
- Sales tracking and analytics
- User profile and preferences
- Secure login/logout
- Pie chart for sales by category

## Folder Structure

- `server.js` - Backend API server
- `database/` - SQL schema and config
- `refFE/` - Frontend HTML, CSS, JS files
