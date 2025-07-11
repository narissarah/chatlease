#!/usr/bin/env node

/**
 * ChatLease Server with Centris Features
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const PostgresDatabase = require('./database/postgres-db');
const RealCentrisScraper = require('./scrapers/real-centris-scraper');
const ScraperScheduler = require('./schedulers/scraper-scheduler');
const CONFIG = require('./config/constants');
const cache = require('./utils/cache');
const ResponseBuilder = require('./utils/response-builder');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database and services (lazy-loaded to prevent blocking)
let db = null;
let scraper = null;
let scheduler = null;

// Initialize services asynchronously
function initializeServices() {
  if (!db) {
    db = new PostgresDatabase();
  }
  if (!scraper) {
    scraper = new RealCentrisScraper(db);
  }
  if (!scheduler) {
    scheduler = new ScraperScheduler(db);
  }
}

// Ensure services are initialized before use
function ensureServices() {
  initializeServices();
  return { db, scraper, scheduler };
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/public')));

// Health check - Railway deployment endpoint (ultra-fast, never blocks)
app.get('/health', (req, res) => {
  // Immediate response - never await anything that could block
  const healthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'postgresql',
    version: '3.0.0',
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      port: PORT,
      nodeVersion: process.version,
      platform: process.platform
    },
    railway: {
      deployment: 'active',
      healthCheck: 'passing'
    }
  };

  // Add basic service status without any async operations
  if (db) {
    healthResponse.services = {
      database: db.isConnected ? 'connected' : 'connecting',
      scheduler: scheduler ? 'active' : 'initializing',
      scraper: scraper ? 'active' : 'initializing'
    };
  } else {
    healthResponse.services = {
      database: 'initializing',
      scheduler: 'initializing', 
      scraper: 'initializing'
    };
  }
  
  // Always return 200 OK immediately - never block
  res.json(healthResponse);
});

// Detailed health check endpoint (for debugging, not used by Railway)
app.get('/health/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        port: PORT,
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    // Try to get detailed status with timeout
    try {
      if (db && db.isConnected) {
        const dbHealth = await Promise.race([
          db.getHealthStatus(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 3000))
        ]);
        
        detailedHealth.services = {
          database: dbHealth,
          scheduler: scheduler ? scheduler.getScheduleStatus() : { status: 'initializing' },
          scraper: scraper ? scraper.getStats() : { status: 'initializing' }
        };
      } else {
        detailedHealth.services = {
          database: { connected: false, status: 'connecting' },
          scheduler: { status: 'waiting' },
          scraper: { status: 'waiting' }
        };
      }
    } catch (serviceError) {
      detailedHealth.services = {
        database: { connected: false, error: serviceError.message },
        scheduler: { status: 'initializing' },
        scraper: { status: 'initializing' }
      };
    }
    
    res.json(detailedHealth);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============== PROPERTY ENDPOINTS ==============

// Get all properties with advanced filtering
app.get('/api/properties', async (req, res) => {
  try {
    const { db } = ensureServices();
    
    // Check if database is connected before proceeding
    if (!db || !db.isConnected) {
      return res.status(503).json({ 
        error: 'Database is still connecting. Please try again in a moment.',
        status: 'database_connecting',
        message: 'The application is starting up. Database connection in progress.'
      });
    }
    
    // Build filters from query parameters
    const filters = {
      listing_type: req.query.listingType || 'rental',
      status: 'active',
      neighborhood: req.query.neighborhood,
      min_price: req.query.minPrice ? parseInt(req.query.minPrice) : null,
      max_price: req.query.maxPrice ? parseInt(req.query.maxPrice) : null,
      bedrooms: req.query.bedrooms ? parseInt(req.query.bedrooms) : null,
      property_type: req.query.propertyType,
      sort_by: req.query.sortBy || 'created_at DESC',
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    // Get properties with caching
    const cacheKey = `properties_${JSON.stringify(filters)}`;
    const result = await cache.getOrFetch(cacheKey, async () => {
      return await db.getProperties(filters);
    }, 300000); // 5 minutes cache
    
    const properties = result.rows || [];
    
    let filteredProperties = [...properties];
    
    // Apply advanced filters from query parameters
    const advancedFilters = {
      // Basic filters
      listingType: req.query.listingType,
      propertyType: req.query.propertyType,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      bedrooms: req.query.bedrooms,
      bathrooms: req.query.bathrooms,
      
      // Location filters
      neighborhood: req.query.neighborhood,
      district: req.query.district,
      nearMetro: req.query.nearMetro,
      nearSchool: req.query.nearSchool,
      
      // Size filters
      minSqft: req.query.minSqft,
      maxSqft: req.query.maxSqft,
      
      // Feature filters
      parking: req.query.parking,
      pool: req.query.pool,
      gym: req.query.gym,
      elevator: req.query.elevator,
      furnished: req.query.furnished,
      petsAllowed: req.query.petsAllowed,
      
      // Financial filters (purchase)
      maxCondoFees: req.query.maxCondoFees,
      maxTaxes: req.query.maxTaxes,
      
      // Age filters
      minYearBuilt: req.query.minYearBuilt,
      newConstruction: req.query.newConstruction,
      
      // Sort options
      sortBy: req.query.sortBy || 'price',
      sortOrder: req.query.sortOrder || 'asc'
    };
    
    // Apply filters
    filteredProperties = applyAdvancedFilters(filteredProperties, advancedFilters);
    
    // Sort results
    filteredProperties = sortProperties(filteredProperties, advancedFilters.sortBy, advancedFilters.sortOrder);
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || CONFIG.DEFAULT_PAGE_LIMIT;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedProperties = filteredProperties.slice(startIndex, endIndex);
    
    res.json({
      properties: paginatedProperties,
      total: filteredProperties.length,
      page,
      pages: Math.ceil(filteredProperties.length / limit),
      filters: getActiveFilters(advancedFilters)
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get single property with full details
app.get('/api/properties/:id', async (req, res) => {
  try {
    const { db, scraper } = ensureServices();
    
    // Check if database is connected
    if (!db || !db.isConnected) {
      return res.status(503).json({ 
        error: 'Database is still connecting. Please try again in a moment.' 
      });
    }
    
    const { id } = req.params;
    const result = await db.query('SELECT * FROM properties WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const property = result.rows[0];
    
    // Track view
    await db.query('INSERT INTO property_views (property_id, user_id) VALUES ($1, $2)', 
      [id, req.headers['x-user-id'] || 'anonymous']);
    
    // Get similar properties
    const similar = await getSimilarProperties(property);
    
    // Calculate affordability
    const affordability = calculateAffordability(property);
    
    res.json({
      property,
      similar,
      affordability,
      mortgage: scraper.calculateMortgage(
        property.price,
        property.price * CONFIG.RECOMMENDED_DOWN_PAYMENT_RATIO, // recommended down payment
        CONFIG.DEFAULT_INTEREST_RATE * 100, // interest rate percentage
        CONFIG.DEFAULT_AMORTIZATION_YEARS // years
      )
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Search properties by MLS number
app.get('/api/properties/mls/:mlsNumber', async (req, res) => {
  try {
    const { mlsNumber } = req.params;
    const result = await db.query('SELECT * FROM properties WHERE mls_number = $1', [mlsNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching property by MLS:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// ============== FINANCIAL ENDPOINTS ==============

// Mortgage calculator
app.post('/api/calculator/mortgage', (req, res) => {
  try {
    const { scraper } = ensureServices();
    const { price, downPayment, interestRate, amortization } = req.body;
    const result = scraper.calculateMortgage(price, downPayment, interestRate, amortization);
    
    // Add additional calculations
    const landTransferTax = calculateLandTransferTax(price);
    const cmhcInsurance = calculateCMHCInsurance(price, downPayment);
    
    res.json({
      ...result,
      landTransferTax,
      cmhcInsurance,
      totalClosingCosts: landTransferTax + cmhcInsurance + CONFIG.DEFAULT_CLOSING_COSTS // notary, inspection, etc.
    });
  } catch (error) {
    console.error('Error calculating mortgage:', error);
    res.status(500).json({ error: 'Failed to calculate mortgage' });
  }
});

// Borrowing capacity calculator
app.post('/api/calculator/borrowing-capacity', (req, res) => {
  try {
    const { income, monthlyDebts, downPayment, interestRate } = req.body;
    
    if (!income || income <= 0) {
      return res.status(400).json({ error: 'Valid income is required' });
    }
    
    const borrowingCapacity = scraper.calculateBorrowingCapacity(
      income,
      monthlyDebts || 0,
      downPayment || 0,
      interestRate || 5.25
    );
    
    res.json(borrowingCapacity);
  } catch (error) {
    console.error('Error calculating borrowing capacity:', error);
    res.status(500).json({ error: 'Failed to calculate borrowing capacity' });
  }
});

// Legacy affordability calculator (for backward compatibility)
app.post('/api/calculator/affordability', (req, res) => {
  try {
    const { income, debts, downPayment } = req.body;
    
    // Redirect to new borrowing capacity calculator
    const borrowingCapacity = scraper.calculateBorrowingCapacity(
      income,
      debts || 0,
      downPayment || 0,
      5.25
    );
    
    res.json(borrowingCapacity);
  } catch (error) {
    console.error('Error calculating affordability:', error);
    res.status(500).json({ error: 'Failed to calculate affordability' });
  }
});

// ============== LOCATION ENDPOINTS ==============

// Get neighborhoods with statistics
app.get('/api/neighborhoods', async (req, res) => {
  try {
    // Get neighborhoods with caching
    const neighborhoods = await cache.getOrFetch('neighborhoods', getNeighborhoodStats);
    res.json(neighborhoods);
  } catch (error) {
    console.error('Error fetching neighborhoods:', error);
    res.status(500).json({ error: 'Failed to fetch neighborhoods' });
  }
});

// Get price ranges by area
app.get('/api/price-ranges', async (req, res) => {
  try {
    // Get price ranges with caching
    const priceRanges = await cache.getOrFetch('priceRanges', getPriceRanges);
    res.json(priceRanges);
  } catch (error) {
    console.error('Error fetching price ranges:', error);
    res.status(500).json({ error: 'Failed to fetch price ranges' });
  }
});

// ============== USER INTERACTION ENDPOINTS ==============

// Add to favorites
app.post('/api/favorites', async (req, res) => {
  try {
    const { propertyId } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    await db.query('INSERT INTO favorites (user_id, property_id) VALUES ($1, $2)', 
      [userId, propertyId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Property comparison
app.post('/api/compare', async (req, res) => {
  try {
    const { propertyIds } = req.body;
    
    if (!propertyIds || propertyIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 properties required for comparison' });
    }
    
    const properties = [];
    for (const id of propertyIds) {
      const result = await db.query('SELECT * FROM properties WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        properties.push(result.rows[0]);
      }
    }
    
    const comparison = generateComparison(properties);
    res.json(comparison);
  } catch (error) {
    console.error('Error comparing properties:', error);
    res.status(500).json({ error: 'Failed to compare properties' });
  }
});

// ============== AI CHAT ENDPOINTS ==============

// Natural Language Search Parser
app.post('/api/ai/parse-search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Query is required and must be a string' 
      });
    }

    // Local parsing function (OpenAI integration can be added later)
    function parseSearchQueryLocally(query) {
      const parsed = {
        location: '',
        minPrice: '',
        maxPrice: '',
        bedrooms: '',
        propertyType: '',
        nearMetro: false,
        petsAllowed: false,
        listingType: 'rental'
      };
      
      const lowerQuery = query.toLowerCase();
      
      // Extract location/neighborhood
      const neighborhoods = [
        'plateau', 'mile end', 'downtown', 'old montreal', 'griffintown',
        'ndg', 'villeray', 'rosemont', 'outremont', 'westmount', 'verdun',
        'hochelaga', 'saint-henri', 'little italy', 'chinatown', 'gay village'
      ];
      
      for (const neighborhood of neighborhoods) {
        if (lowerQuery.includes(neighborhood)) {
          parsed.location = neighborhood.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          break;
        }
      }
      
      // Extract price range
      const priceMatches = lowerQuery.match(/\$?(\d{1,4})[k,]?/g);
      if (priceMatches) {
        const prices = priceMatches.map(match => {
          let num = parseInt(match.replace(/\$|,/g, ''));
          if (match.includes('k')) num *= 1000;
          return num;
        }).sort((a, b) => a - b);
        
        if (prices.length >= 2) {
          parsed.minPrice = prices[0].toString();
          parsed.maxPrice = prices[prices.length - 1].toString();
        } else if (prices.length === 1) {
          if (lowerQuery.includes('under') || lowerQuery.includes('below') || lowerQuery.includes('max')) {
            parsed.maxPrice = prices[0].toString();
          } else if (lowerQuery.includes('over') || lowerQuery.includes('above') || lowerQuery.includes('min')) {
            parsed.minPrice = prices[0].toString();
          } else {
            parsed.maxPrice = prices[0].toString();
          }
        }
      }
      
      // Extract bedrooms
      const bedroomMatch = lowerQuery.match(/(\d+)\s*(bed|bedroom)/);
      if (bedroomMatch) {
        parsed.bedrooms = bedroomMatch[1];
      }
      
      // Extract property type
      const propertyTypes = ['apartment', 'condo', 'loft', 'house', 'townhouse'];
      for (const type of propertyTypes) {
        if (lowerQuery.includes(type)) {
          parsed.propertyType = type;
          break;
        }
      }
      
      // Check for metro/transport
      if (lowerQuery.includes('metro') || lowerQuery.includes('subway') || lowerQuery.includes('transport')) {
        parsed.nearMetro = true;
      }
      
      // Check for pets
      if (lowerQuery.includes('pet') || lowerQuery.includes('dog') || lowerQuery.includes('cat')) {
        parsed.petsAllowed = true;
      }
      
      // Determine listing type from context
      if (lowerQuery.includes('buy') || lowerQuery.includes('purchase') || lowerQuery.includes('sale')) {
        parsed.listingType = 'purchase';
      } else if (lowerQuery.includes('rent') || lowerQuery.includes('rental')) {
        parsed.listingType = 'rental';
      }
      
      return parsed;
    }
    
    const parsedData = parseSearchQueryLocally(query);
    res.json(parsedData);
    
  } catch (error) {
    console.error('Error in AI search parsing:', error);
    res.status(500).json({ 
      error: 'Failed to parse search query',
      details: error.message 
    });
  }
});

// AI chat with financial advice
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, propertyId, context } = req.body;
    
    let property = null;
    if (propertyId) {
      const result = await db.query('SELECT * FROM properties WHERE id = $1', [propertyId]);
      property = result.rows[0];
    }
    
    const response = generateEnhancedAIResponse(message, property, context);
    
    res.json({
      response,
      suggestions: getAISuggestions(message, property),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Unified AI chat (for general and saved properties chat)
app.post('/api/ai/unified-chat', async (req, res) => {
  try {
    const { message, chatMode, savedProperties } = req.body;
    
    let response = '';
    
    if (chatMode === 'saved') {
      if (savedProperties && savedProperties.length > 0) {
        response = `I can help you with your ${savedProperties.length} saved properties! Ask me about comparing them, analyzing their investment potential, or getting more details about specific properties.`;
      } else {
        response = "You haven't saved any properties yet. Browse the listings and click the heart icon to save properties you're interested in!";
      }
    } else {
      response = generateEnhancedAIResponse(message, null, null);
    }
    
    res.json({
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in unified AI chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// ============== SCRAPER ENDPOINTS ==============

// Import properties from Centris
app.post('/api/admin/import-properties', async (req, res) => {
  try {
    const { listingType, limit = 50 } = req.body;
    
    const properties = await scraper.searchProperties({
      listingType,
      limit
    });
    
    res.json({
      success: true,
      imported: properties.length,
      properties
    });
  } catch (error) {
    console.error('Error importing properties:', error);
    res.status(500).json({ error: 'Failed to import properties' });
  }
});

// Refresh properties from Centris
app.post('/api/admin/refresh-properties', async (req, res) => {
  try {
    const { db } = ensureServices();
    console.log('🔄 Starting property refresh from Centris...');
    
    // Clear existing cache
    cache.clear('properties');
    
    // Reinitialize database with fresh data
    await db.initializeData();
    
    // Get count of new properties
    const result = await db.query('SELECT COUNT(*) as count FROM properties WHERE status = $1', ['active']);
    const count = result.rows[0]?.count || 0;
    
    res.json({
      success: true,
      message: `Successfully refreshed ${count} properties from Centris`,
      count: parseInt(count)
    });
  } catch (error) {
    console.error('Error refreshing properties:', error);
    res.status(500).json({ 
      error: 'Failed to refresh properties',
      details: error.message 
    });
  }
});

// Duplicate endpoint removed - kept comprehensive version below

// ============== HELPER FUNCTIONS ==============

function applyAdvancedFilters(properties, filters) {
  return properties.filter(property => {
    // Basic filters
    if (filters.listingType && property.listing_type !== filters.listingType) return false;
    if (filters.propertyType && property.property_type !== filters.propertyType) return false;
    if (filters.minPrice && property.price < parseInt(filters.minPrice)) return false;
    if (filters.maxPrice && property.price > parseInt(filters.maxPrice)) return false;
    if (filters.bedrooms && property.bedrooms < parseInt(filters.bedrooms)) return false;
    if (filters.bathrooms && property.bathrooms < parseInt(filters.bathrooms)) return false;
    
    // Location filters
    if (filters.neighborhood && property.neighborhood !== filters.neighborhood) return false;
    if (filters.district && property.district !== filters.district) return false;
    if (filters.nearMetro === 'true' && property.proximity.metro > CONFIG.MAX_METRO_DISTANCE) return false;
    if (filters.nearSchool === 'true' && property.proximity.elementary_school > CONFIG.MAX_SCHOOL_DISTANCE) return false;
    
    // Size filters
    if (filters.minSqft && property.living_area_sqft < parseInt(filters.minSqft)) return false;
    if (filters.maxSqft && property.living_area_sqft > parseInt(filters.maxSqft)) return false;
    
    // Feature filters
    if (filters.parking === 'true' && property.garage.spaces === 0) return false;
    if (filters.pool === 'true' && !property.amenities.some(a => a.toLowerCase().includes('pool'))) return false;
    if (filters.gym === 'true' && !property.amenities.some(a => a.toLowerCase().includes('gym'))) return false;
    if (filters.elevator === 'true' && !property.amenities.some(a => a.toLowerCase().includes('elevator'))) return false;
    if (filters.furnished && property.furnished !== filters.furnished) return false;
    if (filters.petsAllowed === 'true' && !property.pets_allowed) return false;
    
    // Financial filters
    if (filters.maxCondoFees && property.condo_fees?.monthly > parseInt(filters.maxCondoFees)) return false;
    if (filters.maxTaxes && property.taxes?.total_annual > parseInt(filters.maxTaxes)) return false;
    
    // Age filters
    if (filters.minYearBuilt && property.year_built < parseInt(filters.minYearBuilt)) return false;
    if (filters.newConstruction === 'true' && property.year_built < new Date().getFullYear() - CONFIG.NEW_CONSTRUCTION_YEARS) return false;
    
    return true;
  });
}

function sortProperties(properties, sortBy, sortOrder) {
  const sorted = [...properties].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'price':
        aVal = a.price;
        bVal = b.price;
        break;
      case 'size':
        aVal = a.living_area_sqft;
        bVal = b.living_area_sqft;
        break;
      case 'bedrooms':
        aVal = a.bedrooms;
        bVal = b.bedrooms;
        break;
      case 'date':
        aVal = new Date(a.listing_date).getTime();
        bVal = new Date(b.listing_date).getTime();
        break;
      case 'pricePerSqft':
        aVal = a.price_per_sqft;
        bVal = b.price_per_sqft;
        break;
      default:
        aVal = a.price;
        bVal = b.price;
    }
    
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  return sorted;
}

function getActiveFilters(filters) {
  const active = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'price' && value !== 'asc') {
      active[key] = value;
    }
  });
  return active;
}

async function getSimilarProperties(property) {
  const allProperties = cache.get('properties') || [];
  
  // Find properties with similar characteristics
  const similar = allProperties
    .filter(p => 
      p.id !== property.id &&
      p.listing_type === property.listing_type &&
      p.neighborhood === property.neighborhood &&
      Math.abs(p.price - property.price) / property.price < CONFIG.PRICE_SIMILARITY_THRESHOLD && // Within similarity threshold
      Math.abs(p.bedrooms - property.bedrooms) <= 1
    )
    .slice(0, 4);
  
  return similar;
}

function calculateAffordability(property) {
  // Standard affordability ratios
  const monthlyPayment = property.listing_type === 'purchase' ? 
    property.monthly_costs?.total || 0 :
    property.price;
  
  const requiredIncome = monthlyPayment * 12 * CONFIG.INCOME_MULTIPLIER; // income multiplier
  
  return {
    monthlyPayment,
    requiredIncome,
    downPaymentMin: property.listing_type === 'purchase' ? property.price * CONFIG.MIN_DOWN_PAYMENT_RATIO : property.price * 2,
    downPaymentRecommended: property.listing_type === 'purchase' ? property.price * CONFIG.RECOMMENDED_DOWN_PAYMENT_RATIO : property.price * 3
  };
}

function calculateLandTransferTax(price) {
  // Quebec land transfer tax calculation
  let tax = 0;
  
  CONFIG.TAX_BRACKETS.forEach(bracket => {
    if (price > bracket.min) {
      const taxableAmount = Math.min(price - bracket.min, bracket.max - bracket.min);
      tax += taxableAmount * bracket.rate;
    }
  });
  
  return Math.round(tax);
}

function calculateCMHCInsurance(price, downPayment) {
  const ltv = (price - downPayment) / price;
  
  // Find applicable CMHC rate based on LTV
  const cmhcRate = CONFIG.CMHC_RATES.find(r => ltv <= r.maxLTV);
  if (!cmhcRate || cmhcRate.rate === 0) return 0;
  
  return Math.round((price - downPayment) * cmhcRate.rate);
}

function calculateMaxAffordable(income, debts, downPayment) {
  // Gross Debt Service (GDS) ratio
  const monthlyIncome = income / 12;
  const maxMonthlyPayment = monthlyIncome * CONFIG.GDS_RATIO - debts;
  
  // Calculate max purchase price based on payment
  const interestRate = CONFIG.DEFAULT_INTEREST_RATE / 12;
  const numPayments = CONFIG.DEFAULT_AMORTIZATION_YEARS * 12;
  
  const maxLoan = maxMonthlyPayment * 
    ((Math.pow(1 + interestRate, numPayments) - 1) / 
    (interestRate * Math.pow(1 + interestRate, numPayments)));
  
  const maxPrice = maxLoan + downPayment;
  
  return {
    maxPrice: Math.round(maxPrice),
    maxLoan: Math.round(maxLoan),
    maxMonthlyPayment: Math.round(maxMonthlyPayment),
    gdsRatio: CONFIG.GDS_RATIO * 100,
    assumptions: {
      interestRate: CONFIG.DEFAULT_INTEREST_RATE * 100,
      amortization: CONFIG.DEFAULT_AMORTIZATION_YEARS,
      propertyTax: Math.round(maxPrice * 0.01), // 1% estimate
      heating: 100
    }
  };
}

async function getNeighborhoodStats() {
  const properties = cache.get('properties') || [];
  const neighborhoods = {};
  
  properties.forEach(property => {
    if (!neighborhoods[property.neighborhood]) {
      neighborhoods[property.neighborhood] = {
        name: property.neighborhood,
        district: property.district,
        properties: [],
        avgPrice: 0,
        avgPricePerSqft: 0,
        avgSize: 0,
        totalListings: 0
      };
    }
    
    neighborhoods[property.neighborhood].properties.push(property);
  });
  
  // Calculate statistics
  Object.values(neighborhoods).forEach(hood => {
    hood.totalListings = hood.properties.length;
    
    const rentalProps = hood.properties.filter(p => p.listing_type === 'rental');
    const purchaseProps = hood.properties.filter(p => p.listing_type === 'purchase');
    
    if (rentalProps.length > 0) {
      hood.avgRent = Math.round(
        rentalProps.reduce((sum, p) => sum + p.price, 0) / rentalProps.length
      );
    }
    
    if (purchaseProps.length > 0) {
      hood.avgPurchasePrice = Math.round(
        purchaseProps.reduce((sum, p) => sum + p.price, 0) / purchaseProps.length
      );
    }
    
    hood.avgSize = Math.round(
      hood.properties.reduce((sum, p) => sum + p.living_area_sqft, 0) / hood.properties.length
    );
    
    hood.avgPricePerSqft = Math.round(
      hood.properties.reduce((sum, p) => sum + p.price_per_sqft, 0) / hood.properties.length
    );
    
    delete hood.properties; // Remove raw data
  });
  
  return Object.values(neighborhoods);
}

async function getPriceRanges() {
  const properties = cache.get('properties') || [];
  
  const ranges = {
    rental: {
      studio: { min: Infinity, max: 0, avg: 0, count: 0 },
      oneBed: { min: Infinity, max: 0, avg: 0, count: 0 },
      twoBed: { min: Infinity, max: 0, avg: 0, count: 0 },
      threePlusBed: { min: Infinity, max: 0, avg: 0, count: 0 }
    },
    purchase: {
      under500k: { count: 0, avgPricePerSqft: 0 },
      '500kTo750k': { count: 0, avgPricePerSqft: 0 },
      '750kTo1m': { count: 0, avgPricePerSqft: 0 },
      over1m: { count: 0, avgPricePerSqft: 0 }
    }
  };
  
  properties.forEach(property => {
    if (property.listing_type === 'rental') {
      let category;
      if (property.bedrooms === CONFIG.BEDROOM_CATEGORIES.STUDIO.bedrooms) category = CONFIG.BEDROOM_CATEGORIES.STUDIO.label;
      else if (property.bedrooms === CONFIG.BEDROOM_CATEGORIES.ONE_BED.bedrooms) category = CONFIG.BEDROOM_CATEGORIES.ONE_BED.label;
      else if (property.bedrooms === CONFIG.BEDROOM_CATEGORIES.TWO_BED.bedrooms) category = CONFIG.BEDROOM_CATEGORIES.TWO_BED.label;
      else category = CONFIG.BEDROOM_CATEGORIES.THREE_PLUS.label;
      
      ranges.rental[category].min = Math.min(ranges.rental[category].min, property.price);
      ranges.rental[category].max = Math.max(ranges.rental[category].max, property.price);
      ranges.rental[category].avg += property.price;
      ranges.rental[category].count++;
    } else {
      let category;
      if (property.price < CONFIG.PRICE_CATEGORIES.UNDER_500K.max) category = CONFIG.PRICE_CATEGORIES.UNDER_500K.label;
      else if (property.price < CONFIG.PRICE_CATEGORIES.TO_750K.max) category = CONFIG.PRICE_CATEGORIES.TO_750K.label;
      else if (property.price < CONFIG.PRICE_CATEGORIES.TO_1M.max) category = CONFIG.PRICE_CATEGORIES.TO_1M.label;
      else category = CONFIG.PRICE_CATEGORIES.OVER_1M.label;
      
      ranges.purchase[category].count++;
      ranges.purchase[category].avgPricePerSqft += property.price_per_sqft;
    }
  });
  
  // Calculate averages
  Object.values(ranges.rental).forEach(range => {
    if (range.count > 0) {
      range.avg = Math.round(range.avg / range.count);
    }
  });
  
  Object.values(ranges.purchase).forEach(range => {
    if (range.count > 0) {
      range.avgPricePerSqft = Math.round(range.avgPricePerSqft / range.count);
    }
  });
  
  return ranges;
}

function generateComparison(properties) {
  const comparison = {
    properties: properties.map(p => ({
      id: p.id,
      address: p.address,
      price: p.price,
      pricePerSqft: p.price_per_sqft,
      size: p.living_area_sqft,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      yearBuilt: p.year_built,
      taxes: p.taxes?.total_annual,
      condoFees: p.condo_fees?.monthly,
      parking: p.garage.spaces,
      amenities: p.amenities,
      daysOnMarket: p.days_on_market
    })),
    analysis: {
      bestValue: null,
      lowestPrice: null,
      largestSize: null,
      lowestMaintenance: null,
      mostAmenities: null
    }
  };
  
  // Analyze
  comparison.analysis.lowestPrice = properties.reduce((min, p) => 
    p.price < min.price ? p : min
  ).id;
  
  comparison.analysis.bestValue = properties.reduce((best, p) => 
    p.price_per_sqft < best.price_per_sqft ? p : best
  ).id;
  
  comparison.analysis.largestSize = properties.reduce((max, p) => 
    p.living_area_sqft > max.living_area_sqft ? p : max
  ).id;
  
  if (properties[0].listing_type === 'purchase') {
    comparison.analysis.lowestMaintenance = properties.reduce((min, p) => {
      const maintenance = (p.taxes?.total_annual || 0) + ((p.condo_fees?.monthly || 0) * 12);
      const minMaintenance = (min.taxes?.total_annual || 0) + ((min.condo_fees?.monthly || 0) * 12);
      return maintenance < minMaintenance ? p : min;
    }).id;
  }
  
  comparison.analysis.mostAmenities = properties.reduce((max, p) => 
    p.amenities.length > max.amenities.length ? p : max
  ).id;
  
  return comparison;
}

function generateEnhancedAIResponse(message, property, context) {
  const messageLower = message.toLowerCase();
  
  // Financial questions
  if (messageLower.includes('afford') || messageLower.includes('income')) {
    const affordability = property ? calculateAffordability(property) : null;
    return ResponseBuilder.buildAffordabilityResponse(property, affordability);
  }
  
  // Mortgage questions
  if (messageLower.includes('mortgage') || messageLower.includes('monthly payment')) {
    const mortgage = property && property.listing_type === 'purchase' 
      ? scraper.calculateMortgage(property.price, property.price * CONFIG.RECOMMENDED_DOWN_PAYMENT_RATIO, CONFIG.DEFAULT_INTEREST_RATE * 100, CONFIG.DEFAULT_AMORTIZATION_YEARS)
      : null;
    return ResponseBuilder.buildMortgageResponse(property, mortgage, scraper);
  }
  
  // Borrowing capacity questions
  if (messageLower.includes('borrow') || messageLower.includes('qualify') || messageLower.includes('pre-approved')) {
    return "I can help you determine how much you can borrow! Your borrowing capacity depends on your income, monthly debts, and down payment. Canadian lenders typically use a 39% Gross Debt Service (GDS) ratio and 44% Total Debt Service (TDS) ratio. Would you like me to calculate your borrowing capacity? I'll need your annual income, monthly debt payments, and planned down payment.";
  }
  
  // CMHC insurance questions
  if (messageLower.includes('cmhc') || messageLower.includes('insurance') || messageLower.includes('down payment')) {
    return "CMHC insurance is required for down payments under 20%. The premium ranges from 2.8% to 4.0% of your loan amount: 4.0% for 5-9.99% down, 3.1% for 10-14.99% down, and 2.8% for 15-19.99% down. This premium can be added to your mortgage. For a $500,000 home with 10% down, you'd pay about $13,950 in CMHC insurance. Would you like me to calculate the exact amount for a specific property?";
  }
  
  // Closing costs questions
  if (messageLower.includes('closing') || messageLower.includes('lawyer') || messageLower.includes('notary')) {
    return "Closing costs in Quebec typically range from 2-4% of the purchase price and include: Quebec Land Transfer Tax (Welcome Tax) - varies by price, Notary fees (~$1,000-2,000), Home inspection (~$500), Legal fees (~$1,500), Property insurance, and title insurance. For a $500,000 home, budget about $15,000-20,000 for closing costs. Would you like a detailed breakdown for a specific property?";
  }
  
  // Interest rate questions
  if (messageLower.includes('rate') || messageLower.includes('interest')) {
    return "Current mortgage rates in Canada: Fixed rates typically range from 5.0-6.5% for 5-year terms, variable rates from 5.5-7.0%. The Bank of Canada's qualifying rate (stress test) is currently 7.25%. Your actual rate depends on your credit score, down payment, and lender. Even a 0.5% difference can save thousands over your mortgage term. Would you like me to calculate payment differences for various rates?";
  }
  
  // Investment questions
  if (messageLower.includes('investment') || messageLower.includes('roi') || messageLower.includes('rental income')) {
    return ResponseBuilder.buildInvestmentResponse(property);
  }
  
  // Neighborhood questions
  if (messageLower.includes('neighborhood') || messageLower.includes('area')) {
    return ResponseBuilder.buildNeighborhoodResponse(property);
  }
  
  // Comparative market analysis
  if (messageLower.includes('compare') || messageLower.includes('vs') || messageLower.includes('better')) {
    return "I can help you compare properties based on price per square foot, location, amenities, and investment potential. You can save properties to your favorites and I'll provide a detailed comparison. Which properties would you like to compare?";
  }
  
  // First-time buyer questions
  if (messageLower.includes('first time') || messageLower.includes('first-time')) {
    return "Great! As a first-time buyer in Quebec, you may qualify for: 1) Home Buyers' Plan (HBP) - withdraw up to $35,000 from your RRSP tax-free, 2) First-Time Home Buyer Incentive - 5-10% shared equity mortgage, 3) GST/QST rebate on new constructions. You'll need at least 5% down payment for homes under $500,000. Would you like help calculating your budget?";
  }
  
  // Process questions
  if (messageLower.includes('process') || messageLower.includes('steps') || messageLower.includes('how to buy')) {
    return "The home buying process in Montreal typically involves: 1) Pre-approval for mortgage, 2) Property search with a real estate agent, 3) Making an offer (Promise to Purchase), 4) Home inspection, 5) Finalizing mortgage, 6) Notary appointment for deed transfer. The whole process usually takes 30-90 days. What stage are you at?";
  }
  
  // Tax questions
  if (messageLower.includes('tax') || messageLower.includes('property tax')) {
    if (property && property.listing_type === 'purchase') {
      return `This property has annual taxes of $${property.taxes.total_annual.toLocaleString()} (Municipal: $${property.taxes.municipal.amount.toLocaleString()}, School: $${property.taxes.school.amount.toLocaleString()}). The municipal assessment is $${property.municipal_assessment.total_value.toLocaleString()}, which determines your tax rate. Property taxes in Montreal average 0.7-1.2% of assessed value annually.`;
    }
    return "Property taxes in Montreal vary by borough and property value. They typically range from 0.7% to 1.2% of the municipal assessment annually. The city reassesses properties every 3 years. Which property's taxes would you like to know about?";
  }
  
  // Default to standard response
  return generateStandardAIResponse(message, property);
}

function generateStandardAIResponse(message, property) {
  // Use the original AI response logic for standard queries
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('hello') || messageLower.includes('hi')) {
    return "Hello! I'm your AI real estate assistant with expertise in Montreal's market. I can help you with property searches, financial calculations, neighborhood insights, investment analysis, and guide you through the buying or renting process. What would you like to know?";
  }
  
  if (property) {
    return ResponseBuilder.buildPropertySummary(property);
  }
  
  return "I'm here to help with all your Montreal real estate needs! I can assist with property searches, financial planning, neighborhood information, and investment analysis. What can I help you with today?";
}

function getAISuggestions(message, property) {
  const suggestions = [];
  
  if (property) {
    suggestions.push(
      "Calculate my monthly payments",
      "What income do I need?",
      "Tell me about the neighborhood",
      "Compare with similar properties"
    );
    
    if (property.listing_type === 'purchase') {
      suggestions.push(
        "Is this a good investment?",
        "What are the closing costs?"
      );
    }
  } else {
    suggestions.push(
      "What can I afford with my income?",
      "Best neighborhoods for families",
      "First-time buyer programs",
      "Current mortgage rates"
    );
  }
  
  return suggestions;
}

// ============== SCRAPER MANAGEMENT ENDPOINTS ==============

// Get scraper status and statistics
app.get('/api/admin/scraper-status', async (req, res) => {
  try {
    const stats = await scheduler.getScrapingStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting scraper status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manually trigger full scrape
app.post('/api/admin/scrape/full', async (req, res) => {
  try {
    // Run in background
    scheduler.triggerFullScrape().catch(err => {
      console.error('Full scrape error:', err);
    });
    
    res.json({
      success: true,
      message: 'Full scrape started in background'
    });
  } catch (error) {
    console.error('Error triggering full scrape:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manually trigger incremental scrape
app.post('/api/admin/scrape/incremental', async (req, res) => {
  try {
    // Run in background
    scheduler.triggerIncrementalScrape().catch(err => {
      console.error('Incremental scrape error:', err);
    });
    
    res.json({
      success: true,
      message: 'Incremental scrape started in background'
    });
  } catch (error) {
    console.error('Error triggering incremental scrape:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manually trigger price updates
app.post('/api/admin/scrape/prices', async (req, res) => {
  try {
    // Run in background
    scheduler.triggerPriceUpdates().catch(err => {
      console.error('Price updates error:', err);
    });
    
    res.json({
      success: true,
      message: 'Price updates started in background'
    });
  } catch (error) {
    console.error('Error triggering price updates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add proxy to pool
app.post('/api/admin/proxies', async (req, res) => {
  try {
    const { ip_address, port, protocol = 'http', username, password } = req.body;
    
    if (!ip_address || !port) {
      return res.status(400).json({
        success: false,
        error: 'IP address and port are required'
      });
    }
    
    await db.query(
      'INSERT INTO proxy_pool (ip_address, port, protocol, username, password) VALUES ($1, $2, $3, $4, $5)',
      [ip_address, port, protocol, username, password]
    );
    
    res.json({
      success: true,
      message: 'Proxy added successfully'
    });
  } catch (error) {
    console.error('Error adding proxy:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get proxy pool status
app.get('/api/admin/proxies', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ip_address, port, protocol, is_active, success_rate, last_used, last_tested
      FROM proxy_pool
      ORDER BY success_rate DESC, last_used ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting proxy pool:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Database health endpoint
app.get('/api/admin/database-health', async (req, res) => {
  try {
    const { db } = ensureServices();
    
    if (!db) {
      return res.json({
        success: true,
        data: {
          connected: false,
          status: 'initializing',
          message: 'Database service is starting up'
        }
      });
    }
    
    if (!db.isConnected) {
      return res.json({
        success: true,
        data: {
          connected: false,
          status: 'connecting',
          message: 'Database connection in progress'
        }
      });
    }
    
    const health = await db.getHealthStatus();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error getting database health:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve client app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

// Background database initialization
async function initializeDatabaseBackground() {
  try {
    console.log('⏳ Initializing database connection in background...');
    
    // Initialize services first
    const { db, scheduler } = ensureServices();
    
    const connected = await db.waitForConnection(60); // 60 attempts (1 minute)
    
    if (!connected) {
      console.error('❌ Failed to connect to database');
      return;
    }
    
    console.log('✅ Database connected successfully');
    
    // Initialize with data if needed
    try {
      const result = await db.query('SELECT COUNT(*) as count FROM properties WHERE status = $1', ['active']);
      const count = result.rows[0]?.count || 0;
      
      if (count === 0) {
        console.log('🌐 Fetching fresh property data from Centris.ca...');
        await db.initializeData();
        console.log('✅ Database initialized with Centris property data');
      } else {
        console.log(`✅ Database already contains ${count} properties`);
      }
      
      // Start the scraper scheduler after database is ready
      try {
        scheduler.startScheduler();
        console.log('✅ Scraper scheduler started successfully');
      } catch (error) {
        console.error('❌ Error starting scheduler:', error.message);
      }
      
    } catch (error) {
      console.error('⚠️  Warning: Could not initialize Centris data:', error.message);
      console.log('📝 Mock data will be served until Centris data is available');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// Start server with proper initialization
async function startServer() {
  try {
    console.log('🚀 Starting ChatLease server immediately...');
    
    // Start the server without waiting for database
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🏠 ChatLease Server with Real Centris Scraping');
      console.log('=' .repeat(60));
      console.log(`🌐 Website: http://localhost:${PORT}`);
      console.log(`📊 API Endpoints:`);
      console.log(`   Properties: http://localhost:${PORT}/api/properties`);
      console.log(`   Property Details: http://localhost:${PORT}/api/properties/:id`);
      console.log(`   Neighborhoods: http://localhost:${PORT}/api/neighborhoods`);
      console.log(`   Price Ranges: http://localhost:${PORT}/api/price-ranges`);
      console.log(`   Mortgage Calculator: http://localhost:${PORT}/api/calculator/mortgage`);
      console.log(`   Borrowing Capacity: http://localhost:${PORT}/api/calculator/borrowing-capacity`);
      console.log(`   AI Chat: http://localhost:${PORT}/api/ai/chat`);
      console.log(`📋 Admin Endpoints:`);
      console.log(`   Scraper Status: http://localhost:${PORT}/api/admin/scraper-status`);
      console.log(`   Trigger Full Scrape: POST http://localhost:${PORT}/api/admin/scrape/full`);
      console.log(`   Trigger Incremental: POST http://localhost:${PORT}/api/admin/scrape/incremental`);
      console.log(`   Proxy Management: http://localhost:${PORT}/api/admin/proxies`);
      console.log(`   Database Health: http://localhost:${PORT}/api/admin/database-health`);
      console.log('=' .repeat(60));
      console.log('\n✨ Features include:');
      console.log('   • Real Centris scraping with rate limiting');
      console.log('   • PostgreSQL persistent database');
      console.log('   • Automated scheduling (every 6 hours full, hourly incremental)');
      console.log('   • Proxy rotation for reliability');
      console.log('   • Financial calculators (mortgage, affordability)');
      console.log('   • Neighborhood statistics and proximity data');
      console.log('   • Property comparison tool');
      console.log('   • Investment analysis');
      console.log('   • AI assistant with financial expertise');
      console.log('\n🚀 Server is ready!');
      
      // Initialize database in background (includes scheduler startup)
      initializeDatabaseBackground();
    });
    
    server.on('error', (error) => {
      console.error('❌ Failed to start server:', error.message);
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Try killing the process using:\n  lsof -ti:${PORT} | xargs kill -9`);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Server startup error:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down ChatLease server...');
  try {
    const { db } = ensureServices();
    if (db && db.end) {
      await db.end();
    }
  } catch (error) {
    console.error('Error during shutdown:', error.message);
  }
  process.exit(0);
});

module.exports = app;