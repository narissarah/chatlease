#!/usr/bin/env node

/**
 * Production startup script for Railway deployment
 * Handles database migration and seeding before starting the server
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting ChatLease deployment...');

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${command} completed successfully`);
        resolve();
      } else {
        console.error(`❌ ${command} failed with code ${code}`);
        reject(new Error(`Command failed: ${command}`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Error running ${command}:`, error);
      reject(error);
    });
  });
}

async function checkDatabaseConnection() {
  try {
    console.log('🔍 Checking database connection...');
    
    const PostgresDatabase = require('../server/database/postgres-db');
    const db = new PostgresDatabase();
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const health = await db.getHealthStatus();
    console.log('✅ Database connection verified');
    
    await db.close();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function migrateDatabase() {
  try {
    console.log('🏗️  Running database migrations...');
    
    const PostgresDatabase = require('../server/database/postgres-db');
    const db = new PostgresDatabase();
    
    // Wait for connection and auto-migration
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ Database migrations completed');
    await db.close();
    
    return true;
  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    return false;
  }
}

async function seedDatabase() {
  try {
    console.log('🌱 Checking if database needs seeding...');
    
    const PostgresDatabase = require('../server/database/postgres-db');
    const db = new PostgresDatabase();
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if data already exists
    const result = await db.query('SELECT COUNT(*) as count FROM properties');
    const propertyCount = parseInt(result.rows[0].count);
    
    if (propertyCount === 0) {
      console.log('🌱 Database is empty, seeding with initial data...');
      
      // Run the seeding logic inline
      const RealCentrisScraper = require('../server/scrapers/real-centris-scraper');
      const scraper = new RealCentrisScraper(db);
      
      // Add sample agents
      const agents = [
        {
          email: 'jean.dupont@remax.ca',
          first_name: 'Jean',
          last_name: 'Dupont',
          phone: '514-555-0123',
          agency_name: 'RE/MAX du Cartier',
          languages: JSON.stringify(['fr', 'en']),
          rating: 4.5,
          years_experience: 15
        },
        {
          email: 'marie.tremblay@sothebys.ca',
          first_name: 'Marie',
          last_name: 'Tremblay',
          phone: '514-555-0456',
          agency_name: 'Sotheby\'s International Realty',
          languages: JSON.stringify(['fr', 'en']),
          rating: 4.8,
          years_experience: 8
        }
      ];
      
      for (const agent of agents) {
        await db.query(`
          INSERT INTO agents (email, first_name, last_name, phone, agency_name, languages, rating, years_experience)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (email) DO NOTHING
        `, [agent.email, agent.first_name, agent.last_name, agent.phone, agent.agency_name, agent.languages, agent.rating, agent.years_experience]);
      }
      
      console.log('✅ Database seeded successfully');
    } else {
      console.log(`✅ Database already has ${propertyCount} properties, skipping seeding`);
    }
    
    await db.close();
    return true;
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    return false;
  }
}

async function initializeProxyPool() {
  try {
    console.log('🔄 Initializing proxy pool...');
    
    const { initializeProxyPool } = require('../server/config/proxy-providers');
    const PostgresDatabase = require('../server/database/postgres-db');
    
    const db = new PostgresDatabase();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await initializeProxyPool(db);
    
    console.log('✅ Proxy pool initialized');
    await db.close();
    
    return true;
  } catch (error) {
    console.error('❌ Proxy pool initialization failed:', error.message);
    return false;
  }
}

async function startServer() {
  try {
    console.log('🚀 Starting ChatLease server...');
    await runCommand('node', ['server/server.js']);
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    console.log('🏠 ChatLease Production Startup');
    console.log('=' .repeat(50));
    
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ Database connection failed, exiting...');
      process.exit(1);
    }
    
    // Run migrations
    const migrated = await migrateDatabase();
    if (!migrated) {
      console.error('❌ Database migration failed, exiting...');
      process.exit(1);
    }
    
    // Seed database if needed
    const seeded = await seedDatabase();
    if (!seeded) {
      console.warn('⚠️  Database seeding failed, continuing anyway...');
    }
    
    // Initialize proxy pool
    await initializeProxyPool();
    
    console.log('✅ All initialization steps completed');
    console.log('🚀 Starting server...');
    
    // Start the server
    await startServer();
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Startup error:', error);
  process.exit(1);
});