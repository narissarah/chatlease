// ============== GLOBAL STATE ==============
let properties = [];
let currentProperty = null;
let currentListingType = 'rental';
let savedProperties = [];
let unifiedChatMessages = [];
let currentChatMode = 'general';

// ============== CONSTANTS ==============
// Using configuration from config.js
const CSS_CLASSES = CLIENT_CONFIG.CSS_CLASSES;
const API_ENDPOINTS = CLIENT_CONFIG.API_ENDPOINTS;

// Load properties on page load
window.onload = function() {
    loadProperties();
};

// Load properties from API
async function loadProperties(filters = {}) {
    try {
        filters.listingType = currentListingType;
        const params = new URLSearchParams(filters);
        
        console.log('Loading properties with filters:', filters);
        
        const response = await fetch(`${API_ENDPOINTS.properties}?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Properties loaded:', data);
        
        // Handle both direct array and paginated response
        properties = data.properties || data;
        
        displayProperties(properties);
        const typeText = currentListingType === 'rental' ? 'rentals' : 'properties for sale';
        document.getElementById('resultCount').textContent = `${properties.length} ${typeText} found`;
        
        console.log(`Successfully loaded ${properties.length} properties`);
    } catch (error) {
        console.error('Error loading properties:', error);
        document.getElementById('resultCount').textContent = `Error loading properties: ${error.message}`;
        
        // Show a user-friendly message in the property container
        const container = document.getElementById('propertyResults');
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Unable to Load Properties</h3>
                <p class="text-gray-600 mb-4">We're experiencing technical difficulties loading property data.</p>
                <p class="text-sm text-gray-500">Error: ${error.message}</p>
                <button onclick="loadProperties()" class="mt-4 btn btn-primary btn-md">
                    <i class="fas fa-refresh mr-2"></i>Try Again
                </button>
            </div>
        `;
    }
}

// Set listing type (rental or purchase)
function setListingType(type) {
    currentListingType = type;
    
    // Update tab button styles
    const rentClass = type === 'rental' ? CSS_CLASSES.activeTab : CSS_CLASSES.inactiveTab;
    const buyClass = type === 'purchase' ? CSS_CLASSES.activeTab : CSS_CLASSES.inactiveTab;
    document.getElementById('rentTab').className = rentClass.replace('px-4', 'px-6');
    document.getElementById('buyTab').className = buyClass.replace('px-4', 'px-6');
    
    // Toggle price options visibility
    document.querySelectorAll('.rental-price').forEach(el => 
        el.style.display = type === 'rental' ? 'block' : 'none');
    document.querySelectorAll('.purchase-price').forEach(el => 
        el.style.display = type === 'purchase' ? 'block' : 'none');
    
    // Update UI text and questions
    document.getElementById('propertiesTitle').textContent = 
        type === 'rental' ? 'Available Rentals' : 'Properties for Sale';
    document.querySelectorAll('.rental-question').forEach(el => 
        el.style.display = type === 'rental' ? 'inline-block' : 'none');
    document.querySelectorAll('.purchase-question').forEach(el => 
        el.style.display = type === 'purchase' ? 'inline-block' : 'none');
    
    // Reset and reload
    ['minPriceSelect', 'maxPriceSelect'].forEach(id => 
        document.getElementById(id).value = '');
    loadProperties();
}

// Search properties
function searchProperties() {
    const filters = {
        location: document.getElementById('locationInput').value,
        minPrice: document.getElementById('minPriceSelect').value,
        maxPrice: document.getElementById('maxPriceSelect').value,
        bedrooms: document.getElementById('bedroomsSelect').value,
        propertyType: document.getElementById('propertyTypeSelect').value
    };
    
    loadProperties(filters);
}

// Display properties
function displayProperties(properties) {
    const container = document.getElementById('propertyResults');
    
    if (properties.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">No Properties Found</h3>
                <p class="text-gray-600">Try adjusting your search criteria</p>
            </div>
        `;
        return;
    }

    container.innerHTML = properties.map(property => `
        <div class="property-card card overflow-hidden">
            <div class="relative h-48 overflow-hidden">
                <img src="${property.main_image}" alt="${property.address}" class="w-full h-full object-cover">
                <div class="absolute top-3 left-3">
                    <span class="bg-white px-3 py-1 rounded-lg text-lg font-bold text-green-600 shadow-md">
                        ${formatPrice(property.price)}${property.listing_type === 'rental' ? '/month' : ''}
                    </span>
                </div>
                <div class="absolute top-3 right-3">
                    <span class="bg-${CLIENT_CONFIG.PROPERTY.LISTING_TYPES[property.listing_type].colorClass}-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                        ${CLIENT_CONFIG.PROPERTY.LISTING_TYPES[property.listing_type].label}
                    </span>
                </div>
            </div>
            
            <div class="p-6">
                <div class="mb-4">
                    <h3 class="text-lg font-bold text-gray-900 mb-1">${property.address}</h3>
                    <p class="text-sm text-blue-600 font-medium flex items-center">
                        <i class="fas fa-map-marker-alt mr-2"></i>
                        ${property.neighborhood}
                    </p>
                </div>
                
                <div class="flex items-center text-gray-600 text-sm mb-4 space-x-4">
                    <div class="flex items-center">
                        <i class="fas fa-bed mr-1 text-gray-400"></i>
                        <span>${property.bedrooms} bed</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-bath mr-1 text-gray-400"></i>
                        <span>${property.bathrooms} bath</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-ruler-combined mr-1 text-gray-400"></i>
                        <span>${property.sqft} sqft</span>
                    </div>
                </div>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">
                    ${property.description_en || property.description_fr}
                </p>
                
                <div class="mb-4">
                    <div class="flex flex-wrap gap-2">
                        ${property.amenities.slice(0, CLIENT_CONFIG.UI.MAX_QUICK_AMENITIES).map(amenity => 
                            `<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">${translateAmenity(amenity)}</span>`
                        ).join('')}
                        ${property.amenities.length > CLIENT_CONFIG.UI.MAX_QUICK_AMENITIES ? 
                            `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">+${property.amenities.length - CLIENT_CONFIG.UI.MAX_QUICK_AMENITIES} more</span>` : ''}
                    </div>
                </div>
                
                <div class="flex space-x-2">
                    <button onclick="openPropertyChat(${property.id})" 
                            class="btn btn-primary btn-md flex-1">
                        <i class="fas fa-comments mr-2"></i>
                        Ask Questions
                    </button>
                    <button onclick="toggleSaveProperty(${property.id})" id="saveBtn-${property.id}" 
                            class="btn btn-secondary btn-md">
                        <i class="fas fa-heart" id="saveIcon-${property.id}"></i>
                    </button>
                    <button class="btn btn-secondary btn-md">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Translate amenities from French to English
function translateAmenity(amenity) {
    const translations = {
        'WiFi inclus': 'WiFi Included',
        'Chauffage inclus': 'Heating Included',
        'Planchers de bois franc': 'Hardwood Floors',
        'Balcon': 'Balcony',
        'Terrasse privée': 'Private Terrace',
        'Stationnement inclus': 'Parking Included',
        'Lave-vaisselle': 'Dishwasher',
        'Air climatisé': 'Air Conditioning',
        'Gym dans l\'immeuble': 'Building Gym',
        'Vue sur le fleuve': 'River View',
        'Concierge 24h': '24h Concierge',
        'Terrasse sur le toit': 'Rooftop Terrace',
        'Stationnement souterrain': 'Underground Parking',
        'Métro à 2 minutes': '2 min to Metro',
        'Épicerie en bas': 'Grocery Downstairs',
        'Buanderie dans l\'immeuble': 'Building Laundry',
        'Loft style industriel': 'Industrial Loft Style',
        'Plafonds hauts': 'High Ceilings',
        'Grandes fenêtres': 'Large Windows',
        'Planchers de béton poli': 'Polished Concrete Floors',
        'Buanderie privée': 'Private Laundry',
        'Centre-ville': 'Downtown',
        'Métro Peel à 3 min': '3 min to Peel Metro',
        'Épicerie IGA en bas': 'IGA Grocery Below',
        'Salle de sport à proximité': 'Nearby Gym'
    };
    return translations[amenity] || amenity;
}

// Open property-specific chat in floating chatbot
function openPropertyChat(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    // Set current property context
    currentProperty = property;
    
    // Open the floating chatbot
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatBubbleIcon = document.getElementById('chatBubbleIcon');
    
    if (chatbotWindow.classList.contains('hidden')) {
        chatbotWindow.classList.remove('hidden');
        chatBubbleIcon.className = 'fas fa-times text-xl group-hover:scale-110 transition-transform';
    }
    
    // Switch to property-specific mode and update interface
    updateChatbotHeader(property);
    updateChatInterface();
    addPropertyQuickQuestions(property);
    
    // Add property context message
    unifiedChatMessages.push({
        type: 'ai',
        content: `Hello! I'm now helping you with the ${property.property_type} at ${property.address} in ${property.neighborhood}. This ${property.listing_type === 'rental' ? `rental is $${property.price}/month` : `property is $${property.price.toLocaleString()}`}. What would you like to know about this property?`,
        timestamp: new Date(),
        mode: 'property',
        propertyId: property.id
    });
    
    displayUnifiedChatMessages();
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('unifiedChatInput').focus();
    }, 100);
}

// Update chatbot header for property context
function updateChatbotHeader(property) {
    const header = document.querySelector('#chatbotWindow .bg-blue-600');
    if (property) {
        header.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <i class="fas fa-home text-sm"></i>
                </div>
                <div>
                    <h3 class="font-semibold">${property.neighborhood}</h3>
                    <p class="text-xs opacity-90">${property.address}</p>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="clearPropertyContext()" class="text-white hover:bg-blue-500 p-1 rounded" title="Back to General Chat">
                    <i class="fas fa-arrow-left text-sm"></i>
                </button>
                <button onclick="toggleChatbot()" class="text-white hover:bg-blue-500 p-1 rounded">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    } else {
        header.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <i class="fas fa-robot text-sm"></i>
                </div>
                <div>
                    <h3 class="font-semibold">ChatLease AI</h3>
                    <p class="text-xs opacity-90">Montreal Real Estate Assistant</p>
                </div>
            </div>
            <button onclick="toggleChatbot()" class="text-white hover:bg-blue-500 p-1 rounded">
                <i class="fas fa-times"></i>
            </button>
        `;
    }
}

// Clear property context and return to general chat
function clearPropertyContext() {
    currentProperty = null;
    updateChatbotHeader(null);
    updateChatInterface();
    addPropertyQuickQuestions(null);
    
    // Add transition message
    unifiedChatMessages.push({
        type: 'ai',
        content: `I'm back to general mode! Ask me anything about Montreal real estate, neighborhoods, financing, or property search tips.`,
        timestamp: new Date(),
        mode: 'general'
    });
    
    displayUnifiedChatMessages();
}

