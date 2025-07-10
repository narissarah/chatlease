/**
 * Server Configuration Constants
 */

module.exports = {
  // Cache settings
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  // Financial constants
  DEFAULT_CLOSING_COSTS: 3000,
  GDS_RATIO: 0.32,
  DEFAULT_INTEREST_RATE: 0.055,
  DEFAULT_AMORTIZATION_YEARS: 25,
  MIN_DOWN_PAYMENT_RATIO: 0.05,
  RECOMMENDED_DOWN_PAYMENT_RATIO: 0.2,
  INCOME_MULTIPLIER: 3.5,
  RENTAL_ESTIMATION_RATIO: 0.004,
  INSURANCE_RATE: 0.00004,
  
  // Property filters
  MAX_METRO_DISTANCE: 1000,
  MAX_SCHOOL_DISTANCE: 1000,
  NEW_CONSTRUCTION_YEARS: 2,
  PRICE_SIMILARITY_THRESHOLD: 0.2,
  
  // Tax brackets for Quebec land transfer tax
  TAX_BRACKETS: [
    { min: 0, max: 50000, rate: 0.005 },
    { min: 50000, max: 250000, rate: 0.01 },
    { min: 250000, max: 500000, rate: 0.015 },
    { min: 500000, max: 1000000, rate: 0.02 },
    { min: 1000000, max: Infinity, rate: 0.025 }
  ],
  
  // CMHC insurance rates
  CMHC_RATES: [
    { maxLTV: 0.8, rate: 0 },
    { maxLTV: 0.85, rate: 0.028 },
    { maxLTV: 0.9, rate: 0.031 },
    { maxLTV: 0.95, rate: 0.04 }
  ],
  
  // Pagination
  DEFAULT_PAGE_LIMIT: 20,
  
  // Property categories
  BEDROOM_CATEGORIES: {
    STUDIO: { bedrooms: 0, label: 'studio' },
    ONE_BED: { bedrooms: 1, label: 'oneBed' },
    TWO_BED: { bedrooms: 2, label: 'twoBed' },
    THREE_PLUS: { bedrooms: 3, label: 'threePlusBed' }
  },
  
  PRICE_CATEGORIES: {
    UNDER_500K: { max: 500000, label: 'under500k' },
    TO_750K: { max: 750000, label: '500kTo750k' },
    TO_1M: { max: 1000000, label: '750kTo1m' },
    OVER_1M: { max: Infinity, label: 'over1m' }
  }
};