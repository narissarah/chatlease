# ChatLease Railway Deployment Guide

## 🚀 Deployment Status

✅ **DEPLOYED SUCCESSFULLY**

**Live URL:** https://chatlease-production-a26c.up.railway.app

## 📋 Deployment Summary

### ✅ Completed Setup
- **Railway Project Created:** chatlease
- **PostgreSQL Database:** Auto-provisioned by Railway
- **Application Deployed:** With automatic startup script
- **Domain Generated:** chatlease-production-a26c.up.railway.app
- **Health Check:** Available at `/health` endpoint

### 🏗️ Architecture
- **Frontend:** Static files served from `client/public/`
- **Backend:** Node.js/Express server with PostgreSQL
- **Database:** Railway PostgreSQL with automatic connection
- **Scraping:** Real Centris scraper with scheduling
- **Proxy Management:** Configurable proxy pool

## 🔧 Configuration

### Environment Variables (Auto-configured by Railway)
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` - Database credentials
- `PORT` - Application port (3000)
- `NODE_ENV` - Environment (production)

### Automatic Startup Process
1. **Database Connection Check** - Verifies PostgreSQL connection
2. **Database Migration** - Creates schema automatically
3. **Database Seeding** - Adds sample data if empty
4. **Proxy Pool Initialization** - Sets up proxy configuration
5. **Server Startup** - Starts the main application

## 📊 Available Endpoints

### Public Endpoints
- **Home:** https://chatlease-production-a26c.up.railway.app
- **Health Check:** https://chatlease-production-a26c.up.railway.app/health
- **API Properties:** https://chatlease-production-a26c.up.railway.app/api/properties

### Admin Endpoints
- **Scraper Status:** `/api/admin/scraper-status`
- **Trigger Full Scrape:** `POST /api/admin/scrape/full`
- **Trigger Incremental:** `POST /api/admin/scrape/incremental`
- **Proxy Management:** `/api/admin/proxies`
- **Database Health:** `/api/admin/database-health`

## 🕷️ Scraping Configuration

### Current Setup
- **Scraper:** Real Centris scraper (ready to use)
- **Proxy Pool:** Basic free proxies for testing
- **Rate Limiting:** 2 seconds between requests
- **Scheduling:** 
  - Full scrape: Every 6 hours
  - Incremental: Every hour
  - Price updates: Every 30 minutes

### Proxy Providers (Production Ready)
For production use, configure premium proxies in `server/config/proxy-providers.js`:

#### Recommended Providers:
1. **Bright Data** (Premium) - $500+/month
2. **Smartproxy** (Affordable) - $75+/month  
3. **Oxylabs** (Residential) - $300+/month

## 📈 Monitoring

### Health Checks
```bash
# Overall system health
curl https://chatlease-production-a26c.up.railway.app/health

# Database health
curl https://chatlease-production-a26c.up.railway.app/api/admin/database-health

# Scraper status
curl https://chatlease-production-a26c.up.railway.app/api/admin/scraper-status
```

### Logs
Railway provides automatic log collection:
- Application logs
- Database logs
- Deployment logs
- Error tracking

## 🔄 Manual Operations

### Trigger Scraping
```bash
# Full scrape (all properties)
curl -X POST https://chatlease-production-a26c.up.railway.app/api/admin/scrape/full

# Incremental update
curl -X POST https://chatlease-production-a26c.up.railway.app/api/admin/scrape/incremental

# Price updates only
curl -X POST https://chatlease-production-a26c.up.railway.app/api/admin/scrape/prices
```

### Database Operations
```bash
# Check database health
curl https://chatlease-production-a26c.up.railway.app/api/admin/database-health

# View proxy pool
curl https://chatlease-production-a26c.up.railway.app/api/admin/proxies
```

## 🛠️ Maintenance

### Database Maintenance
- **Automatic Cleanup:** Daily at 2 AM
- **Old Data Removal:** 30+ days old
- **Log Rotation:** Keep last 100 entries
- **Performance Optimization:** Automatic

### Proxy Management
- **Health Monitoring:** Every 15 minutes
- **Automatic Failover:** On proxy failure
- **Success Rate Tracking:** Performance metrics
- **Load Balancing:** Round-robin rotation

## 🔒 Security

### Current Security Measures
- **SSL/TLS:** Automatic HTTPS by Railway
- **Database:** SSL-encrypted connections
- **Rate Limiting:** Request throttling
- **Proxy Rotation:** IP address anonymization
- **Input Validation:** Sanitized API inputs

### Security Best Practices
- No sensitive data in logs
- Secure database connections
- Proxy authentication
- Regular security updates

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database health
curl https://chatlease-production-a26c.up.railway.app/api/admin/database-health

# Check Railway database status in dashboard
# Restart service if needed
```

#### 2. Scraping Not Working
```bash
# Check scraper status
curl https://chatlease-production-a26c.up.railway.app/api/admin/scraper-status

# Check proxy pool
curl https://chatlease-production-a26c.up.railway.app/api/admin/proxies

# Trigger manual scrape
curl -X POST https://chatlease-production-a26c.up.railway.app/api/admin/scrape/incremental
```

#### 3. Performance Issues
- Check Railway metrics dashboard
- Monitor database query performance
- Review proxy success rates
- Check memory and CPU usage

### Support Resources
- **Railway Dashboard:** https://railway.com/project/c2f5e41a-67ff-449b-ae35-a75461fff283
- **Application Logs:** Available in Railway dashboard
- **Health Endpoint:** Real-time status monitoring

## 📞 Next Steps

### For Production Enhancement:
1. **Configure Premium Proxies** - Add real proxy providers
2. **Monitor Performance** - Set up alerting
3. **Scale Database** - Upgrade if needed
4. **Add Custom Domain** - Point your domain to Railway
5. **Enable Monitoring** - Set up uptime monitoring

### For Development:
1. **Local Development** - Use `npm run dev`
2. **Database Access** - Connect to Railway database locally
3. **Testing** - Use test endpoints
4. **Debugging** - Check logs in Railway dashboard

---

**🎉 Your ChatLease application is now live and ready to scrape real estate data from Centris!**

**Live URL:** https://chatlease-production-a26c.up.railway.app