/**
 * Centris Scraper Scheduler
 * Manages automatic data refresh and scraping tasks
 */

const cron = require('node-cron');
const RealCentrisScraper = require('../scrapers/real-centris-scraper');

class ScraperScheduler {
  constructor(database) {
    this.db = database;
    this.scraper = new RealCentrisScraper(database);
    this.isRunning = false;
    this.currentJob = null;
    this.schedules = new Map();
    
    this.initializeSchedules();
  }

  initializeSchedules() {
    console.log('📅 Initializing scraping schedules...');
    
    // Full scrape - Every 6 hours
    this.schedules.set('full-scrape', cron.schedule('0 */6 * * *', async () => {
      await this.runFullScrape();
    }, {
      scheduled: false,
      timezone: 'America/Montreal'
    }));

    // Incremental scrape - Every hour
    this.schedules.set('incremental-scrape', cron.schedule('0 * * * *', async () => {
      await this.runIncrementalScrape();
    }, {
      scheduled: false,
      timezone: 'America/Montreal'
    }));

    // Price updates - Every 30 minutes
    this.schedules.set('price-updates', cron.schedule('*/30 * * * *', async () => {
      await this.runPriceUpdates();
    }, {
      scheduled: false,
      timezone: 'America/Montreal'
    }));

    // Cleanup old data - Daily at 2 AM
    this.schedules.set('cleanup', cron.schedule('0 2 * * *', async () => {
      await this.runCleanup();
    }, {
      scheduled: false,
      timezone: 'America/Montreal'
    }));

    // Proxy health check - Every 15 minutes
    this.schedules.set('proxy-health', cron.schedule('*/15 * * * *', async () => {
      await this.runProxyHealthCheck();
    }, {
      scheduled: false,
      timezone: 'America/Montreal'
    }));

    console.log('✅ Scraping schedules initialized');
  }

  startScheduler() {
    if (this.isRunning) {
      console.log('⚠️  Scheduler already running');
      return;
    }

    console.log('🚀 Starting scraper scheduler...');
    this.isRunning = true;
    
    // Start all schedules
    this.schedules.forEach((schedule, name) => {
      schedule.start();
      console.log(`✅ ${name} schedule started`);
    });

    // Run initial scrape
    setTimeout(() => {
      this.runIncrementalScrape();
    }, 5000);
  }

  stopScheduler() {
    console.log('🛑 Stopping scraper scheduler...');
    this.isRunning = false;
    
    this.schedules.forEach((schedule, name) => {
      schedule.stop();
      console.log(`❌ ${name} schedule stopped`);
    });
  }

  async runFullScrape() {
    if (this.currentJob) {
      console.log('⚠️  Another scraping job is already running');
      return;
    }

    console.log('🔄 Starting full scrape...');
    const startTime = Date.now();
    
    try {
      this.currentJob = 'full-scrape';
      const sessionId = await this.db.logScrapeSession('full', 'started');
      
      const stats = {
        found: 0,
        new: 0,
        updated: 0,
        removed: 0
      };

      // Scrape rental properties
      console.log('🏠 Scraping rental properties...');
      const rentalProperties = await this.scraper.searchProperties({
        listingType: 'rental',
        limit: 100
      });

      for (const property of rentalProperties) {
        const result = await this.saveProperty(property);
        stats.found++;
        if (result.isNew) stats.new++;
        if (result.isUpdated) stats.updated++;
      }

      // Scrape purchase properties
      console.log('🏘️  Scraping purchase properties...');
      const purchaseProperties = await this.scraper.searchProperties({
        listingType: 'purchase',
        limit: 100
      });

      for (const property of purchaseProperties) {
        const result = await this.saveProperty(property);
        stats.found++;
        if (result.isNew) stats.new++;
        if (result.isUpdated) stats.updated++;
      }

      // Mark stale properties as inactive
      stats.removed = await this.markStaleProperties();

      const executionTime = Math.round((Date.now() - startTime) / 1000);
      await this.db.updateScrapeSession(sessionId, 'completed', { ...stats, executionTime });
      
      console.log(`✅ Full scrape completed in ${executionTime}s`);
      console.log(`📊 Stats: ${stats.found} found, ${stats.new} new, ${stats.updated} updated, ${stats.removed} removed`);
      
    } catch (error) {
      console.error('❌ Full scrape failed:', error.message);
      
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      await this.db.updateScrapeSession(sessionId, 'failed', { 
        error: error.message, 
        executionTime 
      });
    } finally {
      this.currentJob = null;
    }
  }

