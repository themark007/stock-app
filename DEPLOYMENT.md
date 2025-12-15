# Render Deployment Guide

## Prerequisites
- [Render Account](https://render.com) (Free tier available)
- PostgreSQL Database (Neon, Render PostgreSQL, or any PostgreSQL provider)
- GitHub repository with your code

## Backend Deployment

### Step 1: Create a Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `stock-app-backend`
   - **Region**: Choose closest to you
   - **Branch**: `mallik` (or your main branch)
   - **Root Directory**: `Backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Step 2: Set Environment Variables

Add these environment variables in the Render dashboard:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key_here
FRONTEND_URL=https://your-frontend-name.onrender.com
```

**Important**: 
- Get your `DATABASE_URL` from your PostgreSQL provider (e.g., Neon)
- Generate a secure `JWT_SECRET` (use a random string generator)
- You'll update `FRONTEND_URL` after deploying the frontend

### Step 3: Deploy Backend

Click **"Create Web Service"** and wait for deployment to complete.

Note your backend URL: `https://stock-app-backend.onrender.com`

---

## Frontend Deployment

### Step 1: Create a Static Site on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub repository
4. Configure the site:
   - **Name**: `stock-app-frontend`
   - **Branch**: `mallik` (or your main branch)
   - **Root Directory**: `Frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### Step 2: Set Environment Variables

Add these environment variables:

```
VITE_API_URL=https://your-backend-name.onrender.com/api
VITE_SOCKET_URL=https://your-backend-name.onrender.com
```

Replace `your-backend-name` with your actual backend service name from Step 1.

### Step 3: Deploy Frontend

Click **"Create Static Site"** and wait for deployment.

---

## Post-Deployment Steps

### 1. Update Backend FRONTEND_URL

Go back to your backend service on Render and update the `FRONTEND_URL` environment variable with your actual frontend URL:

```
FRONTEND_URL=https://your-frontend-name.onrender.com
```

This will trigger a redeployment of the backend.

### 2. Initialize Database

If your database is empty, you need to create the tables. You can:

**Option A: Use a database client**
Connect to your PostgreSQL database and run:

```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_latest_price (
    stock_id INTEGER PRIMARY KEY REFERENCES stocks(id) ON DELETE CASCADE,
    price DECIMAL(12, 2),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(user_id, stock_id)
);

-- Insert initial stocks
INSERT INTO stocks (ticker) VALUES
    ('GOOG'), ('TSLA'), ('AMZN'), ('META'), ('NVDA'),
    ('AAPL'), ('GOOGL'), ('MSFT'), ('NFLX')
ON CONFLICT (ticker) DO NOTHING;
```

**Option B: Create a setup endpoint (temporary)**
You can temporarily add a setup route to your backend that initializes the database.

### 3. Test Your Application

1. Visit your frontend URL: `https://your-frontend-name.onrender.com`
2. Create an account
3. Subscribe to stocks
4. Verify real-time price updates are working

---

## Troubleshooting

### Backend Issues

**"Application failed to respond"**
- Check backend logs in Render dashboard
- Verify `DATABASE_URL` is correct
- Ensure `PORT` is set to 3000

**"CORS Error"**
- Verify `FRONTEND_URL` matches your actual frontend URL
- Check that environment variables are set correctly

### Frontend Issues

**"Cannot connect to backend"**
- Verify `VITE_API_URL` and `VITE_SOCKET_URL` are correct
- Check if backend is running and healthy
- Look for errors in browser console (F12)

**"404 Not Found on page refresh"**
- This is handled by the `render.yaml` rewrite rule
- Ensure static site configuration includes the rewrite rule

### Database Issues

**"Connection timeout"**
- Check if your PostgreSQL database allows external connections
- Verify `DATABASE_URL` includes proper SSL settings
- For Neon: ensure connection string includes `?sslmode=require`

---

## Free Tier Limitations

Render free tier includes:
- 750 hours/month for web services (backend)
- Unlimited static site hosting (frontend)
- Backend sleeps after 15 minutes of inactivity (first request may be slow)

To keep backend active 24/7, consider:
- Upgrading to a paid plan ($7/month)
- Using a cron job service to ping your backend every 10 minutes

---

## Monitoring

- View logs: Render Dashboard → Your Service → Logs
- Check metrics: Render Dashboard → Your Service → Metrics
- Set up alerts: Render Dashboard → Your Service → Alerts

---

## Alternative: One-Click Deploy

If you want to deploy with a single click, you can use the `render.yaml` file:

1. Push your code to GitHub (including the `render.yaml` file)
2. Go to Render Dashboard
3. Click **"New +"** → **"Blueprint"**
4. Connect your repository
5. Render will automatically detect `render.yaml` and create all services

**Note**: You'll still need to set the environment variables manually after creation.

---

## Environment Variables Summary

### Backend
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
JWT_SECRET=your_random_secret_key_min_32_chars
FRONTEND_URL=https://your-frontend.onrender.com
```

### Frontend
```
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
```

---

## Support

For issues or questions:
- Check [Render Documentation](https://render.com/docs)
- Review application logs in Render dashboard
- Check browser console for frontend errors (F12)
