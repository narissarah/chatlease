# ChatLease Real Centris Scraping System

## Overview

ChatLease now features a comprehensive real estate scraping system that fetches live data from Centris.ca, stores it in a PostgreSQL database, and provides automated scheduling with rate limiting and proxy rotation.

## 🚀 New Features

### Real Centris Scraping
- ✅ Live data extraction from Centris.ca
- ✅ Comprehensive property details (MLS, taxes, assessments, amenities)
- ✅ Property images and virtual tours
- ✅ Agent information and contact details

### PostgreSQL Database
- ✅ Persistent data storage with Railway integration
- ✅ Complete property history and analytics
- ✅ Optimized indexes for fast queries
- ✅ ACID compliance and data integrity

### Automated Scheduling
- ✅ Full scrape every 6 hours
- ✅ Incremental updates every hour
- ✅ Price updates every 30 minutes
- ✅ Automated cleanup and maintenance

### Rate Limiting & Proxy Rotation
- ✅ Intelligent request throttling
- ✅ Multiple proxy support with health monitoring
- ✅ Automatic failover and retry logic
- ✅ Daily request limits and monitoring

## 📋 Database Schema

### Core Tables
- **properties** - Main property listings with full Centris data
- **agents** - Real estate agent information
- **property_images** - Property photos and media
- **scraping_log** - Scraping activity and statistics
- **proxy_pool** - Proxy management and health tracking
- **rate_limit_log** - Request rate monitoring

### Analytics Tables
- **property_views** - User interaction tracking
- **favorites** - Saved properties
- **inquiries** - Property inquiries and leads

## 🔧 Setup Instructions

### 1. Database Setup (Railway)

1. Create a new PostgreSQL database on Railway
2. Copy the connection details to your environment variables:

```bash
# Railway automatically provides these
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=your-railway-host
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your-password
PGDATABASE=railway
```

### 2. Install Dependencies

```bash
npm install
```

New dependencies added:
- `pg` - PostgreSQL client
- `axios` - HTTP requests
- `cheerio` - HTML parsing
- `node-cron` - Scheduling
- `https-proxy-agent` - Proxy support
- `socks-proxy-agent` - SOCKS proxy support

### 3. Initialize Database

```bash
# Run database migration
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 4. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- Database connection details
- Proxy configuration
- Rate limiting settings
- Feature flags

### 5. Start the Application

```bash
# Development with auto-restart
npm run dev

# Production
npm start
```

## 🎛️ Admin API Endpoints

### Scraper Management
- `GET /api/admin/scraper-status` - Get scraping statistics
- `POST /api/admin/scrape/full` - Trigger full scrape
- `POST /api/admin/scrape/incremental` - Trigger incremental update
- `POST /api/admin/scrape/prices` - Update prices only

### Proxy Management
- `GET /api/admin/proxies` - List proxy pool status
- `POST /api/admin/proxies` - Add new proxy
- `DELETE /api/admin/proxies/:id` - Remove proxy

### Database Health
- `GET /api/admin/database-health` - Database status
- `GET /health` - Overall system health

## 📊 Monitoring & Analytics

### Scraping Statistics
- Properties found, new, updated, removed
- Execution times and success rates
- Error tracking and debugging
- Proxy performance metrics

### Database Metrics
- Active properties by type and area
- User engagement analytics
- Search patterns and trends
- Performance optimization insights

## 🛡️ Security & Compliance

### Rate Limiting
- 2-second intervals between requests
- Maximum 1000 requests per day
- Intelligent backoff on errors
- Proxy rotation for reliability

### Data Protection
- Secure database connections (SSL)
- No storage of personal user data
- Automated data cleanup
- GDPR-compliant data handling

## 🔄 Scheduled Operations

### Full Scrape (Every 6 hours)
- Complete property inventory refresh
- New listings discovery
- Agent information updates
- Image and media synchronization

### Incremental Updates (Every hour)
- Recent property changes
- Price adjustments
- Status updates (sold, withdrawn)
- Quick availability checks

### Price Updates (Every 30 minutes)
- Fast price-only updates
- Market trend tracking
- Investment opportunity alerts
- Competitive analysis data

### Maintenance (Daily at 2 AM)
- Remove inactive properties
- Clean up old logs
- Optimize database performance
- Update proxy health scores

## 🚨 Error Handling

### Automatic Recovery
- Proxy failover on errors
- Database connection retry
- Partial data recovery
- Graceful degradation

### Logging & Alerts
- Comprehensive error tracking
- Performance monitoring
- Health check endpoints
- Admin notification system

## 📈 Performance Optimization

### Database Indexes
- MLS number lookups
- Location-based searches
- Price range filtering
- Agent association queries

### Caching Strategy
- 5-minute API response caching
- Property image CDN integration
- Search result optimization
- Database query caching

### Scaling Considerations
- Horizontal database scaling
- Load balancer integration
- CDN for static assets
- Microservice architecture ready

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check Railway database status
   - Verify environment variables
   - Test connection string

2. **Scraping Errors**
   - Check proxy pool health
   - Review rate limiting settings
   - Verify Centris site changes

3. **Performance Issues**
   - Monitor database indexes
   - Check cache hit rates
   - Review query performance

### Debug Commands

```bash
# Check database health
curl localhost:3000/api/admin/database-health

# View scraper status
curl localhost:3000/api/admin/scraper-status

# Test proxy pool
curl localhost:3000/api/admin/proxies

# Manual scrape trigger
curl -X POST localhost:3000/api/admin/scrape/incremental
```

## 📝 API Changes

### Property Endpoints
- Enhanced filtering with 20+ options
- Real-time data from PostgreSQL
- Comprehensive property details
- Agent contact information

### New Features
- Mortgage calculator with CMHC insurance
- Borrowing capacity assessment
- Neighborhood statistics
- Investment analysis tools

## 🎯 Next Steps

1. **Deploy to Railway**
   - Configure environment variables
   - Set up automatic deployments
   - Monitor application health

2. **Add Real Proxies**
   - Integrate with proxy providers
   - Configure rotation schedules
   - Monitor success rates

3. **Enhance Scraping**
   - Add more property types
   - Implement image processing
   - Add multilingual support

4. **Performance Monitoring**
   - Set up application monitoring
   - Configure alerting
   - Optimize for scale

## 📞 Support

For technical support or questions:
- Check the troubleshooting section
- Review server logs
- Contact the development team

---

**Version 3.0.0** - Real Centris Scraping with PostgreSQL Persistence