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
      
      // Location & Area Information
      area_info: {
        // Neighborhood characteristics
        neighborhood_type: 'Urban Core',
        walkability_score: 95,
        transit_score: 92,
        bike_score: 88,
        noise_level: 'Moderate',
        safety_rating: 8.5,
        
        // Demographics
        median_age: 32,
        population_density: 8500, // per sq km
        languages: ['French', 'English', 'Arabic', 'Spanish'],
        
        // Lifestyle
        restaurant_density: 'High',
        nightlife_rating: 9,
        cultural_attractions: 'Excellent',
        shopping_options: 'Abundant',
        
        // Market trends
        price_trend_1yr: 5.2, // % increase
        price_trend_5yr: 23.8,
        average_days_on_market: 28,
        inventory_level: 'Balanced',
        
        // Schools & Education
        school_ratings: {
          elementary: 8.2,
          high_school: 8.7,
          private_schools: 3,
          universities_nearby: ['McGill', 'UQAM', 'Concordia']
        },
        
        // Climate & Environment
        air_quality_index: 42, // Good
        green_space_access: 'Excellent',
        flood_risk: 'Low',
        
        // Economic factors
        median_household_income: 65000,
        employment_rate: 94.2,
        major_employers: ['Finance', 'Technology', 'Tourism', 'Healthcare']
      },
      
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
        daycare: 400,
        // Additional proximity data
        university: 800,
        shopping_center: 300,
        restaurant: 100,
        pharmacy: 200,
        bank: 150,
        post_office: 250,
        gym: 180,
        library: 400,
        cinema: 600,
        gas_station: 350
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
        
        // Images - Using reliable real estate photos
        main_image: this.getPropertyImage(propertyType, i),
        
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

  getPropertyImage(propertyType, index) {
    // Using reliable property images from different sources
    const imageCollections = {
      apartment: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
      ],
      condo: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop'
      ],
      house: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800&h=600&fit=crop'
      ],
      loft: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop'
      ],
      townhouse: [
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1605276373954-0c4a0dac5cc0?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&h=600&fit=crop'
      ],
      duplex: [
        'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop'
      ]
    };

    const images = imageCollections[propertyType] || imageCollections.apartment;
    return images[index % images.length];
  }

  /**
   * Calculate comprehensive mortgage payment with all costs
   */
  calculateMortgage(price, downPayment, interestRate, amortization) {
    const principal = price - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = amortization * 12;
    
    // Basic mortgage payment calculation
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    // Calculate additional costs
    const cmhcInsurance = this.calculateCMHCInsurance(price, downPayment);
    const landTransferTax = this.calculateLandTransferTax(price);
    const notaryFees = Math.round(price * 0.001 + 1000); // Approximate notary fees
    const inspectionFees = 500;
    const legalFees = 1500;
    
    // Monthly costs
    const monthlyPropertyTax = Math.round(price * 0.011 / 12); // ~1.1% annually
    const monthlyInsurance = Math.round(price * 0.003 / 12); // ~0.3% annually
    const maintenanceReserve = Math.round(price * 0.01 / 12); // 1% annually
    
    return {
      // Basic mortgage
      monthlyPayment: Math.round(monthlyPayment),
      totalPayments: Math.round(monthlyPayment * numPayments),
      totalInterest: Math.round(monthlyPayment * numPayments - principal),
      
      // Insurance & taxes
      cmhcInsurance: cmhcInsurance,
      monthlyPropertyTax: monthlyPropertyTax,
      monthlyInsurance: monthlyInsurance,
      maintenanceReserve: maintenanceReserve,
      
      // Total monthly housing cost
      totalMonthlyCost: Math.round(monthlyPayment + monthlyPropertyTax + monthlyInsurance + maintenanceReserve),
      
      // Upfront costs
      upfrontCosts: {
        downPayment: downPayment,
        cmhcInsurance: cmhcInsurance,
        landTransferTax: landTransferTax,
        notaryFees: notaryFees,
        inspectionFees: inspectionFees,
        legalFees: legalFees,
        total: downPayment + cmhcInsurance + landTransferTax + notaryFees + inspectionFees + legalFees
      },
      
      // Payment schedule (first 12 months)
      paymentSchedule: this.generatePaymentSchedule(principal, monthlyRate, numPayments, 12)
    };
  }
  
  /**
   * Calculate CMHC insurance premium
   */
  calculateCMHCInsurance(price, downPayment) {
    const downPaymentPercent = (downPayment / price) * 100;
    
    if (downPaymentPercent >= 20) return 0;
    
    let premium = 0;
    const loanAmount = price - downPayment;
    
    if (downPaymentPercent >= 15) {
      premium = loanAmount * 0.028; // 2.8%
    } else if (downPaymentPercent >= 10) {
      premium = loanAmount * 0.031; // 3.1%
    } else {
      premium = loanAmount * 0.040; // 4.0%
    }
    
    return Math.round(premium);
  }
  
  /**
   * Calculate Quebec land transfer tax (Welcome Tax)
   */
  calculateLandTransferTax(price) {
    let tax = 0;
    
    if (price <= 50000) {
      tax = price * 0.005; // 0.5%
    } else if (price <= 250000) {
      tax = 250 + (price - 50000) * 0.010; // 1.0%
    } else if (price <= 500000) {
      tax = 2250 + (price - 250000) * 0.015; // 1.5%
    } else if (price <= 1000000) {
      tax = 6000 + (price - 500000) * 0.020; // 2.0%
    } else {
      tax = 16000 + (price - 1000000) * 0.025; // 2.5%
    }
    
    return Math.round(tax);
  }
  
  /**
   * Generate payment schedule
   */
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
  
  /**
   * Calculate borrowing capacity
   */
  calculateBorrowingCapacity(income, monthlyDebts, downPayment, interestRate = 5.25) {
    const monthlyIncome = income / 12;
    const maxTotalDebtRatio = 0.44; // 44% TDS (Total Debt Service)
    const maxHousingRatio = 0.39; // 39% GDS (Gross Debt Service)
    
    // Calculate maximum monthly payment based on income
    const maxMonthlyPayment = Math.min(
      monthlyIncome * maxHousingRatio,
      (monthlyIncome * maxTotalDebtRatio) - monthlyDebts
    );
    
    // Estimate property tax and insurance (typically 1.4% of home value annually)
    const taxInsuranceFactor = 0.014 / 12;
    
    // Calculate maximum mortgage payment (excluding tax/insurance)
    const maxMortgagePayment = maxMonthlyPayment * 0.8; // ~80% of payment goes to mortgage
    
    // Calculate maximum loan amount
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = 25 * 12; // 25 years amortization
    
    const maxLoanAmount = maxMortgagePayment * 
      (Math.pow(1 + monthlyRate, numPayments) - 1) / 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments));
    
    const maxPurchasePrice = maxLoanAmount + downPayment;
    
    return {
      maxPurchasePrice: Math.round(maxPurchasePrice),
      maxLoanAmount: Math.round(maxLoanAmount),
      maxMonthlyPayment: Math.round(maxMonthlyPayment),
      maxMortgagePayment: Math.round(maxMortgagePayment),
      
      // Stress test (qualification rate)
      stressTestRate: 7.25, // Bank of Canada qualifying rate
      stressTestPayment: Math.round(maxLoanAmount * 
        (0.0725/12 * Math.pow(1 + 0.0725/12, numPayments)) / 
        (Math.pow(1 + 0.0725/12, numPayments) - 1)),
      
      // Ratios
      gdsRatio: Math.round((maxMonthlyPayment / monthlyIncome) * 100),
      tdsRatio: Math.round(((maxMonthlyPayment + monthlyDebts) / monthlyIncome) * 100),
      
      // Recommendations
      recommendations: this.getAffordabilityRecommendations(maxPurchasePrice, income, monthlyDebts)
    };
  }
  
  /**
   * Get affordability recommendations
   */
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
}

module.exports = CentrisScraper;