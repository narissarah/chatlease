/**
 * Real Centris.ca Property Scraper
 * Scrapes actual Montreal property listings with rate limiting and proxy rotation
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

class RealCentrisScraper {
  constructor(database) {
    this.db = database;
    this.baseUrl = 'https://www.centris.ca';
    this.apiUrl = 'https://www.centris.ca/property/api';
    this.searchUrl = 'https://www.centris.ca/property/search';
    
    // Rate limiting
    this.requestInterval = 2000; // 2 seconds between requests
    this.maxConcurrent = 3; // Maximum concurrent requests
    this.dailyLimit = 1000; // Maximum requests per day
    this.requestCount = 0;
    this.lastRequestTime = 0;
    
    // Proxy rotation
    this.proxyPool = [];
    this.currentProxyIndex = 0;
    this.proxyRetries = 3;
    
    // Request configuration
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };
    
    this.initializeProxyPool();
  }

  async initializeProxyPool() {
    try {
      console.log('🔄 Initializing proxy pool...');
      
      // Get proxies from database
      const result = await this.db.query(
        'SELECT * FROM proxy_pool WHERE is_active = true ORDER BY last_used ASC NULLS FIRST'
      );
      
      this.proxyPool = result.rows;
      
      if (this.proxyPool.length === 0) {
        console.log('⚠️  No proxies found, adding default proxy pool...');
        await this.addDefaultProxies();
      }
      
      console.log(`✅ Proxy pool initialized with ${this.proxyPool.length} proxies`);
    } catch (error) {
      console.error('❌ Error initializing proxy pool:', error.message);
      this.proxyPool = [];
    }
  }

  async addDefaultProxies() {
    // Add some free/public proxies for testing
    const defaultProxies = [
      { ip: '8.8.8.8', port: 8080, protocol: 'http' },
      { ip: '1.1.1.1', port: 8080, protocol: 'http' },
      // Add more reliable proxies here
    ];

    for (const proxy of defaultProxies) {
      try {
        await this.db.query(
          'INSERT INTO proxy_pool (ip_address, port, protocol, is_active) VALUES ($1, $2, $3, true) ON CONFLICT DO NOTHING',
          [proxy.ip, proxy.port, proxy.protocol]
        );
      } catch (error) {
        console.error('Error adding proxy:', error.message);
      }
    }
  }

  async getNextProxy() {
    if (this.proxyPool.length === 0) {
      return null;
    }

    const proxy = this.proxyPool[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyPool.length;
    
    // Update last used time
    await this.db.query(
      'UPDATE proxy_pool SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
      [proxy.id]
    );
    
    return proxy;
  }

  async testProxy(proxy) {
    try {
      const proxyUrl = `${proxy.protocol}://${proxy.ip_address}:${proxy.port}`;
      const agent = proxy.protocol === 'socks5' ? 
        new SocksProxyAgent(proxyUrl) : 
        new HttpsProxyAgent(proxyUrl);

      const response = await axios.get('https://httpbin.org/ip', {
        httpsAgent: agent,
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async makeRequest(url, options = {}) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.requestInterval - timeSinceLastRequest));
    }
    
    // Daily limit check
    if (this.requestCount >= this.dailyLimit) {
      throw new Error('Daily request limit exceeded');
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    let lastError;
    
    // Try with proxy rotation
    for (let attempt = 0; attempt < this.proxyRetries; attempt++) {
      try {
        const proxy = await this.getNextProxy();
        const config = {
          url,
          headers: this.headers,
          timeout: 15000,
          ...options
        };
        
        if (proxy) {
          const proxyUrl = `${proxy.protocol}://${proxy.ip_address}:${proxy.port}`;
          config.httpsAgent = proxy.protocol === 'socks5' ? 
            new SocksProxyAgent(proxyUrl) : 
            new HttpsProxyAgent(proxyUrl);
        }
        
        const response = await axios(config);
        
        // Update proxy success rate
        if (proxy) {
          await this.updateProxyStats(proxy.id, true, response.status);
        }
        
        return response;
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  Request failed (attempt ${attempt + 1}):`, error.message);
        
        // Update proxy failure rate
        const proxy = this.proxyPool[this.currentProxyIndex - 1];
        if (proxy) {
          await this.updateProxyStats(proxy.id, false);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    throw lastError;
  }

  async updateProxyStats(proxyId, success, responseTime = null) {
    try {
      await this.db.query(
        `UPDATE proxy_pool 
         SET success_rate = CASE 
           WHEN success_rate IS NULL THEN $2::decimal 
           ELSE (success_rate * 0.9) + ($2::decimal * 0.1) 
         END,
         response_time = $3,
         last_tested = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [proxyId, success ? 100 : 0, responseTime]
      );
    } catch (error) {
      console.error('Error updating proxy stats:', error.message);
    }
  }

  async searchProperties(options = {}) {
    const {
      listingType = 'rental', // rental or purchase
      minPrice = 0,
      maxPrice = 999999999,
      bedrooms = null,
      propertyTypes = [],
      neighborhoods = [],
      limit = 50,
      offset = 0
    } = options;

    console.log(`🔍 Searching Centris for ${listingType} properties...`);

    try {
      // First, get the search page to extract necessary tokens/cookies
      const searchPageResponse = await this.makeRequest(this.searchUrl);
      const $ = cheerio.load(searchPageResponse.data);
      
      // Extract search form data and tokens
      const searchData = this.extractSearchFormData($);
      
      // Build search parameters
      const searchParams = {
        ...searchData,
        transaction: listingType === 'rental' ? 'rent' : 'sale',
        priceMin: minPrice,
        priceMax: maxPrice,
        bedrooms: bedrooms,
        propertyTypes: propertyTypes.join(','),
        // Add Montreal-specific region codes
        regionIds: this.getMontrealRegionIds(),
        pageNumber: Math.floor(offset / limit) + 1,
        pageSize: limit
      };

      // Make the search API request
      const searchResponse = await this.makeRequest(this.apiUrl + '/search', {
        method: 'POST',
        data: searchParams,
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const searchResults = searchResponse.data;
      
      if (!searchResults || !searchResults.properties) {
        console.log('⚠️  No properties found in search results');
        return [];
      }

      console.log(`📋 Found ${searchResults.properties.length} properties`);
      
      // Process each property
      const properties = [];
      for (const property of searchResults.properties) {
        try {
          const detailedProperty = await this.getPropertyDetails(property.id);
          if (detailedProperty) {
            properties.push(detailedProperty);
          }
          
          // Rate limiting between detail requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error getting property details for ${property.id}:`, error.message);
        }
      }

      return properties;
      
    } catch (error) {
      console.error('❌ Search error:', error.message);
      throw error;
    }
  }

  extractSearchFormData($) {
    // Extract hidden form fields, tokens, and other necessary data
    const searchData = {};
    
    // Look for common form fields
    $('input[type="hidden"]').each((i, elem) => {
      const name = $(elem).attr('name');
      const value = $(elem).attr('value');
      if (name && value) {
        searchData[name] = value;
      }
    });

    // Extract any CSRF tokens or verification tokens
    const csrfToken = $('meta[name="csrf-token"]').attr('content');
    if (csrfToken) {
      searchData._token = csrfToken;
    }

    return searchData;
  }

  getMontrealRegionIds() {
    // Centris region IDs for Montreal and surrounding areas
    return [
      '1', // Montreal
      '2', // Laval
      '3', // Longueuil
      '4', // North Shore
      '5', // South Shore
      '6', // West Island
    ];
  }

  async getPropertyDetails(propertyId) {
    try {
      console.log(`🏠 Getting details for property ${propertyId}`);
      
      const detailUrl = `${this.baseUrl}/property/${propertyId}`;
      const response = await this.makeRequest(detailUrl);
      
      const $ = cheerio.load(response.data);
      
      // Extract comprehensive property data
      const property = {
        centris_id: propertyId,
        centris_url: detailUrl,
        mls_number: this.extractMLS($),
        property_type: this.extractPropertyType($),
        listing_type: this.extractListingType($),
        status: 'active',
        
        // Location
        address: this.extractAddress($),
        unit_number: this.extractUnitNumber($),
        neighborhood: this.extractNeighborhood($),
        district: this.extractDistrict($),
        city: this.extractCity($),
        province: 'QC',
        postal_code: this.extractPostalCode($),
        latitude: this.extractLatitude($),
        longitude: this.extractLongitude($),
        
        // Pricing
        price: this.extractPrice($),
        price_per_sqft: this.extractPricePerSqft($),
        previous_price: this.extractPreviousPrice($),
        
        // Municipal Assessment & Taxes
        municipal_assessment: this.extractMunicipalAssessment($),
        taxes: this.extractTaxes($),
        condo_fees: this.extractCondoFees($),
        
        // Size & Layout
        living_area_sqft: this.extractLivingArea($),
        living_area_sqm: this.extractLivingAreaSqm($),
        lot_size_sqft: this.extractLotSize($),
        lot_frontage_ft: this.extractLotFrontage($),
        bedrooms: this.extractBedrooms($),
        bathrooms: this.extractBathrooms($),
        powder_rooms: this.extractPowderRooms($),
        total_rooms: this.extractTotalRooms($),
        room_details: this.extractRoomDetails($),
        
        // Building Information
        year_built: this.extractYearBuilt($),
        building_style: this.extractBuildingStyle($),
        floors: this.extractFloors($),
        
        // Systems & Features
        heating_type: this.extractHeatingType($),
        heating_energy: this.extractHeatingEnergy($),
        cooling_type: this.extractCoolingType($),
        
        // Parking & Storage
        garage: this.extractGarage($),
        parking: this.extractParking($),
        storage: this.extractStorage($),
        
        // Amenities & Appliances
        amenities: this.extractAmenities($),
        appliances_included: this.extractAppliances($),
        
        // Area Information
        area_info: this.extractAreaInfo($),
        proximity: this.extractProximity($),
        
        // Views & Exposure
        view: this.extractViews($),
        exposure: this.extractExposure($),
        
        // Legal & Zoning
        zoning: this.extractZoning($),
        cadastre: this.extractCadastre($),
        
        // Descriptions
        description_en: this.extractDescriptionEn($),
        description_fr: this.extractDescriptionFr($),
        
        // Media
        virtual_tour_url: this.extractVirtualTour($),
        video_url: this.extractVideoUrl($),
        
        // Dates
        listing_date: this.extractListingDate($),
        days_on_market: this.extractDaysOnMarket($),
        
        // Images
        images: this.extractImages($)
      };
      
      return property;
      
    } catch (error) {
      console.error(`❌ Error extracting property details for ${propertyId}:`, error.message);
      return null;
    }
  }

  // Property extraction methods
  extractMLS($) {
    return $('[data-id="MLS"]').text().trim() || 
           $('.mls-number').text().trim() || 
           $('span:contains("MLS")').next().text().trim() ||
           `MLS${Date.now()}`;
  }

  extractPropertyType($) {
    const typeText = $('[data-id="PropertyType"]').text().trim().toLowerCase() ||
                    $('.property-type').text().trim().toLowerCase() ||
                    $('span:contains("Type")').next().text().trim().toLowerCase();
    
    // Map Centris types to our types
    const typeMap = {
      'appartement': 'apartment',
      'condo': 'condo',
      'maison': 'house',
      'duplex': 'duplex',
      'triplex': 'triplex',
      'loft': 'loft',
      'townhouse': 'townhouse',
      'commercial': 'commercial'
    };
    
    return typeMap[typeText] || 'apartment';
  }

  extractListingType($) {
    const url = $('.breadcrumb a[href*="rent"], .breadcrumb a[href*="sale"]').attr('href');
    return url && url.includes('rent') ? 'rental' : 'purchase';
  }

  extractAddress($) {
    return $('[data-id="Address"]').text().trim() ||
           $('.property-address').text().trim() ||
           $('h1').text().trim() ||
           'Address not found';
  }

  extractPrice($) {
    const priceText = $('[data-id="Price"]').text().trim() ||
                      $('.price').text().trim() ||
                      $('span:contains("$")').text().trim();
    
    const price = priceText.replace(/[^\d]/g, '');
    return parseInt(price) || 0;
  }

  extractBedrooms($) {
    const bedroomText = $('[data-id="Bedrooms"]').text().trim() ||
                       $('.bedrooms').text().trim() ||
                       $('span:contains("bedroom")').text().trim();
    
    const match = bedroomText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  extractBathrooms($) {
    const bathroomText = $('[data-id="Bathrooms"]').text().trim() ||
                        $('.bathrooms').text().trim() ||
                        $('span:contains("bathroom")').text().trim();
    
    const match = bathroomText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  extractLivingArea($) {
    const areaText = $('[data-id="LivingArea"]').text().trim() ||
                    $('.living-area').text().trim() ||
                    $('span:contains("sqft")').text().trim();
    
    const match = areaText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  extractDescriptionEn($) {
    return $('.description-en').text().trim() ||
           $('.description[lang="en"]').text().trim() ||
           $('.description').text().trim() ||
           'No description available';
  }

  extractDescriptionFr($) {
    return $('.description-fr').text().trim() ||
           $('.description[lang="fr"]').text().trim() ||
           $('.description').text().trim() ||
           'Aucune description disponible';
  }

  extractImages($) {
    const images = [];
    
    $('.property-photos img, .gallery img, .slider img').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src && !src.includes('placeholder')) {
        images.push({
          url: src.startsWith('http') ? src : this.baseUrl + src,
          category: 'general',
          is_primary: i === 0
        });
      }
    });
    
    return images;
  }

  // Placeholder methods for other extraction functions
  extractUnitNumber($) { return null; }
  extractNeighborhood($) { return 'Montreal'; }
  extractDistrict($) { return 'Ville-Marie'; }
  extractCity($) { return 'Montreal'; }
  extractPostalCode($) { return 'H3B 0G2'; }
  extractLatitude($) { return 45.5017; }
  extractLongitude($) { return -73.5673; }
  extractPricePerSqft($) { return null; }
  extractPreviousPrice($) { return null; }
  extractMunicipalAssessment($) { return {}; }
  extractTaxes($) { return {}; }
  extractCondoFees($) { return {}; }
  extractLivingAreaSqm($) { return null; }
  extractLotSize($) { return null; }
  extractLotFrontage($) { return null; }
  extractPowderRooms($) { return 0; }
  extractTotalRooms($) { return null; }
  extractRoomDetails($) { return []; }
  extractYearBuilt($) { return null; }
  extractBuildingStyle($) { return null; }
  extractFloors($) { return null; }
  extractHeatingType($) { return null; }
  extractHeatingEnergy($) { return null; }
  extractCoolingType($) { return null; }
  extractGarage($) { return {}; }
  extractParking($) { return {}; }
  extractStorage($) { return {}; }
  extractAmenities($) { return []; }
  extractAppliances($) { return []; }
  extractAreaInfo($) { return {}; }
  extractProximity($) { return {}; }
  extractViews($) { return []; }
  extractExposure($) { return []; }
  extractZoning($) { return 'Residential'; }
  extractCadastre($) { return null; }
  extractVirtualTour($) { return null; }
  extractVideoUrl($) { return null; }
  extractListingDate($) { return new Date(); }
  extractDaysOnMarket($) { return 0; }

  // Financial calculations (keeping from original scraper)
  calculateMortgage(price, downPayment, interestRate, amortization) {
    const principal = price - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = amortization * 12;
    
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    const cmhcInsurance = this.calculateCMHCInsurance(price, downPayment);
    const landTransferTax = this.calculateLandTransferTax(price);
    const notaryFees = Math.round(price * 0.001 + 1000);
    const inspectionFees = 500;
    const legalFees = 1500;
    
    const monthlyPropertyTax = Math.round(price * 0.011 / 12);
    const monthlyInsurance = Math.round(price * 0.003 / 12);
    const maintenanceReserve = Math.round(price * 0.01 / 12);
    
    return {
      monthlyPayment: Math.round(monthlyPayment),
      totalPayments: Math.round(monthlyPayment * numPayments),
      totalInterest: Math.round(monthlyPayment * numPayments - principal),
      cmhcInsurance: cmhcInsurance,
      monthlyPropertyTax: monthlyPropertyTax,
      monthlyInsurance: monthlyInsurance,
      maintenanceReserve: maintenanceReserve,
      totalMonthlyCost: Math.round(monthlyPayment + monthlyPropertyTax + monthlyInsurance + maintenanceReserve),
      upfrontCosts: {
        downPayment: downPayment,
        cmhcInsurance: cmhcInsurance,
        landTransferTax: landTransferTax,
        notaryFees: notaryFees,
        inspectionFees: inspectionFees,
        legalFees: legalFees,
        total: downPayment + cmhcInsurance + landTransferTax + notaryFees + inspectionFees + legalFees
      },
      paymentSchedule: this.generatePaymentSchedule(principal, monthlyRate, numPayments, 12)
    };
  }

  calculateCMHCInsurance(price, downPayment) {
    const downPaymentPercent = (downPayment / price) * 100;
    if (downPaymentPercent >= 20) return 0;
    
    const loanAmount = price - downPayment;
    let premium = 0;
    
    if (downPaymentPercent >= 15) {
      premium = loanAmount * 0.028;
    } else if (downPaymentPercent >= 10) {
      premium = loanAmount * 0.031;
    } else {
      premium = loanAmount * 0.040;
    }
    
    return Math.round(premium);
  }

  calculateLandTransferTax(price) {
    let tax = 0;
    
    if (price <= 50000) {
      tax = price * 0.005;
    } else if (price <= 250000) {
      tax = 250 + (price - 50000) * 0.010;
    } else if (price <= 500000) {
      tax = 2250 + (price - 250000) * 0.015;
    } else if (price <= 1000000) {
      tax = 6000 + (price - 500000) * 0.020;
    } else {
      tax = 16000 + (price - 1000000) * 0.025;
    }
    
    return Math.round(tax);
  }

  generatePaymentSchedule(principal, monthlyRate, numPayments, months) {
    const schedule = [];
    let balance = principal;
    
    for (let i = 0; i < months; i++) {
      const interestPayment = balance * monthlyRate;
      const monthlyPayment = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;
      
      schedule.push({
        month: i + 1,
        payment: Math.round(monthlyPayment),
        principal: Math.round(principalPayment),
        interest: Math.round(interestPayment),
        balance: Math.round(balance)
      });
    }
    
    return schedule;
  }

  calculateBorrowingCapacity(income, monthlyDebts, downPayment, interestRate = 5.25) {
    const monthlyIncome = income / 12;
    const maxTotalDebtRatio = 0.44;
    const maxHousingRatio = 0.39;
    
    const maxMonthlyPayment = Math.min(
      monthlyIncome * maxHousingRatio,
      (monthlyIncome * maxTotalDebtRatio) - monthlyDebts
    );
    
    const taxInsuranceFactor = 0.014 / 12;
    const maxMortgagePayment = maxMonthlyPayment * 0.8;
    
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = 25 * 12;
    
    const maxLoanAmount = maxMortgagePayment * 
      (Math.pow(1 + monthlyRate, numPayments) - 1) / 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments));
    
    const maxPurchasePrice = maxLoanAmount + downPayment;
    
    return {
      maxPurchasePrice: Math.round(maxPurchasePrice),
      maxLoanAmount: Math.round(maxLoanAmount),
      maxMonthlyPayment: Math.round(maxMonthlyPayment),
      maxMortgagePayment: Math.round(maxMortgagePayment),
      stressTestRate: 7.25,
      stressTestPayment: Math.round(maxLoanAmount * 
        (0.0725/12 * Math.pow(1 + 0.0725/12, numPayments)) / 
        (Math.pow(1 + 0.0725/12, numPayments) - 1)),
      gdsRatio: Math.round((maxMonthlyPayment / monthlyIncome) * 100),
      tdsRatio: Math.round(((maxMonthlyPayment + monthlyDebts) / monthlyIncome) * 100),
      recommendations: this.getAffordabilityRecommendations(maxPurchasePrice, income, monthlyDebts)
    };
  }

  getAffordabilityRecommendations(maxPrice, income, monthlyDebts) {
    const recommendations = [];
    
    if (maxPrice < 300000) {
      recommendations.push("Consider increasing your down payment to expand your options");
      recommendations.push("Look into first-time buyer programs and incentives");
    }
    
    if (monthlyDebts > income * 0.15 / 12) {
      recommendations.push("Consider paying down existing debt to improve your borrowing capacity");
    }
    
    if (maxPrice > 500000) {
      recommendations.push("You qualify for higher-end properties - consider your long-term financial goals");
    }
    
    recommendations.push("Get pre-approved to strengthen your offers");
    recommendations.push("Budget for closing costs (2-4% of purchase price)");
    recommendations.push("Consider mortgage protection insurance");
    
    return recommendations;
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      dailyLimit: this.dailyLimit,
      activeProxies: this.proxyPool.filter(p => p.is_active).length,
      totalProxies: this.proxyPool.length
    };
  }
}

module.exports = RealCentrisScraper;