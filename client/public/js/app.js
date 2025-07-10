// ============== GLOBAL STATE ==============
let properties = [];
let currentProperty = null;
let chatMessages = [];
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
        const data = await makeApiCall(`${API_ENDPOINTS.properties}?${params}`);
        
        properties = data;
        displayProperties(properties);
        const typeText = currentListingType === 'rental' ? 'rentals' : 'properties for sale';
        document.getElementById('resultCount').textContent = `${properties.length} ${typeText} found`;
    } catch (error) {
        console.error('Error loading properties:', error);
        document.getElementById('resultCount').textContent = 'Error loading properties';
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
                    <button onclick="openChat(${property.id})" 
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

// Open chat for a property
function openChat(propertyId) {
    currentProperty = properties.find(p => p.id === propertyId);
    if (!currentProperty) return;

    document.getElementById('chatInterface').classList.remove('hidden');
    document.getElementById('chatPropertyInfo').textContent = currentProperty.neighborhood;
    
    // Initialize chat with welcome message
    chatMessages = [{
        type: 'ai',
        content: `Hello! I'm ChatLease's AI assistant. I can help you with questions about this property in ${currentProperty.neighborhood}. I speak multiple languages - feel free to ask in English, French, Spanish, Arabic, or Mandarin. What would you like to know?`,
        timestamp: new Date()
    }];
    
    displayChatMessages();
}

// Close chat
function closeChat() {
    document.getElementById('chatInterface').classList.add('hidden');
    currentProperty = null;
    chatMessages = [];
}

// Handle chat input keypress
function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Send quick message
function sendQuickMessage(message) {
    document.getElementById('chatInput').value = message;
    sendMessage();
}

// Send chat message
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;

    // Add user message
    chatMessages.push({
        type: 'user',
        content: message,
        timestamp: new Date()
    });

    input.value = '';
    displayChatMessages();

    // Add typing indicator
    showTypingIndicator();

    try {
        // Call AI API
        const response = await fetch(API_ENDPOINTS.chat, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                propertyId: currentProperty?.id
            })
        });

        const data = await response.json();
        
        // Remove typing indicator and add AI response
        hideTypingIndicator();
        chatMessages.push({
            type: 'ai',
            content: data.response,
            timestamp: new Date()
        });

        displayChatMessages();
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        chatMessages.push({
            type: 'ai',
            content: 'Sorry, I\'m experiencing technical difficulties. Please try again.',
            timestamp: new Date()
        });
        displayChatMessages();
    }
}

// Display chat messages
function displayChatMessages() {
    const container = document.getElementById('chatMessages');
    
    container.innerHTML = chatMessages.map(message => `
        <div class="chat-message mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}">
            <div class="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
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

// Show typing indicator
function showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    const indicator = document.createElement('div');
    indicator.id = 'typingIndicator';
    indicator.className = 'chat-message mb-4 text-left';
    indicator.innerHTML = `
        <div class="inline-block bg-gray-100 px-4 py-2 rounded-lg">
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

// Hide typing indicator
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
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
    
    // Add user message
    unifiedChatMessages.push({
        type: 'user',
        content: messageText,
        timestamp: new Date(),
        mode: currentChatMode
    });
    
    if (!message) input.value = '';
    displayUnifiedChatMessages();
    
    // Show typing indicator
    showUnifiedTypingIndicator();
    
    try {
        // Prepare request data
        const requestData = {
            message: messageText,
            chatMode: currentChatMode,
            savedProperties: currentChatMode === 'saved' ? savedProperties : []
        };
        
        // Call AI API
        const data = await makeApiCall(API_ENDPOINTS.unifiedChat, requestData);
        
        // Remove typing indicator and add AI response
        hideUnifiedTypingIndicator();
        unifiedChatMessages.push({
            type: 'ai',
            content: data.response,
            timestamp: new Date(),
            mode: currentChatMode
        });
        
        displayUnifiedChatMessages();
    } catch (error) {
        console.error('Error sending unified message:', error);
        hideUnifiedTypingIndicator();
        unifiedChatMessages.push({
            type: 'ai',
            content: 'Sorry, I\'m experiencing technical difficulties. Please try again.',
            timestamp: new Date(),
            mode: currentChatMode
        });
        displayUnifiedChatMessages();
    }
}

// Display unified chat messages
function displayUnifiedChatMessages() {
    const container = document.getElementById('unifiedChatMessages');
    
    const relevantMessages = unifiedChatMessages.filter(msg => msg.mode === currentChatMode);
    
    if (relevantMessages.length === 0) {
        if (currentChatMode === 'saved') {
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
                    <p>👋 Hello! I'm your AI real estate assistant.</p>
                    <p class="mt-1">Ask me anything about Montreal properties, neighborhoods, prices, or financing!</p>
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