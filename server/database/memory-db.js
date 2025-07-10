/**
 * In-memory database with Centris-like features
 */

const CentrisScraper = require('../scrapers/centris-scraper');

class MemoryDatabase {
  constructor() {
    this.tables = {
      users: [],
      agents: [],
      properties: [],
      property_images: [],
      property_details: [], // Extended property details
      inquiries: [],
      applications: [],
      favorites: [],
      property_views: [],
      mortgage_calculations: []
    };
    
    this.nextId = {
      users: 1,
      agents: 1,
      properties: 1,
      property_images: 1,
      inquiries: 1,
      applications: 1
    };
    
    // Create index maps for faster lookups
    this.indexes = {
      propertiesById: new Map(),
      propertiesByMLS: new Map(),
      agentsById: new Map(),
      imagesByPropertyId: new Map(),
      detailsByPropertyId: new Map()
    };
    
    this.scraper = new CentrisScraper();
    this.initializeData();
  }

  async initializeData() {
    // Add sample agents
    this.tables.agents = [
      {
        id: 1,
        email: 'jean.dupont@remax.ca',
        first_name: 'Jean',
        last_name: 'Dupont',
        phone: '514-555-0123',
        cell_phone: '514-555-9123',
        agency_name: 'RE/MAX du Cartier',
        agency_address: '1250 Boulevard René-Lévesque O, Montreal, QC H3B 4W8',
        license_number: 'D2345',
        languages: ['fr', 'en'],
        rating: 4.5,
        review_count: 127,
        years_experience: 15,
        properties_sold: 234,
        specializations: ['Condos', 'Luxury Properties', 'Investment Properties'],
        certifications: ['Certified Luxury Home Marketing Specialist', 'Accredited Buyer Representative'],
        active: true,
        bio: 'With over 15 years of experience in Montreal real estate, Jean specializes in luxury condos and investment properties.',
        profile_image: 'https://source.unsplash.com/150x150/?professional,man',
        created_at: new Date()
      },
      {
        id: 2,
        email: 'marie.tremblay@sothebys.ca',
        first_name: 'Marie',
        last_name: 'Tremblay',
        phone: '514-555-0456',
        cell_phone: '514-555-8456',
        agency_name: 'Sotheby\'s International Realty',
        agency_address: '1430 Rue Sherbrooke O, Montreal, QC H3G 1K4',
        license_number: 'C6789',
        languages: ['fr', 'en', 'es'],
        rating: 4.8,
        review_count: 89,
        years_experience: 8,
        properties_sold: 156,
        specializations: ['Waterfront Properties', 'Historic Homes', 'First-time Buyers'],
        certifications: ['Certified Residential Specialist', 'Green Designation'],
        active: true,
        bio: 'Marie brings a passion for Montreal\'s historic architecture and waterfront properties to every transaction.',
        profile_image: 'https://source.unsplash.com/150x150/?professional,woman',
        created_at: new Date()
      }
    ];

    // Generate comprehensive property data using scraper
    const rentalProperties = await this.scraper.searchProperties({ 
      listingType: 'rental', 
      limit: 20 
    });
    
    const purchaseProperties = await this.scraper.searchProperties({ 
      listingType: 'purchase', 
      limit: 20 
    });

    // Combine and enhance properties with full Centris-like details
    let propertyId = 1;
    const allProperties = [...rentalProperties, ...purchaseProperties];
    
    for (const prop of allProperties) {
      const enhancedProperty = {
        id: propertyId++,
        mls_number: prop.mls_number,
        agent_id: (propertyId % 2) + 1,
        property_type: prop.property_type,
        listing_type: prop.listing_type,
        status: 'active',
        
        // Location
        address: prop.address,
        unit_number: prop.property_type === 'condo' ? `${Math.floor(100 + Math.random() * 3000)}` : null,
        neighborhood: prop.neighborhood,
        district: this.getDistrict(prop.neighborhood),
        city: prop.city,
        province: 'QC',
        postal_code: this.generatePostalCode(),
        latitude: 45.5017 + (Math.random() - 0.5) * 0.1,
        longitude: -73.5673 + (Math.random() - 0.5) * 0.1,
        
        // Pricing
        price: prop.price,
        price_per_sqft: Math.round(prop.price / prop.living_area_sqft),
        previous_price: prop.listing_type === 'purchase' ? prop.price + Math.floor(Math.random() * 50000) : null,
        
        // Municipal Assessment & Taxes (for purchase)
        municipal_assessment: prop.listing_type === 'purchase' ? {
          year: 2025,
          lot_value: Math.floor(prop.municipal_assessment.total_value * 0.3),
          building_value: Math.floor(prop.municipal_assessment.total_value * 0.7),
          total_value: prop.municipal_assessment.total_value
        } : null,
        
        taxes: prop.listing_type === 'purchase' ? {
          municipal: {
            amount: Math.floor(prop.municipal_assessment.total_value * 0.011),
            year: 2025
          },
          school: {
            amount: Math.floor(prop.municipal_assessment.total_value * 0.0015),
            year: 2024
          },
          total_annual: prop.taxes.total_annual
        } : null,
        
        // Condo fees (if condo)
        condo_fees: prop.property_type === 'condo' ? {
          monthly: Math.floor(200 + Math.random() * 600),
          includes: ['heating', 'hot water', 'building insurance', 'snow removal']
        } : null,
        
        // Size
        living_area_sqft: prop.living_area_sqft,
        living_area_sqm: Math.round(prop.living_area_sqft * 0.092903),
        lot_size_sqft: prop.property_type === 'house' ? Math.floor(3000 + Math.random() * 7000) : null,
        lot_frontage_ft: prop.property_type === 'house' ? Math.floor(30 + Math.random() * 70) : null,
        
        // Rooms
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        powder_rooms: Math.random() > 0.7 ? 1 : 0,
        total_rooms: prop.bedrooms + prop.bathrooms + 3,
        
        // Building
        year_built: prop.year_built,
        building_style: this.getBuildingStyle(prop.property_type),
        
        // Features
        heating_type: ['Forced air', 'Electric baseboards', 'Radiant'][Math.floor(Math.random() * 3)],
        heating_energy: ['Electricity', 'Natural gas', 'Oil'][Math.floor(Math.random() * 3)],
        cooling_type: Math.random() > 0.5 ? 'Central air' : 'Wall unit',
        
        // Parking
        garage: {
          type: prop.parking ? ['Indoor', 'Outdoor', 'Carport'][Math.floor(Math.random() * 3)] : 'none',
          spaces: prop.parking ? Math.floor(1 + Math.random() * 2) : 0
        },
        
        parking: {
          driveway_spaces: prop.property_type === 'house' ? Math.floor(1 + Math.random() * 3) : 0,
          driveway_type: prop.property_type === 'house' ? 'Asphalt' : null
        },
        
        // Amenities
        amenities: this.generateAmenities(prop.property_type, prop.price),
        appliances_included: this.generateAppliances(),
        
        // Location proximity
        proximity: {
          elementary_school: Math.floor(200 + Math.random() * 1000),
          high_school: Math.floor(500 + Math.random() * 2000),
          metro: Math.floor(100 + Math.random() * 1500),
          bus: Math.floor(50 + Math.random() * 500),
          train: Math.floor(1000 + Math.random() * 5000),
          highway: Math.floor(500 + Math.random() * 3000),
          grocery: Math.floor(100 + Math.random() * 1000),
          hospital: Math.floor(1000 + Math.random() * 5000),
          park: Math.floor(100 + Math.random() * 1000),
          daycare: Math.floor(200 + Math.random() * 1500)
        },
        
        // Views & Exposure
        view: this.generateViews(prop.neighborhood),
        exposure: this.generateExposure(),
        
        // Legal
        zoning: 'Residential',
        cadastre: `${Math.floor(1000000 + Math.random() * 9000000)}`,
        
        // Rental specific
        lease_term: prop.listing_type === 'rental' ? '1 year' : null,
        available_date: new Date(Date.now() + Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
        pets_allowed: prop.listing_type === 'rental' ? Math.random() > 0.5 : null,
        smoking_allowed: prop.listing_type === 'rental' ? false : null,
        furnished: prop.listing_type === 'rental' ? ['Unfurnished', 'Semi-furnished', 'Furnished'][Math.floor(Math.random() * 3)] : null,
        
        // Purchase specific
        occupancy: prop.listing_type === 'purchase' ? ['Immediate', '30 days', '60 days', 'Negotiable'][Math.floor(Math.random() * 4)] : null,
        vendor_declaration: prop.listing_type === 'purchase' ? true : null,
        
        // Dates
        listing_date: prop.listing_date,
        days_on_market: prop.days_on_market,
        
        // Descriptions
        description_fr: this.generateDescription('fr', prop),
        description_en: this.generateDescription('en', prop),
        
        // Virtual tour
        virtual_tour_url: Math.random() > 0.5 ? `https://tour.example.com/${prop.mls_number}` : null,
        
        // Stats
        view_count: prop.view_count,
        favorite_count: prop.favorite_count,
        inquiry_count: Math.floor(prop.view_count * 0.05),
        
        // Status
        created_at: new Date()
      };
      
      this.tables.properties.push(enhancedProperty);
      
      // Add property images
      this.generatePropertyImages(enhancedProperty.id, enhancedProperty.property_type);
      
      // Add to indexes
      this.indexes.propertiesById.set(enhancedProperty.id, enhancedProperty);
      this.indexes.propertiesByMLS.set(enhancedProperty.mls_number, enhancedProperty);
    }

    // Build remaining indexes
    this.buildIndexes();
    
    console.log('✅ Memory database initialized with', this.tables.properties.length, 'properties with full Centris features');
  }
  
  getDistrict(neighborhood) {
    const districts = {
      'Plateau-Mont-Royal': 'Le Plateau-Mont-Royal',
      'Mile End': 'Le Plateau-Mont-Royal',
      'Griffintown': 'Le Sud-Ouest',
      'Old Montreal': 'Ville-Marie',
      'Downtown': 'Ville-Marie',
      'Westmount': 'Westmount',
      'Outremont': 'Outremont',
      'NDG': 'Côte-des-Neiges–Notre-Dame-de-Grâce',
      'Verdun': 'Verdun',
      'Rosemont': 'Rosemont–La Petite-Patrie'
    };
    return districts[neighborhood] || 'Ville-Marie';
  }
  
  generatePostalCode() {
    const prefixes = ['H2X', 'H2Y', 'H3A', 'H3B', 'H3C', 'H3G', 'H3H', 'H4A', 'H4B'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = `${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}`;
    return `${prefix} ${suffix}`;
  }
  
  getBuildingStyle(propertyType) {
    const styles = {
      apartment: ['Low-rise', 'Mid-rise', 'High-rise'],
      condo: ['High-rise', 'Low-rise', 'Loft conversion'],
      house: ['Detached', 'Semi-detached', 'Victorian', 'Modern'],
      townhouse: ['Row house', 'End unit', 'Stacked'],
      duplex: ['Side-by-side', 'Upper/Lower'],
      loft: ['Industrial conversion', 'Modern loft']
    };
    const typeStyles = styles[propertyType] || ['Standard'];
    return typeStyles[Math.floor(Math.random() * typeStyles.length)];
  }
  
  generateAmenities(propertyType, price) {
    const baseAmenities = ['Elevator', 'Storage', 'Bicycle storage'];
    const midAmenities = ['Gym', 'Security system', 'Concierge'];
    const luxuryAmenities = ['Pool', 'Sauna', 'Rooftop terrace', 'Wine cellar', 'Guest suite'];
    
    let amenities = [...baseAmenities];
    
    if (price > 500000 || price > 2000) {
      amenities = [...amenities, ...midAmenities];
    }
    
    if (price > 800000 || price > 3000) {
      amenities = [...amenities, ...luxuryAmenities];
    }
    
    // Shuffle and take random subset
    return amenities.sort(() => 0.5 - Math.random()).slice(0, Math.floor(3 + Math.random() * 5));
  }
  
  generateAppliances() {
    const appliances = [
      'Refrigerator', 'Stove', 'Dishwasher', 'Microwave',
      'Washer', 'Dryer', 'Wine fridge', 'Garbage disposal'
    ];
    return appliances.slice(0, Math.floor(4 + Math.random() * 4));
  }
  
  generateViews(neighborhood) {
    const viewOptions = {
      'Old Montreal': ['River', 'City', 'Historic buildings'],
      'Downtown': ['City', 'Mountain'],
      'Griffintown': ['Canal', 'City'],
      'Westmount': ['Mountain', 'City', 'Park'],
      'Plateau-Mont-Royal': ['Park', 'Street', 'Courtyard']
    };
    const views = viewOptions[neighborhood] || ['Street', 'Courtyard'];
    return views.slice(0, Math.floor(1 + Math.random() * 2));
  }
  
  generateExposure() {
    const exposures = ['North', 'South', 'East', 'West'];
    const count = Math.floor(1 + Math.random() * 3);
    return exposures.sort(() => 0.5 - Math.random()).slice(0, count);
  }
  
  generateDescription(lang, property) {
    if (lang === 'fr') {
      const intros = [
        'Magnifique', 'Superbe', 'Exceptionnel', 'Charmant', 'Élégant'
      ];
      const features = [
        'avec finitions haut de gamme',
        'entièrement rénové',
        'avec vue imprenable',
        'dans un quartier prisé',
        'avec cachet unique'
      ];
      return `${intros[Math.floor(Math.random() * intros.length)]} ${property.property_type} ${features[Math.floor(Math.random() * features.length)]}. Situé dans le secteur recherché de ${property.neighborhood}, cette propriété offre ${property.bedrooms} chambres et ${property.bathrooms} salles de bain. Proche de tous les services et transports.`;
    } else {
      const intros = [
        'Beautiful', 'Stunning', 'Exceptional', 'Charming', 'Elegant'
      ];
      const features = [
        'with high-end finishes',
        'fully renovated',
        'with breathtaking views',
        'in a sought-after area',
        'with unique character'
      ];
      return `${intros[Math.floor(Math.random() * intros.length)]} ${property.property_type} ${features[Math.floor(Math.random() * features.length)]}. Located in the desirable ${property.neighborhood} area, this property offers ${property.bedrooms} bedrooms and ${property.bathrooms} bathrooms. Close to all services and transportation.`;
    }
  }
  
  generatePropertyImages(propertyId, propertyType) {
    const imageCategories = [
      'living-room', 'kitchen', 'bedroom', 'bathroom', 
      'exterior', 'view', 'amenities', 'neighborhood'
    ];
    
    const numImages = Math.floor(8 + Math.random() * 12);
    
    for (let i = 0; i < numImages; i++) {
      const category = imageCategories[i % imageCategories.length];
      this.tables.property_images.push({
        id: this.tables.property_images.length + 1,
        property_id: propertyId,
        url: `https://source.unsplash.com/800x600/?${propertyType},${category}`,
        category: category,
        is_primary: i === 0,
        display_order: i,
        caption: `${category.replace('-', ' ')} view`
      });
    }
  }
  
  buildIndexes() {
    // Index agents by ID
    this.tables.agents.forEach(agent => {
      this.indexes.agentsById.set(agent.id, agent);
    });
    
    // Index images by property ID
    this.tables.property_images.forEach(image => {
      if (!this.indexes.imagesByPropertyId.has(image.property_id)) {
        this.indexes.imagesByPropertyId.set(image.property_id, []);
      }
      this.indexes.imagesByPropertyId.get(image.property_id).push(image);
    });
  }

  // Enhanced query interface with Centris features
  async query(sql, params = []) {
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('select')) {
      return this.handleSelect(sql, params);
    }
    
    if (sqlLower.startsWith('insert')) {
      return this.handleInsert(sql, params);
    }
    
    if (sqlLower.startsWith('update')) {
      return this.handleUpdate(sql, params);
    }
    
    if (sqlLower.startsWith('create')) {
      return { rows: [], rowCount: 0 };
    }
    
    return { rows: [], rowCount: 0 };
  }

  handleSelect(sql, params) {
    const sqlLower = sql.toLowerCase();
    
    // Enhanced properties query with all Centris data
    if (sqlLower.includes('from properties')) {
      let results;
      
      // Optimized single property lookup
      if (params.length === 1 && sqlLower.includes('where id = $1')) {
        const property = this.indexes.propertiesById.get(parseInt(params[0]));
        results = property ? [property] : [];
      } else if (params.length === 1 && sqlLower.includes('where mls_number = $1')) {
        const property = this.indexes.propertiesByMLS.get(params[0]);
        results = property ? [property] : [];
      } else {
        results = [...this.tables.properties];
      }
      
      // Add agent info and images
      results = results.map(property => {
        const agent = this.indexes.agentsById.get(property.agent_id);
        const images = this.indexes.imagesByPropertyId.get(property.id) || [];
        const primaryImage = images.find(img => img.is_primary);
        
        return {
          ...property,
          agent_name: agent ? `${agent.first_name} ${agent.last_name}` : null,
          agent_phone: agent ? agent.phone : null,
          agent_email: agent ? agent.email : null,
          agent_agency: agent ? agent.agency_name : null,
          images: images.map(img => img.url),
          main_image: primaryImage ? primaryImage.url : images[0]?.url,
          sqft: property.living_area_sqft,
          
          // Calculate monthly costs for purchase properties
          monthly_costs: property.listing_type === 'purchase' ? {
            mortgage: this.calculateMonthlyMortgage(property.price),
            taxes: Math.round((property.taxes?.total_annual || 0) / 12),
            condo_fees: property.condo_fees?.monthly || 0,
            total: this.calculateTotalMonthlyCosts(property)
          } : null
        };
      });
      
      return { rows: results, rowCount: results.length };
    }
    
    // Agents query
    if (sqlLower.includes('from agents')) {
      return { rows: this.tables.agents, rowCount: this.tables.agents.length };
    }
    
    // Property views tracking
    if (sqlLower.includes('from property_views')) {
      return { rows: this.tables.property_views, rowCount: this.tables.property_views.length };
    }
    
    // Favorites
    if (sqlLower.includes('from favorites')) {
      return { rows: this.tables.favorites, rowCount: this.tables.favorites.length };
    }
    
    return { rows: [], rowCount: 0 };
  }

  handleInsert(sql, params) {
    const sqlLower = sql.toLowerCase();
    
    // Track property views
    if (sqlLower.includes('into property_views')) {
      const view = {
        id: Date.now(),
        property_id: params[0],
        user_id: params[1],
        viewed_at: new Date()
      };
      this.tables.property_views.push(view);
      
      // Increment view count
      const property = this.indexes.propertiesById.get(params[0]);
      if (property) {
        property.view_count++;
      }
      
      return { rows: [view], rowCount: 1 };
    }
    
    // Add to favorites
    if (sqlLower.includes('into favorites')) {
      const favorite = {
        id: Date.now(),
        user_id: params[0],
        property_id: params[1],
        created_at: new Date()
      };
      this.tables.favorites.push(favorite);
      
      // Increment favorite count
      const property = this.indexes.propertiesById.get(params[1]);
      if (property) {
        property.favorite_count++;
      }
      
      return { rows: [favorite], rowCount: 1 };
    }
    
    return { rows: [{ id: Date.now() }], rowCount: 1 };
  }

  handleUpdate(sql, params) {
    return { rows: [], rowCount: 1 };
  }

  // Calculate monthly mortgage payment (simplified)
  calculateMonthlyMortgage(price, downPaymentPercent = 20, interestRate = 5.5, years = 25) {
    const downPayment = price * (downPaymentPercent / 100);
    const principal = price - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = years * 12;
    
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return Math.round(monthlyPayment);
  }
  
  calculateTotalMonthlyCosts(property) {
    const mortgage = this.calculateMonthlyMortgage(property.price);
    const taxes = Math.round((property.taxes?.total_annual || 0) / 12);
    const condoFees = property.condo_fees?.monthly || 0;
    const insurance = Math.round(property.price * 0.00004); // Rough estimate
    
    return mortgage + taxes + condoFees + insurance;
  }

  async getMockProperties() {
    // Return mock properties for demo if database is empty
    return [
      {
        id: 1,
        address: "3420 Rue Saint-Denis, Montréal",
        neighborhood: "Plateau-Mont-Royal",
        district: "Le Plateau-Mont-Royal",
        price: 2200,
        listing_type: "rental",
        property_type: "apartment",
        bedrooms: 2,
        bathrooms: 1,
        living_area_sqft: 850,
        sqft: 850,
        price_per_sqft: 2.59,
        main_image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400",
        amenities: ["WiFi inclus", "Chauffage inclus", "Planchers de bois franc", "Balcon"],
        description_en: "Beautiful 2-bedroom apartment in the heart of Plateau with hardwood floors and balcony.",
        proximity: { metro: 300, elementary_school: 400, park: 200 },
        view: ["city", "mountain"],
        status: "active"
      },
      {
        id: 2,
        address: "1200 Rue de la Montagne, Montréal",
        neighborhood: "Ville-Marie",
        district: "Ville-Marie",
        price: 650000,
        listing_type: "purchase",
        property_type: "condo",
        bedrooms: 2,
        bathrooms: 2,
        living_area_sqft: 900,
        sqft: 900,
        price_per_sqft: 722,
        main_image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400",
        amenities: ["Gym dans l'immeuble", "Terrasse sur le toit", "Concierge 24h"],
        description_en: "Modern downtown condo with city views and luxury amenities.",
        proximity: { metro: 150, elementary_school: 600, park: 300 },
        view: ["city"],
        status: "active",
        taxes: { total_annual: 3200 },
        condo_fees: { monthly: 320 },
        monthly_costs: { total: 3850 }
      },
      {
        id: 3,
        address: "5555 Avenue du Parc, Montréal",
        neighborhood: "Mile End",
        district: "Le Plateau-Mont-Royal", 
        price: 1800,
        listing_type: "rental",
        property_type: "loft",
        bedrooms: 1,
        bathrooms: 1,
        living_area_sqft: 750,
        sqft: 750,
        price_per_sqft: 2.40,
        main_image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
        amenities: ["Loft style industriel", "Plafonds hauts", "Grandes fenêtres"],
        description_en: "Industrial-style loft in trendy Mile End with high ceilings.",
        proximity: { metro: 800, elementary_school: 500, park: 100 },
        view: ["park"],
        status: "active"
      }
    ];
  }

  async end() {
    console.log('📊 Memory database connection closed');
  }
}

module.exports = MemoryDatabase;