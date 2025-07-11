#!/usr/bin/env node

/**
 * Database Seeding Script
 * Seeds the database with initial data for testing
 */

const PostgresDatabase = require('./postgres-db');
const RealCentrisScraper = require('../scrapers/real-centris-scraper');

async function seed() {
  console.log('🌱 Starting database seeding...');
  
  try {
    const db = new PostgresDatabase();
    const scraper = new RealCentrisScraper(db);
    
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔄 Adding sample agents...');
    
    // Add sample agents
    const agents = [
      {
        email: 'jean.dupont@remax.ca',
        first_name: 'Jean',
        last_name: 'Dupont',
        phone: '514-555-0123',
        cell_phone: '514-555-9123',
        agency_name: 'RE/MAX du Cartier',
        license_number: 'D2345',
        languages: JSON.stringify(['fr', 'en']),
        rating: 4.5,
        years_experience: 15,
        properties_sold: 234,
        specializations: JSON.stringify(['Condos', 'Luxury Properties']),
        certifications: JSON.stringify(['CLHMS', 'ABR']),
        bio: 'With over 15 years of experience in Montreal real estate, Jean specializes in luxury condos and investment properties.',
        profile_image: 'https://source.unsplash.com/150x150/?professional,man'
      },
      {
        email: 'marie.tremblay@sothebys.ca',
        first_name: 'Marie',
        last_name: 'Tremblay',
        phone: '514-555-0456',
        cell_phone: '514-555-8456',
        agency_name: 'Sotheby\'s International Realty',
        license_number: 'C6789',
        languages: JSON.stringify(['fr', 'en', 'es']),
        rating: 4.8,
        years_experience: 8,
        properties_sold: 156,
        specializations: JSON.stringify(['Waterfront Properties', 'Historic Homes']),
        certifications: JSON.stringify(['CRS', 'Green']),
        bio: 'Marie brings a passion for Montreal\'s historic architecture and waterfront properties to every transaction.',
        profile_image: 'https://source.unsplash.com/150x150/?professional,woman'
      },
      {
        email: 'david.chen@royallepage.ca',
        first_name: 'David',
        last_name: 'Chen',
        phone: '514-555-0789',
        cell_phone: '514-555-7789',
        agency_name: 'Royal LePage',
        license_number: 'A1234',
        languages: JSON.stringify(['en', 'fr', 'zh']),
        rating: 4.6,
        years_experience: 12,
        properties_sold: 189,
        specializations: JSON.stringify(['Investment Properties', 'First-time Buyers']),
        certifications: JSON.stringify(['CRS', 'ABR']),
        bio: 'David specializes in helping clients build wealth through real estate investments and guiding first-time buyers.',
        profile_image: 'https://source.unsplash.com/150x150/?professional,asian'
      }
    ];
    
    for (const agent of agents) {
      await db.query(`
        INSERT INTO agents (
          email, first_name, last_name, phone, cell_phone, agency_name, license_number,
          languages, rating, years_experience, properties_sold, specializations, certifications,
          bio, profile_image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (email) DO NOTHING
      `, [
        agent.email, agent.first_name, agent.last_name, agent.phone, agent.cell_phone,
        agent.agency_name, agent.license_number, agent.languages, agent.rating,
        agent.years_experience, agent.properties_sold, agent.specializations,
        agent.certifications, agent.bio, agent.profile_image
      ]);
    }
    
    console.log('✅ Sample agents added');
    
    console.log('🔄 Adding sample proxy pool...');
    
    // Add sample proxies (replace with real proxy providers)
    const proxies = [
      { ip: '8.8.8.8', port: 8080, protocol: 'http', country: 'US' },
      { ip: '1.1.1.1', port: 8080, protocol: 'http', country: 'US' },
      { ip: '9.9.9.9', port: 8080, protocol: 'http', country: 'US' },
      // Add more reliable proxies here
    ];
    
    for (const proxy of proxies) {
      await db.query(`
        INSERT INTO proxy_pool (ip_address, port, protocol, country, is_active, success_rate)
        VALUES ($1, $2, $3, $4, true, 100.0)
        ON CONFLICT DO NOTHING
      `, [proxy.ip, proxy.port, proxy.protocol, proxy.country]);
    }
    
    console.log('✅ Sample proxy pool added');
    
    console.log('🔄 Adding sample properties...');
    
    // Generate sample properties
    const sampleProperties = [
      {
        mls_number: 'MLS001234567',
        agent_id: 1,
        property_type: 'condo',
        listing_type: 'purchase',
        address: '1200 Rue de la Montagne, Montreal, QC',
        neighborhood: 'Downtown',
        district: 'Ville-Marie',
        price: 650000,
        bedrooms: 2,
        bathrooms: 2,
        living_area_sqft: 900,
        year_built: 2020,
        description_en: 'Modern downtown condo with city views and luxury amenities.',
        description_fr: 'Condo moderne au centre-ville avec vue sur la ville et commodités de luxe.',
        amenities: JSON.stringify(['Gym', 'Pool', 'Concierge']),
        listing_date: new Date('2024-01-15'),
        centris_id: 'CTR001234567',
        centris_url: 'https://www.centris.ca/property/CTR001234567'
      },
      {
        mls_number: 'MLS002345678',
        agent_id: 2,
        property_type: 'apartment',
        listing_type: 'rental',
        address: '3420 Rue Saint-Denis, Montreal, QC',
        neighborhood: 'Plateau-Mont-Royal',
        district: 'Le Plateau-Mont-Royal',
        price: 2200,
        bedrooms: 2,
        bathrooms: 1,
        living_area_sqft: 850,
        year_built: 1995,
        description_en: 'Beautiful 2-bedroom apartment in the heart of Plateau with hardwood floors.',
        description_fr: 'Bel appartement 2 chambres au coeur du Plateau avec planchers de bois franc.',
        amenities: JSON.stringify(['Hardwood floors', 'Balcony', 'Heating included']),
        listing_date: new Date('2024-01-20'),
        centris_id: 'CTR002345678',
        centris_url: 'https://www.centris.ca/property/CTR002345678'
      },
      {
        mls_number: 'MLS003456789',
        agent_id: 3,
        property_type: 'house',
        listing_type: 'purchase',
        address: '456 Avenue Westmount, Westmount, QC',
        neighborhood: 'Westmount',
        district: 'Westmount',
        price: 1250000,
        bedrooms: 4,
        bathrooms: 3,
        living_area_sqft: 2200,
        year_built: 1985,
        description_en: 'Elegant Victorian house in prestigious Westmount with original character.',
        description_fr: 'Élégante maison victorienne dans le prestigieux Westmount avec cachet original.',
        amenities: JSON.stringify(['Garage', 'Garden', 'Fireplace', 'Hardwood floors']),
        listing_date: new Date('2024-01-25'),
        centris_id: 'CTR003456789',
        centris_url: 'https://www.centris.ca/property/CTR003456789'
      }
    ];
    
    for (const property of sampleProperties) {
      const result = await db.query(`
        INSERT INTO properties (
          mls_number, agent_id, property_type, listing_type, address, neighborhood,
          district, price, bedrooms, bathrooms, living_area_sqft, year_built,
          description_en, description_fr, amenities, listing_date, centris_id,
          centris_url, status, last_scraped_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active', CURRENT_TIMESTAMP)
        ON CONFLICT (mls_number) DO NOTHING
        RETURNING id
      `, [
        property.mls_number, property.agent_id, property.property_type, property.listing_type,
        property.address, property.neighborhood, property.district, property.price,
        property.bedrooms, property.bathrooms, property.living_area_sqft, property.year_built,
        property.description_en, property.description_fr, property.amenities,
        property.listing_date, property.centris_id, property.centris_url
      ]);
      
      // Add sample images for each property
      if (result.rows.length > 0) {
        const propertyId = result.rows[0].id;
        const imageCategories = ['living-room', 'kitchen', 'bedroom', 'bathroom', 'exterior'];
        
        for (let i = 0; i < 5; i++) {
          const category = imageCategories[i];
          await db.query(`
            INSERT INTO property_images (property_id, url, category, is_primary, display_order)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            propertyId,
            `https://source.unsplash.com/800x600/?${property.property_type},${category}`,
            category,
            i === 0, // First image is primary
            i
          ]);
        }
      }
    }
    
    console.log('✅ Sample properties added');
    
    // Log initial scraping session
    await db.query(`
      INSERT INTO scraping_log (scrape_type, status, properties_found, properties_new, properties_updated)
      VALUES ('seed', 'completed', $1, $1, 0)
    `, [sampleProperties.length]);
    
    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Added:');
    console.log(`   • ${agents.length} agents`);
    console.log(`   • ${proxies.length} proxies`);
    console.log(`   • ${sampleProperties.length} properties`);
    console.log(`   • ${sampleProperties.length * 5} property images`);
    console.log('\n🎉 Database is ready for use!');
    
    await db.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seed();