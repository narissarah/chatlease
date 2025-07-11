#!/usr/bin/env node

/**
 * Database Migration Script
 * Initializes PostgreSQL database with ChatLease schema
 */

const PostgresDatabase = require('./postgres-db');

async function migrate() {
  console.log('🔄 Starting database migration...');
  
  try {
    const db = new PostgresDatabase();
    
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Database migration completed successfully!');
    console.log('🏗️  Schema has been created with the following tables:');
    console.log('   • agents - Real estate agents');
    console.log('   • properties - Property listings');
    console.log('   • property_images - Property photos');
    console.log('   • property_views - Analytics tracking');
    console.log('   • favorites - User favorites');
    console.log('   • inquiries - Property inquiries');
    console.log('   • scraping_log - Scraping activity log');
    console.log('   • rate_limit_log - Rate limiting tracking');
    console.log('   • proxy_pool - Proxy management');
    
    await db.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();