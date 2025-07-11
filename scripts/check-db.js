#!/usr/bin/env node

/**
 * Database Connection Checker
 * Use this to verify your database connection before deployment
 */

const PostgresDatabase = require('../server/database/postgres-db');

console.log('🔍 Checking database connection...\n');

// Display current configuration
console.log('Configuration:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('PGHOST:', process.env.PGHOST || 'Not set');
console.log('PGPORT:', process.env.PGPORT || 'Not set');
console.log('PGUSER:', process.env.PGUSER || 'Not set');
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '✅ Set' : '❌ Not set');
console.log('PGDATABASE:', process.env.PGDATABASE || 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('\n');

async function checkConnection() {
  try {
    const db = new PostgresDatabase();
    
    // Wait for connection
    console.log('⏳ Attempting connection...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test query
    console.log('🔄 Running test query...');
    const result = await db.query('SELECT version()');
    console.log('✅ PostgreSQL version:', result.rows[0].version);
    
    // Check tables
    console.log('\n📊 Checking tables...');
    const tables = await db.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    if (tables.rows.length > 0) {
      console.log('✅ Found tables:');
      tables.rows.forEach(row => console.log('  -', row.tablename));
      
      // Check property count
      const propCount = await db.query('SELECT COUNT(*) as count FROM properties');
      console.log(`\n📦 Properties in database: ${propCount.rows[0].count}`);
    } else {
      console.log('⚠️  No tables found - database needs initialization');
    }
    
    // Close connection
    await db.close();
    console.log('\n✅ Database connection successful!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tips:');
      console.error('- Make sure PostgreSQL is running');
      console.error('- Check your connection settings');
      console.error('- For Railway: ensure you\'ve linked your service');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Tips:');
      console.error('- Check your PGPASSWORD environment variable');
      console.error('- Verify credentials in Railway dashboard');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('\n💡 Tips:');
      console.error('- Database doesn\'t exist yet');
      console.error('- Railway should create it automatically');
      console.error('- Check Railway dashboard for PostgreSQL service');
    }
    
    process.exit(1);
  }
}

checkConnection();