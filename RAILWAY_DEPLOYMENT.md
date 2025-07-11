# Railway Deployment Guide for ChatLease

## Why Deployment Failed

Your Railway deployment failed because:

1. **No Service Linked**: The Railway project exists but isn't linked to a service
2. **Missing Environment Variables**: PostgreSQL connection variables weren't set
3. **Database Connection Failed**: The app couldn't connect to Railway's PostgreSQL

## Quick Fix Steps

### 1. Link Railway Service

```bash
cd /Users/narissaranamkhan/Documents/Coding\ Projects/chatlease
railway link
```

Select your project and service when prompted.

### 2. Verify PostgreSQL Database

Railway should automatically provision a PostgreSQL database. Check if it exists:
- Go to https://railway.app/dashboard
- Open your project
- You should see a PostgreSQL service

If not, add PostgreSQL:
1. Click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set connection variables

### 3. Deploy with Automatic Setup

```bash
# Use our setup script
./railway-setup.sh

# Or deploy directly
railway up
```

### 4. Monitor Deployment

```bash
# Watch deployment logs
railway logs -f

# Check deployment status
railway status

# Get your app URL
railway domain
```

## Environment Variables (Auto-Set by Railway)

Railway automatically provides these PostgreSQL variables:
- `DATABASE_URL` - Full connection string
- `PGHOST` - Database host
- `PGPORT` - Database port (usually 5432)
- `PGUSER` - Database username
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name

## What Happens on Deployment

1. **Start Script** (`scripts/start.js`):
   - Checks database connection
   - Runs migrations automatically
   - Seeds initial data if empty
   - Initializes proxy pool
   - Starts Express server

2. **Database Setup**:
   - Creates all tables from `schema.sql`
   - Adds sample agents
   - Sets up indexes for performance

3. **Health Check**:
   - Available at `/health`
   - Shows database status
   - Shows scraper status

## Troubleshooting

### "No service could be found"
```bash
railway link
# Select your project and service
```

### Database Connection Errors
1. Check Railway dashboard for PostgreSQL service
2. Verify environment variables:
   ```bash
   railway variables
   ```

### Build Failures
Check `nixpacks.toml` - it should have:
```toml
[providers]
postgres = true
```

### Still Having Issues?

1. Check deployment logs:
   ```bash
   railway logs
   ```

2. Verify local setup works:
   ```bash
   npm install
   npm run dev
   ```

3. Ensure you're in production branch:
   ```bash
   git branch
   git push origin main
   ```

## Success Indicators

When deployment succeeds, you'll see:
```
✅ Database connection verified
✅ Database migrations completed  
✅ All initialization steps completed
🚀 Server listening on port 3000
```

Your app will be available at the Railway-provided URL!