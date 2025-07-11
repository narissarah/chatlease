const express = require('express');
const router = express.Router();

// Natural Language Search Parser
router.post('/parse-search', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ 
                error: 'Query is required and must be a string' 
            });
        }

        // Use OpenAI to parse the natural language query
        const openai = req.app.locals.openai;
        
        const systemPrompt = `You are a real estate search parser for Montreal properties. 
Parse the user's natural language query and extract search parameters.

Return a JSON object with these fields:
- location: neighborhood name (string)
- minPrice: minimum price (string number)
- maxPrice: maximum price (string number)
- bedrooms: number of bedrooms (string number)
- propertyType: apartment|condo|loft|house|townhouse (string)
- nearMetro: near metro/transport (boolean)
- petsAllowed: pets allowed (boolean)
- listingType: rental|purchase (string)

Montreal neighborhoods to recognize: Plateau-Mont-Royal, Mile End, Downtown, Old Montreal, Griffintown, NDG, Villeray, Rosemont, Outremont, Westmount, Verdun, Hochelaga, Saint-Henri, Little Italy, Chinatown, Gay Village

For prices:
- If rental context: assume monthly rent (e.g., "$2000" = "2000")
- If purchase context: assume full price (e.g., "$500k" = "500000")
- Extract ranges when possible

Only include fields that are explicitly mentioned or clearly implied.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Parse this search query: "${query}"` }
            ],
            temperature: 0.1,
            max_tokens: 300
        });

        let parsedData;
        try {
            parsedData = JSON.parse(response.choices[0].message.content);
        } catch (parseError) {
            console.error('Failed to parse OpenAI response:', parseError);
            // Fallback to local parsing
            parsedData = parseSearchQueryLocally(query);
        }

        // Validate and clean the parsed data
        const cleanedData = validateAndCleanParsedData(parsedData);
        
        res.json(cleanedData);
        
    } catch (error) {
        console.error('Error in AI search parsing:', error);
        
        // Fallback to local parsing
        try {
            const localParsed = parseSearchQueryLocally(req.body.query);
            const cleanedData = validateAndCleanParsedData(localParsed);
            res.json(cleanedData);
        } catch (fallbackError) {
            res.status(500).json({ 
                error: 'Failed to parse search query',
                details: error.message 
            });
        }
    }
});

// Local fallback parsing function
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

// Validate and clean parsed data
function validateAndCleanParsedData(data) {
    const cleaned = {};
    
    // Validate location
    if (data.location && typeof data.location === 'string') {
        cleaned.location = data.location.trim();
    }
    
    // Validate prices (ensure they're reasonable)
    if (data.minPrice && !isNaN(data.minPrice)) {
        const minPrice = parseInt(data.minPrice);
        if (minPrice >= 0 && minPrice <= 10000000) {
            cleaned.minPrice = data.minPrice;
        }
    }
    
    if (data.maxPrice && !isNaN(data.maxPrice)) {
        const maxPrice = parseInt(data.maxPrice);
        if (maxPrice >= 0 && maxPrice <= 10000000) {
            cleaned.maxPrice = data.maxPrice;
        }
    }
    
    // Validate bedrooms
    if (data.bedrooms && !isNaN(data.bedrooms)) {
        const bedrooms = parseInt(data.bedrooms);
        if (bedrooms >= 0 && bedrooms <= 10) {
            cleaned.bedrooms = data.bedrooms;
        }
    }
    
    // Validate property type
    const validPropertyTypes = ['apartment', 'condo', 'loft', 'house', 'townhouse'];
    if (data.propertyType && validPropertyTypes.includes(data.propertyType.toLowerCase())) {
        cleaned.propertyType = data.propertyType.toLowerCase();
    }
    
    // Validate boolean fields
    if (typeof data.nearMetro === 'boolean') {
        cleaned.nearMetro = data.nearMetro;
    }
    
    if (typeof data.petsAllowed === 'boolean') {
        cleaned.petsAllowed = data.petsAllowed;
    }
    
    // Validate listing type
    const validListingTypes = ['rental', 'purchase'];
    if (data.listingType && validListingTypes.includes(data.listingType)) {
        cleaned.listingType = data.listingType;
    }
    
    return cleaned;
}

module.exports = router;