// Property-specific quick questions for the floating chat
function addPropertyQuickQuestions(property) {
    const quickButtons = document.querySelector('#chatbotWindow .p-3.border-t .flex.flex-wrap');
    
    if (property) {
        // Property-specific questions
        const propertyQuestions = property.listing_type === 'rental' 
            ? ['When can I visit?', 'Are pets allowed?', 'What\'s included?']
            : ['Mortgage options?', 'Property taxes?', 'Closing costs?'];
            
        quickButtons.innerHTML = propertyQuestions.map(question => 
            `<button onclick="sendUnifiedMessage('${question}')" 
                     class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">
                ${question}
            </button>`
        ).join('');
    } else {
        // General questions
        quickButtons.innerHTML = `
            <button onclick="sendUnifiedMessage('Best neighborhoods?')" 
                    class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">
                Best areas?
            </button>
            <button onclick="sendUnifiedMessage('Average prices?')" 
                    class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">
                Prices?
            </button>
            <button onclick="sendUnifiedMessage('Under $400k?')" 
                    class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">
                Under $400k?
            </button>
        `;
    }
}

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat(CLIENT_CONFIG.LOCALE, {
        style: 'currency',
        currency: CLIENT_CONFIG.CURRENCY,
        minimumFractionDigits: 0
    }).format(price);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(CLIENT_CONFIG.LOCALE);
}

