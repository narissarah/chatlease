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
    const connected = await db.waitForConnection(30); // 30 seconds timeout
    
    if (!connected) {
      throw new Error('Database connection timeout');
    }
    
    const health = await db.getHealthStatus();
    console.log('✅ Database connection verified');
    console.log(`   Connected: ${health.connected}`);
    console.log(`   Properties: ${health.properties || 0}`);
    
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
    
    // Wait for connection
    const connected = await db.waitForConnection(30);
    
    if (!connected) {
      throw new Error('Database connection timeout during migration');
    }
    
    // Schema initialization happens automatically in initializeSchema()
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
    const connected = await db.waitForConnection(30);
    
    if (!connected) {
      throw new Error('Database connection timeout during seeding');
    }
    
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
    const connected = await db.waitForConnection(30);
    
    if (!connected) {
      throw new Error('Database connection timeout during proxy pool initialization');
    }
    
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
    
    // CRITICAL FIX: Start server immediately for Railway health checks
    console.log('🚀 Starting server immediately for Railway health checks...');
    
    // Start server in background (non-blocking)
    const serverProcess = spawn('node', ['server/server.js'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      detached: false
    });

    // Give server a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Server started, now running background initialization...');
    
    // Run database operations in background (non-blocking)
    setImmediate(async () => {
      try {
        console.log('🔄 Running background database initialization...');
        
        // Check database connection (with timeout)
        const dbConnected = await Promise.race([
          checkDatabaseConnection(),
          new Promise(resolve => setTimeout(() => resolve(false), 30000)) // 30s timeout
        ]);
        
        if (!dbConnected) {
          console.warn('⚠️  Database connection failed, server will continue without database features...');
          return;
        }
        
        // Run migrations (with timeout)
        const migrated = await Promise.race([
          migrateDatabase(),
          new Promise(resolve => setTimeout(() => resolve(false), 30000)) // 30s timeout
        ]);
        
        if (!migrated) {
          console.warn('⚠️  Database migration failed, continuing anyway...');
          return;
        }
        
        // Seed database if needed (with timeout)
        const seeded = await Promise.race([
          seedDatabase(),
          new Promise(resolve => setTimeout(() => resolve(false), 60000)) // 60s timeout
        ]);
        
        if (!seeded) {
          console.warn('⚠️  Database seeding failed, continuing anyway...');
        }
        
        // Initialize proxy pool (with timeout)
        try {
          await Promise.race([
            initializeProxyPool(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
          ]);
          console.log('✅ Proxy pool initialized');
        } catch (error) {
          console.warn('⚠️  Proxy pool initialization failed, continuing anyway...');
        }
        
        console.log('✅ Background initialization completed');
        
      } catch (error) {
        console.warn('⚠️  Background initialization error:', error.message);
        console.log('🚀 Server continues running without full database features');
      }
    });
    
    // Wait for server process
    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      process.exit(code);
    });

    serverProcess.on('error', (error) => {
      console.error('Server process error:', error);
      process.exit(1);
    });
    
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