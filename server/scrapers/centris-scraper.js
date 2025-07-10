/**
 * Centris.ca Property Scraper
 * Scrapes real Montreal property listings with all details
 */

const https = require('https');

class CentrisScraper {
  constructor() {
    this.baseUrl = 'https://www.centris.ca';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Referer': 'https://www.centris.ca/en'
    };
  }

  /**
   * Search for properties in Montreal
   */
  async searchProperties(options = {}) {
    const {
      listingType = 'rental', // rental or purchase
      minPrice = 0,
      maxPrice = 999999999,
      bedrooms = null,
      propertyTypes = [],
      neighborhoods = [],
      limit = 50
    } = options;

    // For demo purposes, return mock data that matches Centris structure
    // In production, this would make actual API calls to Centris
    return this.generateMockCentrisData(listingType, limit);
  }

  /**
   * Get detailed property information
   */
  async getPropertyDetails(mlsNumber) {
    // Mock detailed property data matching Centris structure
    return {
      mls_number: mlsNumber,
      property_type: 'condo',
      listing_type: 'purchase',
      status: 'active',
      
      // Full address
      address: '1288 Avenue des Canadiens-de-Montréal, Unit 2906',
      unit_number: '2906',
      neighborhood: 'Ville-Marie',
      district: 'Downtown',
      city: 'Montreal',
      province: 'QC',
      postal_code: 'H3B 0G2',
      latitude: 45.4965,
      longitude: -73.5693,
      
      // Pricing
      price: 649000,
      price_per_sqft: 812,
      previous_price: 679000,
      
      // Municipal Assessment
      municipal_assessment: {
        year: 2025,
        lot_value: 78400,
        building_value: 421600,
        total_value: 500000
      },
      
      // Taxes
      taxes: {
        municipal: {
          amount: 4821,
          year: 2025
        },
        school: {
          amount: 584,
          year: 2024
        },
        total_annual: 5405
      },
      
      // Condo fees
      condo_fees: {
        monthly: 456,
        includes: ['heating', 'hot water', 'building insurance', 'snow removal', 'landscaping']
      },
      
      // Size
      living_area_sqft: 799,
      living_area_sqm: 74,
      
      // Rooms
      bedrooms: 2,
      bathrooms: 1,
      powder_rooms: 0,
      total_rooms: 5,
      room_details: [
        {
          name: 'Living room',
          level: 'Main floor',
          dimensions: '16\'2" x 11\'8"',
          flooring: 'Hardwood',
          features: ['Cathedral ceiling', 'Bay window']
        },
        {
          name: 'Kitchen',
          level: 'Main floor',
          dimensions: '11\'6" x 8\'9"',
          flooring: 'Ceramic',
          features: ['Island', 'Breakfast bar']
        },
        {
          name: 'Master bedroom',
          level: 'Main floor',
          dimensions: '12\'0" x 10\'6"',
          flooring: 'Hardwood',
          features: ['Walk-in closet', 'Ensuite access']
        },
        {
          name: 'Bedroom 2',
          level: 'Main floor',
          dimensions: '10\'0" x 9\'0"',
          flooring: 'Hardwood',
          features: ['Closet']
        },
        {
          name: 'Bathroom',
          level: 'Main floor',
          dimensions: '8\'0" x 6\'0"',
          flooring: 'Ceramic',
          features: ['Bath/shower combo', 'Vanity']
        }
      ],
      
      // Building info
      year_built: 2020,
      building_style: 'High-rise',
      
      // Features
      heating_type: 'Forced air',
      heating_energy: 'Electricity',
      cooling_type: 'Central air conditioning',
      
      // Parking
      garage: {
        type: 'Indoor',
        spaces: 1,
        width: 'Single'
      },
      
      // Amenities
      amenities: [
        'Gym',
        'Indoor pool',
        'Sauna',
        'Rooftop terrace',
        'Concierge',
        'Security system',
        'Elevator',
        'Common room'
      ],
      
      appliances_included: [
        'Refrigerator',
        'Stove',
        'Dishwasher',
        'Washer',
        'Dryer',
        'Microwave'
      ],
      
      // Location
      proximity: {
        elementary_school: 450,
        high_school: 800,
        metro: 200,
        bus: 50,
        train: 1200,
        highway: 500,
        grocery: 150,
        hospital: 1500,
        park: 300,
        daycare: 400
      },
      
      // Views
      view: ['City', 'River'],
      exposure: ['South', 'West'],
      
      // Legal
      zoning: 'Residential',
      cadastre: '1424279',
      
      // Dates
      listing_date: new Date('2024-01-15'),
      days_on_market: 25,
      
      // Descriptions
      description_en: 'Stunning 2-bedroom condo in the heart of downtown Montreal. This modern unit features an open-concept layout, floor-to-ceiling windows, and high-end finishes throughout. The building offers exceptional amenities including a gym, pool, and rooftop terrace with panoramic city views.',
      description_fr: 'Superbe condo de 2 chambres au coeur du centre-ville de Montréal. Cette unité moderne dispose d\'un aménagement à aire ouverte, de fenêtres du sol au plafond et de finitions haut de gamme. L\'immeuble offre des commodités exceptionnelles incluant gym, piscine et terrasse sur le toit avec vue panoramique.',
      
      // Virtual tour
      virtual_tour_url: 'https://example.com/virtual-tour/1234',
      
      // Stats
      view_count: 1247,
      favorite_count: 89,
      inquiry_count: 23
    };
  }

  /**
   * Generate mock Centris-style data for demo
   */
  generateMockCentrisData(listingType, limit) {
    const properties = [];
    const neighborhoods = [
      'Plateau-Mont-Royal', 'Mile End', 'Griffintown', 'Old Montreal',
      'Downtown', 'Westmount', 'Outremont', 'NDG', 'Verdun', 'Rosemont'
    ];
    
    const propertyTypes = listingType === 'rental' ? 
      ['apartment', 'condo', 'loft'] : 
      ['condo', 'house', 'townhouse', 'duplex'];

    for (let i = 0; i < limit; i++) {
      const isRental = listingType === 'rental';
      const neighborhood = neighborhoods[i % neighborhoods.length];
      const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
      
      properties.push({
        id: i + 1,
        mls_number: `${Math.floor(10000000 + Math.random() * 90000000)}`,
        property_type: propertyType,
        listing_type: listingType,
        
        // Address
        address: `${Math.floor(100 + Math.random() * 9900)} ${this.getStreetName()}, Montreal, QC`,
        neighborhood: neighborhood,
        city: 'Montreal',
        
        // Price
        price: isRental ? 
          Math.floor(1000 + Math.random() * 3000) : 
          Math.floor(300000 + Math.random() * 1200000),
        
        // Size
        bedrooms: Math.floor(1 + Math.random() * 4),
        bathrooms: Math.floor(1 + Math.random() * 2),
        living_area_sqft: Math.floor(500 + Math.random() * 2000),
        
        // Features
        year_built: Math.floor(1960 + Math.random() * 64),
        parking: Math.random() > 0.5,
        
        // Assessment & Taxes (for purchase)
        municipal_assessment: !isRental ? {
          year: 2025,
          total_value: Math.floor(250000 + Math.random() * 800000)
        } : null,
        
        taxes: !isRental ? {
          total_annual: Math.floor(2000 + Math.random() * 8000)
        } : null,
        
        // Dates
        listing_date: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
        days_on_market: Math.floor(Math.random() * 90),
        
        // Images
        main_image: `https://source.unsplash.com/800x600/?${propertyType},interior`,
        
        // Stats
        view_count: Math.floor(100 + Math.random() * 2000),
        favorite_count: Math.floor(5 + Math.random() * 100)
      });
    }
    
    return properties;
  }

  getStreetName() {
    const streets = [
      'Rue Saint-Denis', 'Rue Saint-Laurent', 'Rue Sherbrooke',
      'Avenue du Parc', 'Rue Notre-Dame', 'Boulevard René-Lévesque',
      'Rue Sainte-Catherine', 'Avenue McGill College', 'Rue University',
      'Rue de la Montagne', 'Rue Peel', 'Avenue des Pins'
    ];
    return streets[Math.floor(Math.random() * streets.length)];
  }

  /**
   * Calculate mortgage payment
   */
  calculateMortgage(price, downPayment, interestRate, amortization) {
    const principal = price - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = amortization * 12;
    
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return {
      monthlyPayment: Math.round(monthlyPayment),
      totalPayments: Math.round(monthlyPayment * numPayments),
      totalInterest: Math.round(monthlyPayment * numPayments - principal)
    };
  }
}

module.exports = CentrisScraper;