// ============== UNIFIED CHAT FUNCTIONS ==============

// ============== UTILITY FUNCTIONS ==============
function updateTabStyles(activeMode) {
    document.getElementById('generalChatMode').className = 
        activeMode === 'general' ? CSS_CLASSES.activeTab : CSS_CLASSES.inactiveTab;
    document.getElementById('savedChatMode').className = 
        activeMode === 'saved' ? CSS_CLASSES.activeTab : CSS_CLASSES.inactiveTab;
}

function updateSaveButtonStyles(propertyId, isSaved) {
    const button = document.getElementById(`saveBtn-${propertyId}`);
    const icon = document.getElementById(`saveIcon-${propertyId}`);
    if (button && icon) {
        button.className = isSaved ? CSS_CLASSES.savedButton : CSS_CLASSES.unsavedButton;
        icon.className = isSaved ? CSS_CLASSES.savedIcon : CSS_CLASSES.unsavedIcon;
    }
}

async function makeApiCall(endpoint, data = null) {
    const options = {
        method: data ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);
    
    const response = await fetch(endpoint, options);
    if (!response.ok) throw new Error(`API call failed: ${response.status}`);
    return response.json();
}

// Set chat mode (general or saved)
function setChatMode(mode) {
    currentChatMode = mode;
    updateTabStyles(mode);
    displayUnifiedChatMessages();
}

