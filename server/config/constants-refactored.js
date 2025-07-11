/**
 * Server Configuration Constants
 * Centralized configuration for the ChatLease backend
 */

module.exports = {
    // ========== API Configuration ==========
    API: {
        VERSION: 'v1',
        PREFIX: '/api',
        RATE_LIMIT: {
            WINDOW_MS: 15 * 60 * 1000, // 15 minutes
            MAX_REQUESTS: 100,
            MESSAGE: 'Too many requests, please try again later.'
        },
        PAGINATION: {
            DEFAULT_LIMIT: 20,
            MAX_LIMIT: 100
        }
    },

    // ========== OpenAI Configuration ==========
    OPENAI: {
        MODEL: 'gpt-3.5-turbo',
        MAX_TOKENS: 800,
        TEMPERATURE: 0.7,
        SYSTEM_PROMPTS: {
            GENERAL: `You are ChatLease AI, a helpful real estate assistant for Montreal. 
                     You have extensive knowledge about Montreal neighborhoods, rental prices, 
                     property features, and local amenities. Be concise, friendly, and informative.`,
            
            PROPERTY: `You are helping a user with a specific property. Focus on this property's 
                      features, neighborhood, pricing, and suitability. Be specific and helpful.`,
            
            SAVED: `You are discussing the user's saved properties. Help them compare options, 
                   understand differences, and make informed decisions.`
        }
    },

    // ========== Database Configuration ==========
    DATABASE: {
        COLLECTIONS: {
            PROPERTIES: 'properties',
            USERS: 'users',
            CHATS: 'chats',
            ANALYTICS: 'analytics'
        },
        INDEXES: {
            PROPERTIES: [
                { price: 1 },
                { neighborhood: 1 },
                { listing_type: 1 },
                { created_at: -1 }
            ]
        }
    },

    // ========== Property Constants ==========
    PROPERTY: {
        TYPES: ['apartment', 'condo', 'loft', 'house', 'townhouse'],
        LISTING_TYPES: ['rental', 'purchase'],
        AMENITIES: {
            ESSENTIAL: ['heating', 'water', 'electricity'],
            COMFORT: ['wifi', 'ac', 'dishwasher', 'laundry'],
            LUXURY: ['gym', 'pool', 'concierge', 'rooftop']
        },
        PRICE_RANGES: {
            RENTAL: {
                MIN: 500,
                MAX: 10000,
                BRACKETS: [1000, 1500, 2000, 2500, 3000, 4000]
            },
            PURCHASE: {
                MIN: 100000,
                MAX: 5000000,
                BRACKETS: [250000, 450000, 650000, 850000, 1200000]
            }
        }
    },

    // ========== Neighborhoods ==========
    NEIGHBORHOODS: {
        POPULAR: [
            'Plateau-Mont-Royal',
            'Mile End',
            'Downtown',
            'Old Montreal',
            'Griffintown',
            'NDG',
            'Villeray',
            'Rosemont',
            'Outremont',
            'Westmount'
        ],
        REGIONS: {
            CENTRAL: ['Downtown', 'Old Montreal', 'Griffintown'],
            EAST: ['Plateau-Mont-Royal', 'Mile End', 'Villeray', 'Rosemont'],
            WEST: ['NDG', 'Westmount', 'Côte-des-Neiges'],
            NORTH: ['Outremont', 'Mont-Royal', 'Ahuntsic']
        }
    },

    // ========== Validation Rules ==========
    VALIDATION: {
        SEARCH: {
            LOCATION: {
                MAX_LENGTH: 100,
                PATTERN: /^[a-zA-Z0-9\s\-,.'À-ÿ]+$/
            },
            PRICE: {
                MIN: 0,
                MAX: 10000000
            },
            BEDROOMS: {
                MIN: 0,
                MAX: 10
            }
        },
        CHAT: {
            MESSAGE: {
                MIN_LENGTH: 1,
                MAX_LENGTH: 1000
            }
        }
    },

    // ========== Cache Configuration ==========
    CACHE: {
        TTL: {
            PROPERTIES: 5 * 60, // 5 minutes
            NEIGHBORHOODS: 60 * 60, // 1 hour
            STATIC_DATA: 24 * 60 * 60 // 24 hours
        },
        KEYS: {
            PROPERTIES: 'properties',
            NEIGHBORHOODS: 'neighborhoods',
            PRICE_RANGES: 'price_ranges'
        }
    },

    // ========== Error Messages ==========
    ERRORS: {
        GENERAL: {
            NOT_FOUND: 'Resource not found',
            INTERNAL: 'Internal server error',
            VALIDATION: 'Validation error',
            UNAUTHORIZED: 'Unauthorized access',
            RATE_LIMIT: 'Rate limit exceeded'
        },
        PROPERTY: {
            NOT_FOUND: 'Property not found',
            INVALID_ID: 'Invalid property ID',
            SEARCH_FAILED: 'Property search failed'
        },
        CHAT: {
            EMPTY_MESSAGE: 'Message cannot be empty',
            AI_ERROR: 'AI service temporarily unavailable',
            CONTEXT_ERROR: 'Invalid chat context'
        }
    },

    // ========== Success Messages ==========
    SUCCESS: {
        PROPERTY: {
            LOADED: 'Properties loaded successfully',
            SAVED: 'Property saved successfully',
            REMOVED: 'Property removed from saved'
        },
        CHAT: {
            MESSAGE_SENT: 'Message processed successfully'
        }
    },

    // ========== Feature Flags ==========
    FEATURES: {
        ENABLE_CHAT_HISTORY: true,
        ENABLE_PROPERTY_ANALYTICS: true,
        ENABLE_ADVANCED_SEARCH: true,
        ENABLE_RECOMMENDATIONS: false,
        ENABLE_VIRTUAL_TOURS: false
    },

    // ========== Security ==========
    SECURITY: {
        CORS: {
            ORIGIN: process.env.CLIENT_URL || 'http://localhost:3001',
            CREDENTIALS: true
        },
        HEADERS: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        }
    }
};