  async runIncrementalScrape() {
    if (this.currentJob) {
      console.log('⚠️  Another scraping job is already running');
      return;
    }

    console.log('🔄 Starting incremental scrape...');
    const startTime = Date.now();
    
    try {
      this.currentJob = 'incremental-scrape';
      const sessionId = await this.db.logScrapeSession('incremental', 'started');
      
      const stats = {
        found: 0,
        new: 0,
        updated: 0,
        removed: 0
      };

      // Get recent properties (last 7 days)
      const recentProperties = await this.scraper.searchProperties({
        listingType: 'rental',
        limit: 50
      });

      for (const property of recentProperties) {
        const result = await this.saveProperty(property);
        stats.found++;
        if (result.isNew) stats.new++;
        if (result.isUpdated) stats.updated++;
      }

      const executionTime = Math.round((Date.now() - startTime) / 1000);
      await this.db.updateScrapeSession(sessionId, 'completed', { ...stats, executionTime });
      
      console.log(`✅ Incremental scrape completed in ${executionTime}s`);
      console.log(`📊 Stats: ${stats.found} found, ${stats.new} new, ${stats.updated} updated`);
      
    } catch (error) {
      console.error('❌ Incremental scrape failed:', error.message);
      
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      await this.db.updateScrapeSession(sessionId, 'failed', { 
        error: error.message, 
        executionTime 
      });
    } finally {
      this.currentJob = null;
    }
  }

