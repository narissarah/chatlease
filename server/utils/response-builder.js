/**
 * Response builder utilities for AI chat
 */

const CONFIG = require('../config/constants');

class ResponseBuilder {
  /**
   * Build affordability response
   * @param {Object} property - Property object
   * @param {Object} affordability - Calculated affordability
   * @returns {string} Response message
   */
  static buildAffordabilityResponse(property, affordability) {
    if (property) {
      const type = property.listing_type === 'purchase' 
        ? `price of $${property.price.toLocaleString()}` 
        : `rent of $${property.price}/month`;
      
      return `Based on this property's ${type}, you would need a household income of approximately $${affordability.requiredIncome.toLocaleString()} per year. This assumes a debt-to-income ratio of ${(CONFIG.GDS_RATIO * 100)}% (GDS). Would you like me to calculate a more detailed affordability assessment based on your specific situation?`;
    }
    
    return "I can help you determine what you can afford. For rentals, landlords typically require income of 3x the monthly rent. For purchases, banks use a 32% GDS ratio. What's your price range?";
  }

  /**
   * Build mortgage response
   * @param {Object} property - Property object
   * @param {Object} mortgage - Calculated mortgage
   * @param {Object} scraper - Scraper instance for calculations
   * @returns {string} Response message
   */
  static buildMortgageResponse(property, mortgage, scraper) {
    if (property && property.listing_type === 'purchase') {
      const downPaymentPercent = CONFIG.RECOMMENDED_DOWN_PAYMENT_RATIO * 100;
      const monthlyTax = Math.round(property.taxes.total_annual / 12);
      const condoFees = property.condo_fees?.monthly || 0;
      const totalMonthly = property.monthly_costs.total.toLocaleString();
      
      return `With ${downPaymentPercent}% down on this $${property.price.toLocaleString()} property, your monthly mortgage would be approximately $${mortgage.monthlyPayment.toLocaleString()}. Adding property taxes ($${monthlyTax}/month) and condo fees ($${condoFees}/month), your total monthly cost would be around $${totalMonthly}. Would you like to see calculations with different down payment amounts?`;
    }
    
    return `I can calculate mortgage payments for any property. Current rates are around ${(CONFIG.DEFAULT_INTEREST_RATE * 100).toFixed(1)}% for a 5-year fixed mortgage. Which property interests you?`;
  }

  /**
   * Build investment analysis response
   * @param {Object} property - Property object
   * @returns {string} Response message
   */
  static buildInvestmentResponse(property) {
    if (property && property.listing_type === 'purchase') {
      const estimatedRent = Math.round(property.price * CONFIG.RENTAL_ESTIMATION_RATIO);
      const monthlyExpenses = property.monthly_costs.total;
      const cashFlow = estimatedRent - monthlyExpenses;
      const capRate = ((estimatedRent * 12 - property.taxes.total_annual) / property.price * 100).toFixed(2);
      
      return `As an investment property, this could potentially rent for $${estimatedRent.toLocaleString()}/month based on the area. With monthly expenses of $${monthlyExpenses.toLocaleString()}, your estimated cash flow would be ${cashFlow > 0 ? '$' + cashFlow : '-$' + Math.abs(cashFlow)}/month. The cap rate would be approximately ${capRate}%. Would you like a more detailed investment analysis?`;
    }
    
    return "I can provide investment analysis including cash flow projections, cap rates, and ROI calculations. Which property are you considering as an investment?";
  }

  /**
   * Build neighborhood information response
   * @param {Object} property - Property object
   * @returns {string} Response message
   */
  static buildNeighborhoodResponse(property) {
    if (property) {
      const proximity = [
        `Metro station ${property.proximity.metro}m away`,
        `Elementary school ${property.proximity.elementary_school}m away`,
        `several parks within ${property.proximity.park}m`
      ].join(', ');
      
      const views = property.view.join(' and ');
      
      return `${property.neighborhood} is located in the ${property.district} district. Key features include: ${proximity}. The area offers ${views} views. Would you like more specific information about amenities or demographics?`;
    }
    
    return "Montreal has many great neighborhoods! Popular areas include Plateau-Mont-Royal (trendy, walkable), Griffintown (modern condos, young professionals), Westmount (upscale, family-friendly), and Mile End (artistic, diverse). What's important to you in a neighborhood?";
  }

  /**
   * Build property summary response
   * @param {Object} property - Property object
   * @returns {string} Response message
   */
  static buildPropertySummary(property) {
    const type = property.listing_type === 'rental' 
      ? `available for rent at $${property.price}/month` 
      : `for sale at $${property.price.toLocaleString()}`;
    
    return `This ${property.property_type} in ${property.neighborhood} is ${type}. It features ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms, and ${property.living_area_sqft} sqft of living space. Would you like to know more about the financial details, neighborhood, or schedule a viewing?`;
  }
}

module.exports = ResponseBuilder;