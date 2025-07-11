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
    initializeTheme();
    initializeLanguageSelector();
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
        <div class="property-card card overflow-hidden cursor-pointer" onclick="openPropertyDetails(${property.id})">
            <div class="relative h-48 overflow-hidden">
                <img src="${property.main_image}" alt="${property.address}" class="w-full h-full object-cover" 
                     onerror="this.src='https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop'">
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
                    <button onclick="openPropertyChat(${property.id}); event.stopPropagation()" 
                            class="btn btn-primary btn-md flex-1 relative group">
                        <i class="fas fa-robot mr-2"></i>
                        Chat with AI
                        <span class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white group-hover:bg-blue-400 transition-colors"></span>
                    </button>
                    <button onclick="toggleSaveProperty(${property.id}); event.stopPropagation()" id="saveBtn-${property.id}" 
                            class="btn btn-secondary btn-md">
                        <i class="fas fa-heart" id="saveIcon-${property.id}"></i>
                    </button>
                    <button onclick="shareProperty(${property.id}); event.stopPropagation()" class="btn btn-secondary btn-md">
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

    // Visual feedback: highlight the chat bubble briefly
    const chatBubble = document.getElementById('chatBubble');
    chatBubble.classList.add('animate-pulse');
    setTimeout(() => chatBubble.classList.remove('animate-pulse'), 1000);

    // Set current property context and mode
    currentProperty = property;
    currentChatMode = 'property';
    
    // Open the floating chatbot with animation
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatBubbleIcon = document.getElementById('chatBubbleIcon');
    
    if (chatbotWindow.classList.contains('hidden')) {
        chatbotWindow.classList.remove('hidden');
        chatbotWindow.style.transform = 'scale(0.8) translateY(20px)';
        chatbotWindow.style.opacity = '0';
        
        setTimeout(() => {
            chatbotWindow.style.transform = 'scale(1) translateY(0)';
            chatbotWindow.style.opacity = '1';
            chatbotWindow.style.transition = 'all 0.3s ease-out';
        }, 50);
        
        chatBubbleIcon.className = 'fas fa-times text-xl group-hover:scale-110 transition-transform';
        adjustChatbotPosition();
    }
    
    // Update interface for property mode
    updateChatbotHeader(property);
    updateChatInterface();
    updateModeButtons('property');
    addPropertyQuickQuestions(property);
    
    // Add property context message
    unifiedChatMessages.push({
        type: 'ai',
        content: `🏠 I'm now helping you with this ${property.property_type} in ${property.neighborhood}!\n\n📍 **${property.address}**\n💰 **${property.listing_type === 'rental' ? `$${property.price}/month` : `$${property.price.toLocaleString()}`}**\n\nWhat would you like to know? I can help with pricing, neighborhood info, financing, or any other questions!`,
        timestamp: new Date(),
        mode: 'property',
        propertyId: property.id
    });
    
    displayUnifiedChatMessages();
    
    // Focus on input with slight delay for better UX
    setTimeout(() => {
        document.getElementById('unifiedChatInput').focus();
    }, 400);
    
    // Scroll to show the connection
    setTimeout(() => {
        chatbotWindow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);
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
                <div class="flex-1">
                    <h3 class="font-semibold text-sm">${property.address}</h3>
                    <p class="text-xs opacity-90">${property.neighborhood}, ${formatPrice(property.price)}${property.listing_type === 'rental' ? '/mo' : ''}</p>
                </div>
            </div>
            <button onclick="toggleChatbot()" class="text-white hover:bg-blue-500 p-2 rounded">
                <i class="fas fa-times"></i>
            </button>
        `;
    } else {
        header.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <i class="fas fa-robot text-sm"></i>
                </div>
                <div>
                    <h3 class="font-semibold text-sm">ChatLease AI</h3>
                    <p class="text-xs opacity-90">Montreal Real Estate Assistant</p>
                </div>
            </div>
            <button onclick="toggleChatbot()" class="text-white hover:bg-blue-500 p-2 rounded">
                <i class="fas fa-times"></i>
            </button>
        `;
    }
}

