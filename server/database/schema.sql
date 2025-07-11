-- ChatLease PostgreSQL Database Schema
-- Optimized for Centris data structure

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    cell_phone VARCHAR(20),
    agency_name VARCHAR(255),
    agency_address TEXT,
    license_number VARCHAR(50),
    languages JSON DEFAULT '[]',
    rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    years_experience INTEGER DEFAULT 0,
    properties_sold INTEGER DEFAULT 0,
    specializations JSON DEFAULT '[]',
    certifications JSON DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    bio TEXT,
    profile_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties table (comprehensive Centris structure)
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    mls_number VARCHAR(20) UNIQUE NOT NULL,
    agent_id INTEGER REFERENCES agents(id),
    property_type VARCHAR(50) NOT NULL,
    listing_type VARCHAR(20) NOT NULL, -- rental, purchase
    status VARCHAR(20) DEFAULT 'active',
    
    -- Location
    address TEXT NOT NULL,
    unit_number VARCHAR(20),
    neighborhood VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Montreal',
    province VARCHAR(10) DEFAULT 'QC',
    postal_code VARCHAR(7),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Pricing
    price INTEGER NOT NULL,
    price_per_sqft DECIMAL(10,2),
    previous_price INTEGER,
    currency VARCHAR(3) DEFAULT 'CAD',
    
    -- Municipal Assessment & Taxes
    municipal_assessment JSON,
    taxes JSON,
    condo_fees JSON,
    
    -- Size & Layout
    living_area_sqft INTEGER,
    living_area_sqm DECIMAL(10,2),
    lot_size_sqft INTEGER,
    lot_frontage_ft DECIMAL(10,2),
    bedrooms INTEGER,
    bathrooms INTEGER,
    powder_rooms INTEGER DEFAULT 0,
    total_rooms INTEGER,
    room_details JSON DEFAULT '[]',
    
    -- Building Information
    year_built INTEGER,
    building_style VARCHAR(100),
    floors INTEGER,
    
    -- Systems & Features
    heating_type VARCHAR(100),
    heating_energy VARCHAR(100),
    cooling_type VARCHAR(100),
    
    -- Parking & Storage
    garage JSON,
    parking JSON,
    storage JSON,
    
    -- Amenities & Appliances
    amenities JSON DEFAULT '[]',
    appliances_included JSON DEFAULT '[]',
    
    -- Area Information
    area_info JSON,
    proximity JSON,
    
    -- Views & Exposure
    view JSON DEFAULT '[]',
    exposure JSON DEFAULT '[]',
    
    -- Legal & Zoning
    zoning VARCHAR(100),
    cadastre VARCHAR(50),
    
    -- Rental Specific
    lease_term VARCHAR(50),
    available_date DATE,
    pets_allowed BOOLEAN,
    smoking_allowed BOOLEAN,
    furnished VARCHAR(20),
    utilities_included JSON DEFAULT '[]',
    
    -- Purchase Specific
    occupancy VARCHAR(50),
    vendor_declaration BOOLEAN,
    deed_of_sale_date DATE,
    
    -- Descriptions
    description_en TEXT,
    description_fr TEXT,
    
    -- Media
    virtual_tour_url VARCHAR(500),
    video_url VARCHAR(500),
    
    -- Statistics
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    
    -- Centris specific
    centris_id VARCHAR(50),
    centris_url VARCHAR(500),
    last_scraped_at TIMESTAMP,
    
    -- Timestamps
    listing_date DATE,
    days_on_market INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Images
CREATE TABLE IF NOT EXISTS property_images (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Views (analytics)
CREATE TABLE IF NOT EXISTS property_views (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id)
);

-- Inquiries
CREATE TABLE IF NOT EXISTS inquiries (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT,
    inquiry_type VARCHAR(50) DEFAULT 'general',
    status VARCHAR(20) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scraping Log
CREATE TABLE IF NOT EXISTS scraping_log (
    id SERIAL PRIMARY KEY,
    scrape_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'single'
    status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
    properties_found INTEGER DEFAULT 0,
    properties_new INTEGER DEFAULT 0,
    properties_updated INTEGER DEFAULT 0,
    properties_removed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time INTEGER, -- in seconds
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Rate Limiting Log
CREATE TABLE IF NOT EXISTS rate_limit_log (
    id SERIAL PRIMARY KEY,
    ip_address INET,
    endpoint VARCHAR(255),
    requests_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP
);

-- Proxy Pool
CREATE TABLE IF NOT EXISTS proxy_pool (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    port INTEGER NOT NULL,
    protocol VARCHAR(10) DEFAULT 'http',
    username VARCHAR(100),
    password VARCHAR(100),
    country VARCHAR(2),
    is_active BOOLEAN DEFAULT true,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    last_used TIMESTAMP,
    last_tested TIMESTAMP,
    response_time INTEGER, -- in milliseconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_mls ON properties(mls_number);
CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_neighborhood ON properties(neighborhood);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);
CREATE INDEX IF NOT EXISTS idx_properties_updated_at ON properties(updated_at);
CREATE INDEX IF NOT EXISTS idx_properties_last_scraped ON properties(last_scraped_at);

CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_primary ON property_images(is_primary);

CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_viewed_at ON property_views(viewed_at);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);

CREATE INDEX IF NOT EXISTS idx_scraping_log_status ON scraping_log(status);
CREATE INDEX IF NOT EXISTS idx_scraping_log_started_at ON scraping_log(started_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON rate_limit_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_log(window_start);

CREATE INDEX IF NOT EXISTS idx_proxy_pool_active ON proxy_pool(is_active);
CREATE INDEX IF NOT EXISTS idx_proxy_pool_last_used ON proxy_pool(last_used);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Idempotent trigger creation
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing
INSERT INTO agents (email, first_name, last_name, phone, cell_phone, agency_name, license_number, languages, rating, years_experience) 
VALUES 
('jean.dupont@remax.ca', 'Jean', 'Dupont', '514-555-0123', '514-555-9123', 'RE/MAX du Cartier', 'D2345', '["fr", "en"]', 4.5, 15),
('marie.tremblay@sothebys.ca', 'Marie', 'Tremblay', '514-555-0456', '514-555-8456', 'Sotheby''s International Realty', 'C6789', '["fr", "en", "es"]', 4.8, 8)
ON CONFLICT (email) DO NOTHING;