/**
 * Client-side Configuration Constants
 */

const CLIENT_CONFIG = {
  // API endpoints
  API_ENDPOINTS: {
    properties: '/api/properties',
    chat: '/api/ai/chat',
    unifiedChat: '/api/ai/unified-chat',
    compare: '/api/compare',
    favorites: '/api/favorites',
    neighborhoods: '/api/neighborhoods',
    priceRanges: '/api/price-ranges',
    calculator: {
      mortgage: '/api/calculator/mortgage',
      affordability: '/api/calculator/affordability'
    }
  },

  // CSS classes for consistent styling
  CSS_CLASSES: {
    activeTab: 'px-4 py-2 rounded-md font-medium transition-all bg-blue-600 text-white',
    inactiveTab: 'px-4 py-2 rounded-md font-medium transition-all text-gray-700 hover:bg-gray-200',
    savedButton: 'btn btn-secondary btn-md text-red-600 border-red-300 hover:bg-red-50',
    unsavedButton: 'btn btn-secondary btn-md',
    savedIcon: 'fas fa-heart text-red-500',
    unsavedIcon: 'fas fa-heart'
  },

  // UI settings
  UI: {
    DEFAULT_PAGE_LIMIT: 20,
    MAX_QUICK_AMENITIES: 3,
    CHAT_TIME_FORMAT: { hour: '2-digit', minute: '2-digit' }
  },

  // Property display settings
  PROPERTY: {
    LISTING_TYPES: {
      rental: { label: 'For Rent', colorClass: 'blue' },
      purchase: { label: 'For Sale', colorClass: 'purple' }
    }
  },

  // Localization
  LOCALE: 'en-CA',
  CURRENCY: 'CAD',

  // Storage keys
  STORAGE_KEYS: {
    savedProperties: 'chatLeaseSavedProperties',
    userPreferences: 'chatLeaseUserPrefs'
  },

  // Default messages
  DEFAULT_MESSAGES: {
    noProperties: {
      icon: 'fas fa-search',
      title: 'No Properties Found',
      description: 'Try adjusting your search criteria'
    },
    generalChat: {
      icon: 'fas fa-robot',
      greeting: '👋 Hello! I\'m your AI real estate assistant.',
      description: 'Ask me anything about Montreal properties, neighborhoods, prices, or financing!'
    },
    savedChat: {
      icon: 'fas fa-heart',
      greeting: '💝 Chat about your saved properties!',
      getDescription: (count) => `You have ${count} saved properties. Ask me anything about them!`
    }
  },

  // Quick messages
  QUICK_MESSAGES: {
    general: [
      'What neighborhoods do you recommend?',
      'What are average rental prices?',
      'Show me properties under $400k',
      'How much down payment do I need?',
      'Which areas have good public transport?'
    ],
    property: [
      'When can I visit?',
      'Are pets allowed?',
      'What is included?',
      'Near public transport?'
    ],
    purchase: [
      'What are the mortgage options?',
      'What are the property taxes?'
    ]
  }
};

// Make config immutable
Object.freeze(CLIENT_CONFIG);