// Clear property context and return to general chat
function clearPropertyContext() {
    currentProperty = null;
    currentChatMode = 'general';
    updateChatbotHeader(null);
    updateChatInterface();
    updateModeButtons('general');
    addPropertyQuickQuestions(null);
    
    // Don't add transition message - just switch modes
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
                     class="text-xs bg-white hover:bg-blue-50 hover:text-blue-600 px-3 py-2 rounded-full border border-gray-200 transition-all">
                ${question}
            </button>`
        ).join('');
    } else {
        // General questions
        quickButtons.innerHTML = `
            <button onclick="sendUnifiedMessage('Best neighborhoods?')" 
                    class="text-xs bg-white hover:bg-blue-50 hover:text-blue-600 px-3 py-2 rounded-full border border-gray-200 transition-all">
                Best areas?
            </button>
            <button onclick="sendUnifiedMessage('Average prices?')" 
                    class="text-xs bg-white hover:bg-blue-50 hover:text-blue-600 px-3 py-2 rounded-full border border-gray-200 transition-all">
                Prices?
            </button>
            <button onclick="sendUnifiedMessage('Under $400k?')" 
                    class="text-xs bg-white hover:bg-blue-50 hover:text-blue-600 px-3 py-2 rounded-full border border-gray-200 transition-all">
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
    // Handle all three modes
    const modes = ['general', 'saved', 'property'];
    
    modes.forEach(mode => {
        const button = document.getElementById(`${mode}ChatMode`);
        if (button) {
            button.className = activeMode === mode 
                ? 'flex-1 px-3 py-2 text-xs rounded-md font-medium transition-all bg-blue-600 text-white'
                : 'flex-1 px-3 py-2 text-xs rounded-md font-medium transition-all text-gray-700 hover:bg-gray-200';
        }
    });
}

// Update mode buttons visibility and state
function updateModeButtons(activeMode) {
    const propertyButton = document.getElementById('propertyChatMode');
    
    if (activeMode === 'property' && currentProperty) {
        // Show property button when in property mode
        propertyButton.classList.remove('hidden');
        propertyButton.innerHTML = `<i class="fas fa-home mr-1"></i>${currentProperty.neighborhood}`;
    } else if (!currentProperty) {
        // Hide property button when no property context
        propertyButton.classList.add('hidden');
    }
    
    updateTabStyles(activeMode);
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

// Set chat mode (general, saved, or property)
function setChatMode(mode) {
    // Don't allow switching to property mode if no property is selected
    if (mode === 'property' && !currentProperty) {
        return;
    }
    
    currentChatMode = mode;
    updateModeButtons(mode);
    displayUnifiedChatMessages();
    
    // Update chat interface based on mode
    if (mode === 'property' && currentProperty) {
        updateChatbotHeader(currentProperty);
        addPropertyQuickQuestions(currentProperty);
    } else {
        updateChatbotHeader(null);
        addPropertyQuickQuestions(null);
    }
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
    
    // Filter messages based on current mode
    let relevantMessages = [];
    if (currentChatMode === 'property' && currentProperty) {
        relevantMessages = unifiedChatMessages.filter(msg => 
            msg.mode === 'property' && msg.propertyId === currentProperty.id
        );
    } else {
        relevantMessages = unifiedChatMessages.filter(msg => msg.mode === currentChatMode);
    }
    
    if (relevantMessages.length === 0) {
        if (currentChatMode === 'property' && currentProperty) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-home text-2xl text-blue-600"></i>
                    </div>
                    <h3 class="font-semibold text-gray-900 mb-2">Property Assistant</h3>
                    <p class="text-sm text-gray-600">Ask about ${currentProperty.address}</p>
                    <p class="text-xs text-gray-500 mt-1">I can help with pricing, neighborhood info, financing, and more.</p>
                </div>
            `;
        } else if (currentChatMode === 'saved') {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-heart text-2xl text-red-500"></i>
                    </div>
                    <h3 class="font-semibold text-gray-900 mb-2">Saved Properties</h3>
                    <p class="text-sm text-gray-600">You have ${savedProperties.length} saved ${savedProperties.length === 1 ? 'property' : 'properties'}</p>
                    <p class="text-xs text-gray-500 mt-1">Ask me to compare them or get detailed analysis!</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-robot text-2xl text-blue-600"></i>
                    </div>
                    <h3 class="font-semibold text-gray-900 mb-2">ChatLease AI Assistant</h3>
                    <p class="text-sm text-gray-600">Ask me about Montreal real estate</p>
                    <p class="text-xs text-gray-500 mt-1">I can help with property search, pricing, neighborhoods, and more!</p>
                </div>
            `;
        }
        return;
    }
    
    container.innerHTML = relevantMessages.map(message => `
        <div class="chat-message mb-3 ${message.type === 'user' ? 'text-right' : 'text-left'}">
            <div class="inline-block max-w-xs px-4 py-2.5 rounded-lg ${
                message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
            }">
                <p class="text-sm leading-relaxed">${message.content}</p>
                <p class="text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}">
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

// Share property function
function shareProperty(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;
    
    const shareData = {
        title: `${property.address} - ${property.neighborhood}`,
        text: `Check out this ${property.property_type} in ${property.neighborhood} for ${property.listing_type === 'rental' ? `$${property.price}/month` : `$${property.price.toLocaleString()}`}`,
        url: window.location.href
    };
    
    if (navigator.share) {
        navigator.share(shareData);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${shareData.title} - ${shareData.text} ${shareData.url}`).then(() => {
            // Show temporary feedback
            const btn = event.target.closest('button');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('bg-green-500', 'text-white');
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('bg-green-500', 'text-white');
            }, 2000);
        });
    }
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
    const chatBubble = document.getElementById('chatBubble');
    const chatBubbleIcon = document.getElementById('chatBubbleIcon');
    
    if (chatbotWindow.classList.contains('hidden')) {
        // Show chatbot
        chatbotWindow.classList.remove('hidden');
        chatBubbleIcon.className = 'fas fa-times text-xl group-hover:scale-110 transition-transform';
        
        // Adjust positioning to avoid overlap
        adjustChatbotPosition();
        
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
        
        // Reset chat bubble visibility
        chatBubble.style.opacity = '1';
        chatBubble.style.pointerEvents = 'auto';
        
        // Clear property context when closing
        if (currentProperty) {
            currentProperty = null;
            updateChatbotHeader(null);
            addPropertyQuickQuestions(null);
        }
    }
}

