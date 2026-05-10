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
2. Create a `.env` file in the repository root from `.env.example`.
3. Install backend dependencies:
   - `cd backend`
   - `npm install`
4. Configure MySQL credentials in `.env`.
5. Run SQL scripts in `database/` to set up tables and views.
6. Start the backend server: `npm start` from the `backend` folder.
7. Open `http://localhost:3000` in your browser.

## Deployment

- Set environment variables instead of using `.env` in production.
- Required values:
  - `PORT`
  - `DB_HOST`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`
  - `DB_CONNECTION_LIMIT`
- Deploy using the backend folder as the Node.js app root, or run `node backend/server.js` from the repository root.

## Features

- Product management (add, edit, delete)
- Expiry alerts and notifications
- Sales tracking and analytics
- User profile and preferences
- Secure login/logout
- Pie chart for sales by category

## Folder Structure

- `backend/` - Backend API server and Node.js app files
- `frontend/` - Static frontend HTML, CSS, JS files
- `database/` - SQL schema, initialization, and database config
