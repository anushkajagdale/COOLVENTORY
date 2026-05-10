# Coolventory Deployment Guide

## Pre-Deployment Checklist

- [x] Environment variables configured via `.env`
- [x] Database connection pooling set up
- [x] Frontend static files served from backend
- [x] Date calculations fixed (timezone-aware)
- [x] Error handling in place
- [x] Responsive design verified

## Local Development

```bash
cd backend
npm install
npm run dev  # Uses nodemon for auto-restart
```

Then open `http://localhost:3000`

## Deployment Steps

### 1. Prepare Environment

Copy `.env.example` to `.env` and set production values:

```env
PORT=3000
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DB_NAME=coolventory
DB_CONNECTION_LIMIT=20
NODE_ENV=production
```

### 2. Install Dependencies

From the project root or `backend/` folder:

```bash
cd backend
npm install --production
```

### 3. Set Up MySQL Database

Run the SQL setup scripts:

```bash
mysql -u root -p coolventory < ../database/schema.sql
mysql -u root -p coolventory < ../database/setup.sql
mysql -u root -p coolventory < ../database/init.sql
```

Or manually:
1. Create the database: `CREATE DATABASE coolventory;`
2. Create tables using the scripts in `database/`

### 4. Start the Server

**Using Node.js directly:**
```bash
cd backend
npm start
```

**Using a process manager (recommended for production):**

#### PM2
```bash
npm install -g pm2
pm2 start backend/server.js --name "coolventory"
pm2 save
pm2 startup
```

#### Docker (optional)
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
WORKDIR /app/backend
RUN npm install --production
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t coolventory .
docker run -p 3000:3000 --env-file .env coolventory
```

### 5. Reverse Proxy (Nginx/Apache)

**Nginx example:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. SSL/TLS (Recommended)

Use Let's Encrypt:
```bash
certbot certonly --webroot -w /var/www/html -d your-domain.com
```

Then configure Nginx with the certificates.

## Deployment Platforms

### Heroku
```bash
git init
heroku create coolventory-app
heroku addons:create cleardb:ignite
git push heroku main
```

### AWS/Azure/GCP
- Use managed database services (RDS, Cloud SQL, etc.)
- Deploy backend using App Service, Elastic Beanstalk, or Cloud Run
- Set environment variables in the platform's configuration
- Configure domain and SSL/TLS

### DigitalOcean
- Create a Droplet
- Install Node.js and MySQL
- Clone repository
- Set up PM2 and Nginx
- Configure firewall rules

## Production Recommendations

1. **Environment Security**
   - Use `.env` for local dev only
   - Use platform secrets/environment variables for production
   - Rotate database passwords regularly

2. **Database**
   - Use managed database services for easier backups
   - Enable automatic backups
   - Use read replicas for scaling

3. **Monitoring & Logging**
   - Set up error tracking (Sentry, Rollbar)
   - Monitor server logs
   - Track application metrics

4. **Performance**
   - Enable caching headers
   - Use a CDN for static assets
   - Set up database connection pooling (already enabled)

5. **Security**
   - Enable HTTPS/SSL
   - Set security headers
   - Rate limiting on API endpoints
   - Regular security audits

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check `.env` credentials
- Verify database user has correct permissions
- Check firewall rules allow database access

### Port Already in Use
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Frontend Not Loading
- Verify static assets are in `frontend/` folder
- Check `server.js` is serving from correct path
- Clear browser cache

## Support

For issues, check:
- Server logs: `pm2 logs`
- Browser console: F12 > Console
- Network tab: F12 > Network
- MySQL error log: `/var/log/mysql/error.log`