// Adjust chatbot position to avoid overlap with chat bubble
function adjustChatbotPosition() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatBubble = document.getElementById('chatBubble');
    
    // Hide chat bubble when window is open instead of moving it
    chatBubble.style.opacity = '0';
    chatBubble.style.pointerEvents = 'none';
    chatBubble.style.transition = 'opacity 0.3s ease';
}

// Update chat interface based on current context
function updateChatInterface() {
    const modeSelector = document.getElementById('chatModeSelector');
    
    // Always show mode selector, but manage property button visibility
    modeSelector.style.display = 'block';
    
    // Update mode buttons based on current context
    updateModeButtons(currentChatMode);
    
    // Display messages for current mode
    displayUnifiedChatMessages();
}

// ============== PROPERTY DETAILS MODAL ==============

// Open detailed property view modal
function openPropertyDetails(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;
    
    // Create modal HTML
    const modalHTML = `
        <div id="propertyModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                <!-- Modal Header -->
                <div class="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">${property.address}</h2>
                        <p class="text-blue-600 font-medium">${property.neighborhood}</p>
                    </div>
                    <button onclick="closePropertyModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <!-- Property Image -->
                <div class="relative h-80 bg-gray-200">
                    <img src="${property.main_image}" alt="${property.address}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop'">
                    <div class="absolute top-4 left-4">
                        <span class="bg-white px-4 py-2 rounded-lg text-2xl font-bold text-green-600 shadow-md">
                            ${formatPrice(property.price)}${property.listing_type === 'rental' ? '/month' : ''}
                        </span>
                    </div>
                    <div class="absolute top-4 right-4">
                        <span class="bg-${CLIENT_CONFIG.PROPERTY.LISTING_TYPES[property.listing_type].colorClass}-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                            ${CLIENT_CONFIG.PROPERTY.LISTING_TYPES[property.listing_type].label}
                        </span>
                    </div>
                </div>
                
                <!-- Property Details Grid -->
                <div class="p-6">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <!-- Main Details Column -->
                        <div class="lg:col-span-2">
                            <!-- Key Facts -->
                            <div class="mb-8">
                                <h3 class="text-xl font-semibold mb-4">Property Details</h3>
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <div class="text-2xl font-bold text-blue-600">${property.bedrooms}</div>
                                        <div class="text-sm text-gray-600">Bedrooms</div>
                                    </div>
                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <div class="text-2xl font-bold text-blue-600">${property.bathrooms}</div>
                                        <div class="text-sm text-gray-600">Bathrooms</div>
                                    </div>
                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <div class="text-2xl font-bold text-blue-600">${property.sqft || property.living_area_sqft}</div>
                                        <div class="text-sm text-gray-600">Sq Ft</div>
                                    </div>
                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <div class="text-2xl font-bold text-blue-600">$${property.price_per_sqft}</div>
                                        <div class="text-sm text-gray-600">Price/Sq Ft</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Description -->
                            <div class="mb-8">
                                <h3 class="text-xl font-semibold mb-4">Description</h3>
                                <p class="text-gray-700 leading-relaxed">${property.description_en || property.description_fr}</p>
                            </div>
                            
                            <!-- Amenities -->
                            <div class="mb-8">
                                <h3 class="text-xl font-semibold mb-4">Amenities</h3>
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    ${property.amenities.map(amenity => 
                                        `<div class="flex items-center">
                                            <i class="fas fa-check text-green-500 mr-2"></i>
                                            <span class="text-gray-700">${translateAmenity(amenity)}</span>
                                        </div>`
                                    ).join('')}
                                </div>
                            </div>
                            
                            ${property.listing_type === 'purchase' ? generatePurchaseDetails(property) : generateRentalDetails(property)}
                        </div>
                        
                        <!-- Sidebar -->
                        <div>
                            <!-- Contact Card -->
                            <div class="bg-gray-50 rounded-lg p-6 mb-6">
                                <h3 class="text-lg font-semibold mb-4">Interested?</h3>
                                <button onclick="openPropertyChat(${property.id}); closePropertyModal()" 
                                        class="btn btn-primary btn-lg w-full mb-3">
                                    <i class="fas fa-robot mr-2"></i>
                                    Chat with AI
                                </button>
                                <button onclick="toggleSaveProperty(${property.id})" 
                                        class="btn btn-secondary btn-lg w-full mb-3">
                                    <i class="fas fa-heart mr-2"></i>
                                    Save Property
                                </button>
                                <button onclick="shareProperty(${property.id})" 
                                        class="btn btn-secondary btn-lg w-full">
                                    <i class="fas fa-share mr-2"></i>
                                    Share
                                </button>
                            </div>
                            
                            <!-- Location Info -->
                            <div class="bg-white border border-gray-200 rounded-lg p-6">
                                <h3 class="text-lg font-semibold mb-4">Location</h3>
                                <div class="space-y-3">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Neighborhood:</span>
                                        <span class="font-medium">${property.neighborhood}</span>
                                    </div>
                                    ${property.proximity ? Object.entries(property.proximity).slice(0, 5).map(([key, distance]) => 
                                        `<div class="flex justify-between">
                                            <span class="text-gray-600">${key.replace('_', ' ')}:</span>
                                            <span class="text-blue-600">${distance}m</span>
                                        </div>`
                                    ).join('') : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
}

// Close property modal
function closePropertyModal() {
    const modal = document.getElementById('propertyModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Generate purchase-specific details
function generatePurchaseDetails(property) {
    return `
        <div class="mb-8">
            <h3 class="text-xl font-semibold mb-4">Financial Details</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${property.taxes ? `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="text-lg font-bold text-gray-900">$${property.taxes.total_annual.toLocaleString()}</div>
                        <div class="text-sm text-gray-600">Annual Property Taxes</div>
                    </div>
                ` : ''}
                ${property.condo_fees ? `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="text-lg font-bold text-gray-900">$${property.condo_fees.monthly}</div>
                        <div class="text-sm text-gray-600">Monthly Condo Fees</div>
                    </div>
                ` : ''}
                ${property.monthly_costs ? `
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <div class="text-lg font-bold text-blue-600">$${property.monthly_costs.total}</div>
                        <div class="text-sm text-gray-600">Est. Total Monthly Cost</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Generate rental-specific details
function generateRentalDetails(property) {
    return `
        <div class="mb-8">
            <h3 class="text-xl font-semibold mb-4">Rental Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="text-lg font-bold text-gray-900">${property.pets_allowed ? 'Yes' : 'No'}</div>
                    <div class="text-sm text-gray-600">Pets Allowed</div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="text-lg font-bold text-gray-900">${property.furnished || 'Unfurnished'}</div>
                    <div class="text-sm text-gray-600">Furnishing</div>
                </div>
            </div>
        </div>
    `;
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.id === 'propertyModal') {
        closePropertyModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePropertyModal();
    }
});

// ============== THEME & UI FUNCTIONS ==============

// Initialize theme functionality
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    // Check for saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Theme toggle event listener
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

// Update theme icon
function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun text-sm';
    } else {
        themeIcon.className = 'fas fa-moon text-sm';
    }
}

// Initialize language selector
function initializeLanguageSelector() {
    const languageSelector = document.getElementById('languageSelector');
    
    // Check for saved language or default to English
    const savedLanguage = localStorage.getItem('language') || 'en';
    languageSelector.value = savedLanguage;
    
    // Language change event listener
    languageSelector.addEventListener('change', (e) => {
        const selectedLanguage = e.target.value;
        localStorage.setItem('language', selectedLanguage);
        
        // Here you would implement actual language switching
        // For now, just show a notification
        showLanguageNotification(selectedLanguage);
    });
}

// Show language change notification
function showLanguageNotification(language) {
    const languageNames = {
        'en': 'English',
        'fr': 'Français',
        'es': 'Español', 
        'ar': 'العربية',
        'zh': '中文'
    };
    
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = `Language changed to ${languageNames[language]}`;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}