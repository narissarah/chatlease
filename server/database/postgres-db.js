/**
 * PostgreSQL Database Connection with Railway Integration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class PostgresDatabase {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
    
    this.initializeConnection();
  }

  async initializeConnection() {
    try {
      console.log('🔄 Connecting to PostgreSQL database...');
      
      // Railway automatically provides these environment variables
      const connectionConfig = {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        database: process.env.PGDATABASE || 'chatlease',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'password',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000, // Increased for Railway
        acquireTimeoutMillis: 30000, // Added for Railway reliability
      };

      // Alternative: Use DATABASE_URL if provided (Railway format)
      if (process.env.DATABASE_URL) {
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000, // Increased for Railway
          acquireTimeoutMillis: 30000, // Added for Railway reliability
        });
      } else {
        this.pool = new Pool(connectionConfig);
      }

      // Test connection
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL connected successfully');
      console.log(`📍 Database: ${client.database}, Host: ${client.host}`);
      client.release();
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      // Initialize schema
      await this.initializeSchema();
      
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      this.isConnected = false;
      this.connectionAttempts++;
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying connection in ${this.retryDelay/1000} seconds... (${this.connectionAttempts}/${this.maxRetries})`);
        setTimeout(() => this.initializeConnection(), this.retryDelay);
      } else {
        console.error('💀 Max connection attempts reached. Server will continue without database.');
        // Don't throw error - let server continue without database
      }
    }
  }

  async initializeSchema() {
    try {
      console.log('🏗️  Initializing database schema...');
      
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      await this.pool.query(schema);
      console.log('✅ Database schema initialized successfully');
      
    } catch (error) {
      console.error('❌ Schema initialization failed:', error.message);
      throw error;
    }
  }

  async query(sql, params = []) {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query(sql, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`⚠️  Slow query detected (${duration}ms):`, sql.substring(0, 100));
      }
      
      return result;
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Property-specific methods
  async getProperties(filters = {}) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Build WHERE clause dynamically
    if (filters.listing_type) {
      conditions.push(`listing_type = $${paramIndex++}`);
      params.push(filters.listing_type);
    }

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    } else {
      conditions.push(`status = $${paramIndex++}`);
      params.push('active');
    }

    if (filters.neighborhood) {
      conditions.push(`neighborhood ILIKE $${paramIndex++}`);
      params.push(`%${filters.neighborhood}%`);
    }

    if (filters.min_price) {
      conditions.push(`price >= $${paramIndex++}`);
      params.push(filters.min_price);
    }

    if (filters.max_price) {
      conditions.push(`price <= $${paramIndex++}`);
      params.push(filters.max_price);
    }

    if (filters.bedrooms) {
      conditions.push(`bedrooms >= $${paramIndex++}`);
      params.push(filters.bedrooms);
    }

    if (filters.property_type) {
      conditions.push(`property_type = $${paramIndex++}`);
      params.push(filters.property_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = filters.sort_by || 'created_at DESC';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const sql = `
      SELECT 
        p.*,
        a.first_name || ' ' || a.last_name as agent_name,
        a.phone as agent_phone,
        a.email as agent_email,
        a.agency_name as agent_agency,
        (SELECT json_agg(pi.url ORDER BY pi.display_order) 
         FROM property_images pi 
         WHERE pi.property_id = p.id) as images,
        (SELECT pi.url 
         FROM property_images pi 
         WHERE pi.property_id = p.id AND pi.is_primary = true
         LIMIT 1) as main_image
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    params.push(limit, offset);
    return await this.query(sql, params);
  }

  async getPropertyById(id) {
    const sql = `
      SELECT 
        p.*,
        a.first_name || ' ' || a.last_name as agent_name,
        a.phone as agent_phone,
        a.email as agent_email,
        a.agency_name as agent_agency,
        a.bio as agent_bio,
        a.rating as agent_rating,
        (SELECT json_agg(
          json_build_object(
            'url', url,
            'category', category,
            'is_primary', is_primary,
            'caption', caption
          ) ORDER BY display_order
        ) FROM property_images WHERE property_id = p.id) as images
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      WHERE p.id = $1
    `;
    
    const result = await this.query(sql, [id]);
    return result.rows[0] || null;
  }

  async getPropertyByMLS(mlsNumber) {
    const sql = `
      SELECT * FROM properties 
      WHERE mls_number = $1
    `;
    
    const result = await this.query(sql, [mlsNumber]);
    return result.rows[0] || null;
  }

  async upsertProperty(propertyData) {
    const {
      mls_number, agent_id, property_type, listing_type, status,
      address, unit_number, neighborhood, district, city, province, postal_code,
      latitude, longitude, price, price_per_sqft, previous_price,
      municipal_assessment, taxes, condo_fees, living_area_sqft, living_area_sqm,
      lot_size_sqft, lot_frontage_ft, bedrooms, bathrooms, powder_rooms, total_rooms,
      room_details, year_built, building_style, floors, heating_type, heating_energy,
      cooling_type, garage, parking, storage, amenities, appliances_included,
      area_info, proximity, view, exposure, zoning, cadastre, lease_term,
      available_date, pets_allowed, smoking_allowed, furnished, utilities_included,
      occupancy, vendor_declaration, deed_of_sale_date, description_en, description_fr,
      virtual_tour_url, video_url, centris_id, centris_url, listing_date, days_on_market
    } = propertyData;

    const sql = `
      INSERT INTO properties (
        mls_number, agent_id, property_type, listing_type, status,
        address, unit_number, neighborhood, district, city, province, postal_code,
        latitude, longitude, price, price_per_sqft, previous_price,
        municipal_assessment, taxes, condo_fees, living_area_sqft, living_area_sqm,
        lot_size_sqft, lot_frontage_ft, bedrooms, bathrooms, powder_rooms, total_rooms,
        room_details, year_built, building_style, floors, heating_type, heating_energy,
        cooling_type, garage, parking, storage, amenities, appliances_included,
        area_info, proximity, view, exposure, zoning, cadastre, lease_term,
        available_date, pets_allowed, smoking_allowed, furnished, utilities_included,
        occupancy, vendor_declaration, deed_of_sale_date, description_en, description_fr,
        virtual_tour_url, video_url, centris_id, centris_url, listing_date, days_on_market,
        last_scraped_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
        $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47,
        $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, CURRENT_TIMESTAMP
      )
      ON CONFLICT (mls_number) DO UPDATE SET
        agent_id = EXCLUDED.agent_id,
        property_type = EXCLUDED.property_type,
        listing_type = EXCLUDED.listing_type,
        status = EXCLUDED.status,
        address = EXCLUDED.address,
        unit_number = EXCLUDED.unit_number,
        neighborhood = EXCLUDED.neighborhood,
        district = EXCLUDED.district,
        city = EXCLUDED.city,
        province = EXCLUDED.province,
        postal_code = EXCLUDED.postal_code,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        price = EXCLUDED.price,
        price_per_sqft = EXCLUDED.price_per_sqft,
        previous_price = EXCLUDED.previous_price,
        municipal_assessment = EXCLUDED.municipal_assessment,
        taxes = EXCLUDED.taxes,
        condo_fees = EXCLUDED.condo_fees,
        living_area_sqft = EXCLUDED.living_area_sqft,
        living_area_sqm = EXCLUDED.living_area_sqm,
        lot_size_sqft = EXCLUDED.lot_size_sqft,
        lot_frontage_ft = EXCLUDED.lot_frontage_ft,
        bedrooms = EXCLUDED.bedrooms,
        bathrooms = EXCLUDED.bathrooms,
        powder_rooms = EXCLUDED.powder_rooms,
        total_rooms = EXCLUDED.total_rooms,
        room_details = EXCLUDED.room_details,
        year_built = EXCLUDED.year_built,
        building_style = EXCLUDED.building_style,
        floors = EXCLUDED.floors,
        heating_type = EXCLUDED.heating_type,
        heating_energy = EXCLUDED.heating_energy,
        cooling_type = EXCLUDED.cooling_type,
        garage = EXCLUDED.garage,
        parking = EXCLUDED.parking,
        storage = EXCLUDED.storage,
        amenities = EXCLUDED.amenities,
        appliances_included = EXCLUDED.appliances_included,
        area_info = EXCLUDED.area_info,
        proximity = EXCLUDED.proximity,
        view = EXCLUDED.view,
        exposure = EXCLUDED.exposure,
        zoning = EXCLUDED.zoning,
        cadastre = EXCLUDED.cadastre,
        lease_term = EXCLUDED.lease_term,
        available_date = EXCLUDED.available_date,
        pets_allowed = EXCLUDED.pets_allowed,
        smoking_allowed = EXCLUDED.smoking_allowed,
        furnished = EXCLUDED.furnished,
        utilities_included = EXCLUDED.utilities_included,
        occupancy = EXCLUDED.occupancy,
        vendor_declaration = EXCLUDED.vendor_declaration,
        deed_of_sale_date = EXCLUDED.deed_of_sale_date,
        description_en = EXCLUDED.description_en,
        description_fr = EXCLUDED.description_fr,
        virtual_tour_url = EXCLUDED.virtual_tour_url,
        video_url = EXCLUDED.video_url,
        centris_id = EXCLUDED.centris_id,
        centris_url = EXCLUDED.centris_url,
        listing_date = EXCLUDED.listing_date,
        days_on_market = EXCLUDED.days_on_market,
        last_scraped_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const params = [
      mls_number, agent_id, property_type, listing_type, status,
      address, unit_number, neighborhood, district, city, province, postal_code,
      latitude, longitude, price, price_per_sqft, previous_price,
      JSON.stringify(municipal_assessment), JSON.stringify(taxes), JSON.stringify(condo_fees),
      living_area_sqft, living_area_sqm, lot_size_sqft, lot_frontage_ft, bedrooms,
      bathrooms, powder_rooms, total_rooms, JSON.stringify(room_details), year_built,
      building_style, floors, heating_type, heating_energy, cooling_type,
      JSON.stringify(garage), JSON.stringify(parking), JSON.stringify(storage),
      JSON.stringify(amenities), JSON.stringify(appliances_included),
      JSON.stringify(area_info), JSON.stringify(proximity), JSON.stringify(view),
      JSON.stringify(exposure), zoning, cadastre, lease_term, available_date,
      pets_allowed, smoking_allowed, furnished, JSON.stringify(utilities_included),
      occupancy, vendor_declaration, deed_of_sale_date, description_en, description_fr,
      virtual_tour_url, video_url, centris_id, centris_url, listing_date, days_on_market
    ];

    const result = await this.query(sql, params);
    return result.rows[0];
  }

  async upsertPropertyImages(propertyId, images) {
    if (!images || images.length === 0) return;

    // Delete existing images
    await this.query('DELETE FROM property_images WHERE property_id = $1', [propertyId]);

    // Insert new images
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      await this.query(
        `INSERT INTO property_images (property_id, url, category, is_primary, display_order, caption)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [propertyId, image.url, image.category || 'general', i === 0, i, image.caption || '']
      );
    }
  }

  async logScrapeSession(type, status, stats = {}) {
    const sql = `
      INSERT INTO scraping_log (scrape_type, status, properties_found, properties_new, properties_updated, properties_removed, error_message, execution_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const params = [
      type,
      status,
      stats.found || 0,
      stats.new || 0,
      stats.updated || 0,
      stats.removed || 0,
      stats.error || null,
      stats.executionTime || null
    ];
    
    const result = await this.query(sql, params);
    return result.rows[0].id;
  }

  async updateScrapeSession(sessionId, status, stats = {}) {
    const sql = `
      UPDATE scraping_log 
      SET status = $1, properties_found = $2, properties_new = $3, properties_updated = $4, 
          properties_removed = $5, error_message = $6, execution_time = $7, completed_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `;
    
    const params = [
      status,
      stats.found || 0,
      stats.new || 0,
      stats.updated || 0,
      stats.removed || 0,
      stats.error || null,
      stats.executionTime || null,
      sessionId
    ];
    
    await this.query(sql, params);
  }

  async getHealthStatus() {
    try {
      const result = await this.query('SELECT COUNT(*) as property_count FROM properties WHERE status = $1', ['active']);
      const proxyResult = await this.query('SELECT COUNT(*) as proxy_count FROM proxy_pool WHERE is_active = true');
      
      return {
        connected: this.isConnected,
        properties: parseInt(result.rows[0].property_count),
        activeProxies: parseInt(proxyResult.rows[0].proxy_count),
        lastScrape: await this.getLastScrapeTime()
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  async getLastScrapeTime() {
    const result = await this.query(
      'SELECT MAX(completed_at) as last_scrape FROM scraping_log WHERE status = $1',
      ['completed']
    );
    return result.rows[0].last_scrape;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('📊 PostgreSQL connection closed');
    }
  }

  // Alias for compatibility
  async end() {
    return this.close();
  }

  // Initialize data method for server startup
  async initializeData() {
    try {
      console.log('🌱 Initializing database with sample data...');
      
      // Check if we already have data
      const result = await this.query('SELECT COUNT(*) as count FROM properties WHERE status = $1', ['active']);
      const count = parseInt(result.rows[0]?.count || 0);
      
      if (count > 0) {
        console.log(`✅ Database already contains ${count} properties`);
        return;
      }

      // If no data, run minimal seeding
      console.log('🔄 No properties found, adding minimal sample data...');
      
      // Add a default agent if none exist
      await this.query(`
        INSERT INTO agents (email, first_name, last_name, phone, agency_name, languages, rating, years_experience)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO NOTHING
      `, ['default@chatlease.com', 'ChatLease', 'Agent', '514-555-0000', 'ChatLease Agency', JSON.stringify(['en', 'fr']), 5.0, 1]);
      
      console.log('✅ Database initialization complete');
    } catch (error) {
      console.error('⚠️  Warning: Could not initialize data:', error.message);
      // Don't throw - let the app continue without initial data
    }
  }

  // Wait for connection to be ready
  async waitForConnection(maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      if (this.isConnected) {
        return true;
      }
      console.log(`⏳ Waiting for database connection... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds for Railway
    }
    return false;
  }
}

module.exports = PostgresDatabase;