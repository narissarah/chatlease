# Add PostgreSQL to Your Railway Project

Your deployment is failing because there's no database! Here's how to fix it:

## Quick Steps to Add PostgreSQL:

1. **Open your Railway project**: 
   https://railway.com/project/c2f5e41a-67ff-449b-ae35-a75461fff283

2. **Click the "+ New" button** (top right of your project)

3. **Select "Database"**

4. **Choose "PostgreSQL"**

5. Railway will automatically:
   - Create a PostgreSQL instance
   - Set all connection variables (PGHOST, PGPORT, etc.)
   - Connect it to your chatlease service

## After Adding PostgreSQL:

Your app will automatically:
1. Detect the database connection
2. Run migrations from `schema.sql`
3. Seed initial data
4. Start successfully!

## Verify It's Working:

Once PostgreSQL is added, run:
```bash
# Check if database variables are set
railway variables | grep PG

# Check deployment logs
railway logs

# Test your app
curl https://chatlease-production-a26c.up.railway.app/health
```

## Expected Result:

After adding PostgreSQL, you should see:
- Green deployment status
- Health endpoint returning: `{"status":"ok",...}`
- Your app running at: https://chatlease-production-a26c.up.railway.app

**That's it! Just add PostgreSQL and your app will work!**