// Handle unified chat keypress
function handleUnifiedChatKeypress(event) {
    if (event.key === 'Enter') {
        sendUnifiedMessage();
    }
}

// Send unified message
async function sendUnifiedMessage(message) {
    const input = document.getElementById('unifiedChatInput');
    const messageText = message || input.value.trim();
    
    if (!messageText) return;
    
    // Determine current mode based on property context
    const currentMode = currentProperty ? 'property' : currentChatMode;
    
    // Add user message
    unifiedChatMessages.push({
        type: 'user',
        content: messageText,
        timestamp: new Date(),
        mode: currentMode,
        propertyId: currentProperty?.id
    });
    
    if (!message) input.value = '';
    displayUnifiedChatMessages();
    
    // Show typing indicator
    showUnifiedTypingIndicator();
    
    try {
        // Prepare request data
        const requestData = {
            message: messageText,
            chatMode: currentMode,
            propertyId: currentProperty?.id,
            savedProperties: currentChatMode === 'saved' ? savedProperties : []
        };
        
        // Use property-specific endpoint if we have property context
        const endpoint = currentProperty ? API_ENDPOINTS.chat : API_ENDPOINTS.unifiedChat;
        
        console.log('Sending chat message:', requestData);
        const data = await makeApiCall(endpoint, requestData);
        console.log('Chat response received:', data);
        
        // Remove typing indicator and add AI response
        hideUnifiedTypingIndicator();
        unifiedChatMessages.push({
            type: 'ai',
            content: data.response,
            timestamp: new Date(),
            mode: currentMode,
            propertyId: currentProperty?.id
        });
        
        displayUnifiedChatMessages();
    } catch (error) {
        console.error('Error sending unified message:', error);
        hideUnifiedTypingIndicator();
        unifiedChatMessages.push({
            type: 'ai',
            content: 'Sorry, I\'m experiencing technical difficulties. Please try again.',
            timestamp: new Date(),
            mode: currentMode
        });
        displayUnifiedChatMessages();
    }
}