  async runPriceUpdates() {
    if (this.currentJob) {
      console.log('⚠️  Another scraping job is already running');
      return;
    }

    console.log('💰 Starting price updates...');
    const startTime = Date.now();
    
    try {
      this.currentJob = 'price-updates';
      const sessionId = await this.db.logScrapeSession('price_update', 'started');
      
      // Get properties that need price updates (updated > 1 day ago)
      const stalePriceProperties = await this.db.query(`
        SELECT centris_id, mls_number 
        FROM properties 
        WHERE status = 'active' 
        AND (last_scraped_at < NOW() - INTERVAL '1 day' OR last_scraped_at IS NULL)
        ORDER BY last_scraped_at ASC NULLS FIRST
        LIMIT 50
      `);

      const stats = { found: 0, updated: 0 };

      for (const property of stalePriceProperties.rows) {
        try {
          const updatedProperty = await this.scraper.getPropertyDetails(property.centris_id);
          if (updatedProperty) {
            await this.saveProperty(updatedProperty);
            stats.found++;
            stats.updated++;
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Error updating property ${property.mls_number}:`, error.message);
        }
      }

      const executionTime = Math.round((Date.now() - startTime) / 1000);
      await this.db.updateScrapeSession(sessionId, 'completed', { ...stats, executionTime });
      
      console.log(`✅ Price updates completed in ${executionTime}s`);
      console.log(`📊 Stats: ${stats.found} checked, ${stats.updated} updated`);
      
    } catch (error) {
      console.error('❌ Price updates failed:', error.message);
    } finally {
      this.currentJob = null;
    }
  }

  async runCleanup() {
    console.log('🧹 Starting cleanup...');
    
    try {
      // Remove properties that haven't been scraped in 30 days
      const result = await this.db.query(`
        UPDATE properties 
        SET status = 'inactive' 
        WHERE last_scraped_at < NOW() - INTERVAL '30 days' 
        AND status = 'active'
      `);

      console.log(`🧹 Marked ${result.rowCount} properties as inactive`);

      // Clean up old scraping logs (keep last 100 entries)
      await this.db.query(`
        DELETE FROM scraping_log 
        WHERE id NOT IN (
          SELECT id FROM scraping_log 
          ORDER BY started_at DESC 
          LIMIT 100
        )
      `);

      // Clean up old property views (keep last 30 days)
      await this.db.query(`
        DELETE FROM property_views 
        WHERE viewed_at < NOW() - INTERVAL '30 days'
      `);

      // Clean up old rate limit logs (keep last 7 days)
      await this.db.query(`
        DELETE FROM rate_limit_log 
        WHERE window_start < NOW() - INTERVAL '7 days'
      `);

      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  async runProxyHealthCheck() {
    console.log('🔍 Checking proxy health...');
    
    try {
      const proxies = await this.db.query(`
        SELECT * FROM proxy_pool 
        WHERE is_active = true 
        AND (last_tested IS NULL OR last_tested < NOW() - INTERVAL '1 hour')
        ORDER BY last_tested ASC NULLS FIRST
        LIMIT 10
      `);

      let healthyCount = 0;
      let unhealthyCount = 0;

      for (const proxy of proxies.rows) {
        const isHealthy = await this.scraper.testProxy(proxy);
        
        if (isHealthy) {
          healthyCount++;
          await this.db.query(`
            UPDATE proxy_pool 
            SET last_tested = CURRENT_TIMESTAMP, 
                success_rate = GREATEST(success_rate * 0.95 + 5, 100) 
            WHERE id = $1
          `, [proxy.id]);
        } else {
          unhealthyCount++;
          await this.db.query(`
            UPDATE proxy_pool 
            SET last_tested = CURRENT_TIMESTAMP, 
                success_rate = success_rate * 0.8,
                is_active = CASE WHEN success_rate * 0.8 < 50 THEN false ELSE true END
            WHERE id = $1
          `, [proxy.id]);
        }
      }

      if (proxies.rows.length > 0) {
        console.log(`🔍 Proxy health check: ${healthyCount} healthy, ${unhealthyCount} unhealthy`);
      }
      
    } catch (error) {
      console.error('❌ Proxy health check failed:', error.message);
    }
  }

  async saveProperty(propertyData) {
    try {
      // Check if property exists
      const existingProperty = await this.db.getPropertyByMLS(propertyData.mls_number);
      
      const result = await this.db.upsertProperty(propertyData);
      const propertyId = result.id;
      
      // Save images
      if (propertyData.images && propertyData.images.length > 0) {
        await this.db.upsertPropertyImages(propertyId, propertyData.images);
      }
      
      return {
        isNew: !existingProperty,
        isUpdated: existingProperty && existingProperty.updated_at < new Date(Date.now() - 60000), // 1 minute ago
        propertyId
      };
      
    } catch (error) {
      console.error('❌ Error saving property:', error.message);
      return { isNew: false, isUpdated: false };
    }
  }

  async markStaleProperties() {
    try {
      const result = await this.db.query(`
        UPDATE properties 
        SET status = 'inactive' 
        WHERE last_scraped_at < NOW() - INTERVAL '7 days' 
        AND status = 'active'
      `);
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error marking stale properties:', error.message);
      return 0;
    }
  }

  getScheduleStatus() {
    const status = {};
    
    this.schedules.forEach((schedule, name) => {
      status[name] = {
        running: schedule.running,
        nextExecution: schedule.nextDate()
      };
    });
    
    return {
      isRunning: this.isRunning,
      currentJob: this.currentJob,
      schedules: status,
      scraperStats: this.scraper.getStats()
    };
  }

  async getScrapingStats() {
    try {
      const stats = await this.db.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sessions,
          AVG(execution_time) as avg_execution_time,
          SUM(properties_new) as total_new_properties,
          SUM(properties_updated) as total_updated_properties,
          MAX(started_at) as last_scrape
        FROM scraping_log
        WHERE started_at > NOW() - INTERVAL '30 days'
      `);
      
      const propertiesCount = await this.db.query(`
        SELECT 
          COUNT(*) as total_properties,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_properties,
          COUNT(CASE WHEN listing_type = 'rental' THEN 1 END) as rental_properties,
          COUNT(CASE WHEN listing_type = 'purchase' THEN 1 END) as purchase_properties
        FROM properties
      `);
      
      return {
        scraping: stats.rows[0],
        properties: propertiesCount.rows[0],
        scheduler: this.getScheduleStatus()
      };
      
    } catch (error) {
      console.error('❌ Error getting scraping stats:', error.message);
      return null;
    }
  }

  // Manual trigger methods
  async triggerFullScrape() {
    if (this.currentJob) {
      throw new Error('Another scraping job is already running');
    }
    
    console.log('🔄 Manually triggering full scrape...');
    await this.runFullScrape();
  }

  async triggerIncrementalScrape() {
    if (this.currentJob) {
      throw new Error('Another scraping job is already running');
    }
    
    console.log('🔄 Manually triggering incremental scrape...');
    await this.runIncrementalScrape();
  }

  async triggerPriceUpdates() {
    if (this.currentJob) {
      throw new Error('Another scraping job is already running');
    }
    
    console.log('💰 Manually triggering price updates...');
    await this.runPriceUpdates();
  }
}

module.exports = ScraperScheduler;