// Display unified chat messages
function displayUnifiedChatMessages() {
    const container = document.getElementById('unifiedChatMessages');
    
    // Show all messages when in property mode, or filter by current chat mode
    const relevantMessages = currentProperty 
        ? unifiedChatMessages 
        : unifiedChatMessages.filter(msg => msg.mode === currentChatMode);
    
    if (relevantMessages.length === 0) {
        if (currentProperty) {
            container.innerHTML = `
                <div class="text-center text-gray-500 text-sm">
                    <i class="fas fa-home text-2xl mb-2 text-blue-600"></i>
                    <p>🏠 Ask about this property!</p>
                    <p class="mt-1">I can help with pricing, neighborhood info, financing, and more.</p>
                </div>
            `;
        } else if (currentChatMode === 'saved') {
            container.innerHTML = `
                <div class="text-center text-gray-500 text-sm">
                    <i class="fas fa-heart text-2xl mb-2 text-red-400"></i>
                    <p>💝 Chat about your saved properties!</p>
                    <p class="mt-1">You have ${savedProperties.length} saved properties. Ask me anything about them!</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="text-center text-gray-500 text-sm">
                    <i class="fas fa-robot text-2xl mb-2 text-blue-600"></i>
                    <p>👋 Hello! I'm your AI assistant.</p>
                    <p class="mt-1">Ask me about Montreal real estate!</p>
                </div>
            `;
        }
        return;
    }
    
    container.innerHTML = relevantMessages.map(message => `
        <div class="chat-message mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}">
            <div class="inline-block max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-900 border'
            }">
                <p class="text-sm">${message.content}</p>
                <p class="text-xs mt-1 opacity-70">
                    ${message.timestamp.toLocaleTimeString([], CLIENT_CONFIG.UI.CHAT_TIME_FORMAT)}
                </p>
            </div>
        </div>
    `).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Show unified typing indicator
function showUnifiedTypingIndicator() {
    const container = document.getElementById('unifiedChatMessages');
    const indicator = document.createElement('div');
    indicator.id = 'unifiedTypingIndicator';
    indicator.className = 'chat-message mb-4 text-left';
    indicator.innerHTML = `
        <div class="inline-block bg-white border px-4 py-2 rounded-lg">
            <div class="flex space-x-1">
                <div class="typing-indicator"></div>
                <div class="typing-indicator"></div>
                <div class="typing-indicator"></div>
            </div>
        </div>
    `;
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
}

// Hide unified typing indicator
function hideUnifiedTypingIndicator() {
    const indicator = document.getElementById('unifiedTypingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// ============== SAVED PROPERTIES FUNCTIONS ==============

// Toggle save property
function toggleSaveProperty(propertyId) {
    const index = savedProperties.indexOf(propertyId);
    const isSaved = index === -1;
    
    if (isSaved) {
        savedProperties.push(propertyId);
    } else {
        savedProperties.splice(index, 1);
    }
    
    updateSaveButtonStyles(propertyId, isSaved);
    document.getElementById('savedCount').textContent = savedProperties.length;
    
    if (currentChatMode === 'saved') {
        displayUnifiedChatMessages();
    }
    
    // Persist to localStorage
    localStorage.setItem(CLIENT_CONFIG.STORAGE_KEYS.savedProperties, JSON.stringify(savedProperties));
}

// ============== INITIALIZATION ==============
function initializeSavedProperties() {
    const saved = localStorage.getItem(CLIENT_CONFIG.STORAGE_KEYS.savedProperties);
    if (saved) {
        savedProperties = JSON.parse(saved);
        document.getElementById('savedCount').textContent = savedProperties.length;
        
        // Update UI after properties load
        setTimeout(() => {
            savedProperties.forEach(propertyId => 
                updateSaveButtonStyles(propertyId, true));
        }, 1000);
    }
}

// Load saved properties on page load
window.addEventListener('load', initializeSavedProperties);

// ============== MOBILE MENU FUNCTIONS ==============
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
}

// ============== CHATBOT FUNCTIONS ==============
function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatBubbleIcon = document.getElementById('chatBubbleIcon');
    
    if (chatbotWindow.classList.contains('hidden')) {
        // Show chatbot
        chatbotWindow.classList.remove('hidden');
        chatBubbleIcon.className = 'fas fa-times text-xl group-hover:scale-110 transition-transform';
        
        // Update interface based on current context
        updateChatInterface();
        
        // Auto-focus on input when opened
        setTimeout(() => {
            document.getElementById('unifiedChatInput').focus();
        }, 100);
    } else {
        // Hide chatbot and clear property context
        chatbotWindow.classList.add('hidden');
        chatBubbleIcon.className = 'fas fa-comments text-xl group-hover:scale-110 transition-transform';
        
        // Clear property context when closing
        if (currentProperty) {
            currentProperty = null;
            updateChatbotHeader(null);
            addPropertyQuickQuestions(null);
        }
    }
}

// Update chat interface based on current context
function updateChatInterface() {
    const modeSelector = document.querySelector('#chatbotWindow .border-b.border-gray-200');
    
    if (currentProperty) {
        // Hide mode selector when in property mode
        modeSelector.style.display = 'none';
        addPropertyQuickQuestions(currentProperty);
    } else {
        // Show mode selector in general mode
        modeSelector.style.display = 'block';
        addPropertyQuickQuestions(null);
    }
    
    displayUnifiedChatMessages();
}