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
    initializeStickySearch();
    loadPopularSearches();
};

// Load properties from API
async function loadProperties(filters = {}, retryCount = 0) {
    try {
        filters.listingType = currentListingType;
        const params = new URLSearchParams(filters);
        
        console.log('Loading properties with filters:', filters);
        
        const response = await fetch(`${API_ENDPOINTS.properties}?${params}`);
        
        // Handle 503 Database Connecting gracefully
        if (response.status === 503) {
            const errorData = await response.json();
            if (errorData.status === 'database_connecting' && retryCount < 5) {
                console.log(`Database connecting, retrying in ${2 + retryCount} seconds... (attempt ${retryCount + 1}/5)`);
                document.getElementById('resultCount').textContent = `🔄 Loading... Database connecting (${retryCount + 1}/5)`;
                
                // Retry with exponential backoff
                setTimeout(() => {
                    loadProperties(filters, retryCount + 1);
                }, (2 + retryCount) * 1000);
                return;
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Properties loaded:', data);
        
        // Handle both direct array and paginated response
        properties = data.properties || data;
        
        displayProperties(properties);
        const typeText = currentListingType === 'rental' ? 'rentals' : 'properties for sale';
        
        // Check if we're showing sample data
        if (data.status === 'sample_data') {
            document.getElementById('resultCount').textContent = `🔄 ${properties.length} sample ${typeText} (database connecting...)`;
            
            // Auto-retry for real data in 3 seconds
            setTimeout(() => {
                console.log('Auto-retrying for real data...');
                loadProperties(filters, 0); // Reset retry count
            }, 3000);
        } else {
            document.getElementById('resultCount').textContent = `${properties.length} ${typeText} found`;
        }
        
        console.log(`Successfully loaded ${properties.length} properties`);
    } catch (error) {
        console.error('Error loading properties:', error);
        if (retryCount >= 5) {
            document.getElementById('resultCount').textContent = `❌ Unable to load properties after multiple attempts. Please refresh the page.`;
        } else {
            document.getElementById('resultCount').textContent = `Error loading properties: ${error.message}`;
        }
        
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
                            class="btn btn-primary btn-md flex-1">
                        <i class="fas fa-robot mr-2"></i>
                        Chat with AI
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

    // Check if we're already chatting about the same property
    const isSameProperty = currentProperty && currentProperty.id === property.id;
    
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
    
    // Only add property context message if we're switching to a different property
    if (!isSameProperty) {
        unifiedChatMessages.push({
            type: 'ai',
            content: `🏠 I'm now helping you with this ${property.property_type} in ${property.neighborhood}!\n\n📍 **${property.address}**\n💰 **${property.listing_type === 'rental' ? `$${property.price}/month` : `$${property.price.toLocaleString()}`}**\n\nWhat would you like to know? I can help with pricing, neighborhood info, financing, or any other questions!`,
            timestamp: new Date(),
            mode: 'property',
            propertyId: property.id
        });
    }
    
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
                            
                            <!-- Location & Area Info -->
                            <div class="bg-white border border-gray-200 rounded-lg p-6">
                                <h3 class="text-lg font-semibold mb-4">Location & Area</h3>
                                <div class="space-y-4">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Neighborhood:</span>
                                        <span class="font-medium">${property.neighborhood}</span>
                                    </div>
                                    
                                    ${property.area_info ? `
                                    <div class="border-t pt-4">
                                        <h4 class="font-medium mb-3">Area Highlights</h4>
                                        <div class="grid grid-cols-2 gap-3 text-sm">
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Walkability:</span>
                                                <span class="text-green-600 font-medium">${property.area_info.walkability_score}/100</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Transit Score:</span>
                                                <span class="text-green-600 font-medium">${property.area_info.transit_score}/100</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Safety Rating:</span>
                                                <span class="text-green-600 font-medium">${property.area_info.safety_rating}/10</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Bike Score:</span>
                                                <span class="text-green-600 font-medium">${property.area_info.bike_score}/100</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="border-t pt-4">
                                        <h4 class="font-medium mb-3">Market Trends</h4>
                                        <div class="text-sm space-y-2">
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">1-Year Price Change:</span>
                                                <span class="text-green-600 font-medium">+${property.area_info.price_trend_1yr}%</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Avg. Days on Market:</span>
                                                <span class="font-medium">${property.area_info.average_days_on_market} days</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span class="text-gray-600">Market Condition:</span>
                                                <span class="font-medium">${property.area_info.inventory_level}</span>
                                            </div>
                                        </div>
                                    </div>
                                    ` : ''}
                                    
                                    <div class="border-t pt-4">
                                        <h4 class="font-medium mb-3">Nearby Amenities</h4>
                                        <div class="grid grid-cols-2 gap-2 text-sm">
                                            ${property.proximity ? Object.entries(property.proximity).slice(0, 8).map(([key, distance]) => 
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
        
        <!-- Mortgage Calculator Widget -->
        <div class="mb-8">
            <h3 class="text-xl font-semibold mb-4">Mortgage Calculator</h3>
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Purchase Price</label>
                            <input type="number" id="calcPrice" value="${property.price}" class="w-full p-3 border rounded-lg" readonly>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Down Payment</label>
                            <div class="flex space-x-2">
                                <input type="number" id="calcDownPayment" value="${Math.round(property.price * 0.20)}" class="flex-1 p-3 border rounded-lg">
                                <select id="calcDownPaymentPercent" class="p-3 border rounded-lg" onchange="updateDownPaymentAmount(${property.price})">
                                    <option value="5">5%</option>
                                    <option value="10">10%</option>
                                    <option value="15">15%</option>
                                    <option value="20" selected>20%</option>
                                    <option value="25">25%</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Interest Rate (%)</label>
                            <input type="number" id="calcInterestRate" value="5.25" step="0.01" class="w-full p-3 border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Amortization (Years)</label>
                            <select id="calcAmortization" class="w-full p-3 border rounded-lg">
                                <option value="20">20 years</option>
                                <option value="25" selected>25 years</option>
                                <option value="30">30 years</option>
                            </select>
                        </div>
                        <button onclick="calculateMortgagePayment()" class="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors">
                            Calculate Payment
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-white p-4 rounded-lg shadow">
                            <h4 class="font-semibold mb-3">Monthly Payment Breakdown</h4>
                            <div id="mortgageResults" class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span>Mortgage Payment:</span>
                                    <span id="monthlyPayment" class="font-medium">$0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Property Tax:</span>
                                    <span id="monthlyTax" class="font-medium">$0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Insurance:</span>
                                    <span id="monthlyInsurance" class="font-medium">$0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Condo Fees:</span>
                                    <span id="monthlyCondoFees" class="font-medium">$${property.condo_fees ? property.condo_fees.monthly : 0}</span>
                                </div>
                                <div class="border-t pt-2 flex justify-between font-bold">
                                    <span>Total Monthly:</span>
                                    <span id="totalMonthly" class="text-blue-600">$0</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white p-4 rounded-lg shadow">
                            <h4 class="font-semibold mb-3">Upfront Costs</h4>
                            <div id="upfrontCosts" class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span>Down Payment:</span>
                                    <span id="upfrontDownPayment" class="font-medium">$0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>CMHC Insurance:</span>
                                    <span id="upfrontCMHC" class="font-medium">$0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Land Transfer Tax:</span>
                                    <span id="upfrontLandTax" class="font-medium">$0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Closing Costs:</span>
                                    <span id="upfrontClosing" class="font-medium">$3,000</span>
                                </div>
                                <div class="border-t pt-2 flex justify-between font-bold">
                                    <span>Total Upfront:</span>
                                    <span id="totalUpfront" class="text-green-600">$0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
        
        // Add transitioning class to prevent flicker
        document.documentElement.classList.add('theme-transitioning');
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        // Remove transitioning class after a brief delay
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
        }, 50);
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

// Natural Language Search Processing
async function processNaturalLanguageSearch() {
    const input = document.getElementById('naturalLanguageInput');
    const query = input.value.trim();
    
    if (!query) {
        showNotification('Please describe what you\'re looking for', 'warning');
        return;
    }
    
    // Show loading state
    const button = input.nextElementSibling;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    button.disabled = true;
    
    try {
        // Call AI API to parse natural language
        const response = await fetch('/api/ai/parse-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error('Failed to process search query');
        }
        
        const parsedData = await response.json();
        
        // Fill form fields with parsed data
        fillSearchForm(parsedData);
        
        // Show success message
        showNotification('Form filled automatically! Review and search.', 'success');
        
        // Auto-search after a brief delay
        setTimeout(() => {
            searchProperties();
        }, 1500);
        
    } catch (error) {
        console.error('Natural language search error:', error);
        // Fallback to local parsing
        const localParsed = parseSearchQueryLocally(query);
        fillSearchForm(localParsed);
        showNotification('Form filled using local AI. Results may vary.', 'info');
    } finally {
        // Restore button
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Local fallback for parsing search queries
function parseSearchQueryLocally(query) {
    const parsed = {
        location: '',
        minPrice: '',
        maxPrice: '',
        bedrooms: '',
        propertyType: '',
        nearMetro: false,
        petsAllowed: false,
        listingType: currentListingType
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
        setListingType('purchase');
    } else if (lowerQuery.includes('rent') || lowerQuery.includes('rental')) {
        parsed.listingType = 'rental';
        setListingType('rental');
    }
    
    return parsed;
}

// Fill search form with parsed data
function fillSearchForm(data) {
    // Animate form updates
    const formFields = ['locationInput', 'minPriceSelect', 'maxPriceSelect', 'bedroomsSelect', 'propertyTypeSelect'];
    
    formFields.forEach((fieldId, index) => {
        setTimeout(() => {
            const field = document.getElementById(fieldId);
            if (field && data[fieldId.replace('Input', '').replace('Select', '')]) {
                // Add highlight animation
                field.style.transform = 'scale(1.05)';
                field.style.boxShadow = '0 0 10px rgba(37, 99, 235, 0.3)';
                
                // Set value
                field.value = data[fieldId.replace('Input', '').replace('Select', '')];
                
                // Remove highlight
                setTimeout(() => {
                    field.style.transform = '';
                    field.style.boxShadow = '';
                }, 300);
            }
        }, index * 200);
    });
    
    // Handle checkboxes
    if (data.nearMetro) {
        setTimeout(() => {
            const checkbox = document.getElementById('nearMetroCheck');
            if (checkbox) {
                checkbox.checked = true;
                checkbox.parentElement.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    checkbox.parentElement.style.transform = '';
                }, 300);
            }
        }, formFields.length * 200);
    }
    
    if (data.petsAllowed) {
        setTimeout(() => {
            const checkbox = document.getElementById('petsAllowedCheck');
            if (checkbox) {
                checkbox.checked = true;
                checkbox.parentElement.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    checkbox.parentElement.style.transform = '';
                }, 300);
            }
        }, (formFields.length + 1) * 200);
    }
}

// Enhanced notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = {
        'success': 'bg-green-600',
        'warning': 'bg-yellow-600', 
        'error': 'bg-red-600',
        'info': 'bg-blue-600'
    }[type] || 'bg-blue-600';
    
    const icon = {
        'success': 'fas fa-check-circle',
        'warning': 'fas fa-exclamation-triangle',
        'error': 'fas fa-times-circle',
        'info': 'fas fa-info-circle'
    }[type] || 'fas fa-info-circle';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center transform translate-x-full transition-transform duration-300`;
    notification.innerHTML = `
        <i class="${icon} mr-3"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Slide in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(full)';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Popular searches functionality
function loadPopularSearches() {
    // Get popular searches from analytics or use defaults
    const popularSearches = getPopularSearches();
    const container = document.getElementById('popularSearches');
    
    if (container) {
        container.innerHTML = popularSearches.map(search => 
            `<button onclick="fillSearchFromPopular('${search.query}')" 
                     class="popular-search-badge bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 transition-all hover:shadow-sm">
                ${search.query}
            </button>`
        ).join('');
    }
}

// Get popular searches based on listing type
function getPopularSearches() {
    const rentalSearches = [
        { query: "2 bed apartment in Plateau under $2000", count: 156 },
        { query: "Studio near metro pet friendly", count: 142 },
        { query: "3 bedroom house in NDG with yard", count: 89 },
        { query: "Downtown loft with parking", count: 76 },
        { query: "1 bed Mile End under $1800", count: 64 }
    ];
    
    const purchaseSearches = [
        { query: "Downtown condo for sale with parking", count: 198 },
        { query: "3 bedroom house in Westmount under $800k", count: 156 },
        { query: "Loft in Old Montreal under $500k", count: 134 },
        { query: "2 bed condo Griffintown with amenities", count: 112 },
        { query: "Townhouse in NDG with garage", count: 98 }
    ];
    
    const searches = currentListingType === 'rental' ? rentalSearches : purchaseSearches;
    return searches.sort((a, b) => b.count - a.count);
}

// Fill search from popular selection
function fillSearchFromPopular(query) {
    const input = document.getElementById('naturalLanguageInput');
    if (input) {
        input.value = query;
        
        // Add visual feedback
        input.style.transform = 'scale(1.02)';
        input.style.boxShadow = '0 0 15px rgba(37, 99, 235, 0.3)';
        
        setTimeout(() => {
            input.style.transform = '';
            input.style.boxShadow = '';
            processNaturalLanguageSearch();
        }, 300);
    }
}

// Track search for analytics
function trackSearch(query, source = 'manual') {
    // Store search analytics locally (could be sent to analytics API)
    const searches = JSON.parse(localStorage.getItem('searchAnalytics') || '[]');
    searches.push({
        query,
        source,
        timestamp: new Date().toISOString(),
        listingType: currentListingType
    });
    
    // Keep only last 100 searches to prevent localStorage bloat
    if (searches.length > 100) {
        searches.splice(0, searches.length - 100);
    }
    
    localStorage.setItem('searchAnalytics', JSON.stringify(searches));
}

// Navigation functionality
function showAgentsSection() {
    showModal('agentsModal', {
        title: 'Meet Our Agents',
        content: `
            <div class="space-y-6">
                <p class="text-gray-600">Connect with verified real estate agents in Montreal.</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-white"></i>
                            </div>
                            <div>
                                <h4 class="font-semibold">Leslie Singerman</h4>
                                <p class="text-sm text-gray-600">Certified Residential & Commercial Broker</p>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <p class="font-medium text-blue-600">Progressive Realties</p>
                            <p><i class="fas fa-phone text-blue-600 w-4"></i> (514) 573-7922</p>
                            <p><i class="fas fa-envelope text-blue-600 w-4"></i> info@progressiverealties.com</p>
                            <p><i class="fas fa-map-marker-alt text-blue-600 w-4"></i> 6795 Crois. Korczak #301, Côte-St-Luc</p>
                            <p><i class="fas fa-globe text-blue-600 w-4"></i> <a href="http://www.progressiverealties.com" target="_blank" class="text-blue-600 hover:underline">progressiverealties.com</a></p>
                        </div>
                        <button onclick="contactAgent('leslie')" class="btn btn-primary btn-sm w-full mt-3">Contact Leslie</button>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-white"></i>
                            </div>
                            <div>
                                <h4 class="font-semibold">Marie Dubois</h4>
                                <p class="text-sm text-gray-600">Plateau & Mile End Specialist</p>
                            </div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <p><i class="fas fa-phone text-green-600 w-4"></i> (514) 555-0123</p>
                            <p><i class="fas fa-envelope text-green-600 w-4"></i> marie@chatlease.com</p>
                            <p><i class="fas fa-star text-yellow-500 w-4"></i> 4.9/5 (127 reviews)</p>
                        </div>
                        <button onclick="contactAgent('marie')" class="btn btn-primary btn-sm w-full mt-3">Contact Marie</button>
                    </div>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h5 class="font-semibold mb-2">Need help finding an agent?</h5>
                    <p class="text-sm text-gray-600 mb-3">Tell us about your needs and we'll match you with the perfect agent.</p>
                    <button onclick="showAgentMatchingForm()" class="btn btn-primary btn-sm">Find My Agent</button>
                </div>
            </div>
        `
    });
}

function showAboutSection() {
    showModal('aboutModal', {
        title: 'About ChatLease',
        content: `
            <div class="space-y-6">
                <div>
                    <h5 class="font-semibold mb-2">Our Mission</h5>
                    <p class="text-gray-600">ChatLease revolutionizes Montreal's real estate experience with AI-powered search and multilingual support, making property discovery accessible to everyone.</p>
                </div>
                
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                    <h5 class="font-semibold mb-4 text-center">The Real Story Behind This Site</h5>
                    <div class="text-center mb-4">
                        <div class="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center mb-4">
                            <i class="fas fa-user text-white"></i>
                        </div>
                    </div>
                    
                    <blockquote class="text-lg text-gray-700 leading-relaxed mb-4 italic text-center">
                        "My mom keeps sending me obviously sketchy property listings every day and I got exhausted looking at and comparing each one, so this is why it was created."
                    </blockquote>
                    
                    <p class="text-gray-600 leading-relaxed mb-4 text-center">
                        Like many of you, I was drowning in endless property links, screenshots, and "have you seen this one?" messages. 
                        Every listing looked the same, every comparison took forever, and honestly? Half of them seemed too good to be true.
                    </p>
                    
                    <p class="text-gray-600 leading-relaxed mb-4 text-center">
                        That's when I realized we needed something better. Something that could actually understand what we're looking for, 
                        verify listings are real, and save us from the endless scroll of uncertainty.
                    </p>
                    
                    <div class="bg-white rounded-lg p-4 text-center">
                        <p class="text-gray-700 font-medium">
                            ChatLease was born from pure frustration and the simple belief that finding a home shouldn't feel like a full-time job.
                        </p>
                        <p class="text-sm text-gray-500 mt-2">— Narissara Namkhan, Creator of ChatLease</p>
                    </div>
                </div>
                
                <div>
                    <h5 class="font-semibold mb-2">Why Choose ChatLease?</h5>
                    <ul class="space-y-2 text-gray-600">
                        <li class="flex items-start space-x-2">
                            <i class="fas fa-robot text-blue-600 mt-1"></i>
                            <span>AI-powered natural language search</span>
                        </li>
                        <li class="flex items-start space-x-2">
                            <i class="fas fa-globe text-blue-600 mt-1"></i>
                            <span>Support for 5 languages</span>
                        </li>
                        <li class="flex items-start space-x-2">
                            <i class="fas fa-shield-alt text-blue-600 mt-1"></i>
                            <span>100% verified listings</span>
                        </li>
                        <li class="flex items-start space-x-2">
                            <i class="fas fa-users text-blue-600 mt-1"></i>
                            <span>Expert local agents</span>
                        </li>
                    </ul>
                </div>
                
                <div>
                    <h5 class="font-semibold mb-2">Contact Information</h5>
                    <div class="space-y-2 text-gray-600">
                        <p><i class="fas fa-user text-blue-600 w-4"></i> Narissara Namkhan</p>
                        <p><i class="fas fa-map-marker-alt text-blue-600 w-4"></i> 3255 Av Ridgewood #1, Montreal, QC H3V1B4</p>
                        <p><i class="fas fa-phone text-blue-600 w-4"></i> (579) 421-2927</p>
                        <p><i class="fas fa-envelope text-blue-600 w-4"></i> narissarahoing@icloud.com</p>
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                    <h5 class="font-semibold mb-2">Follow Us</h5>
                    <div class="flex space-x-4">
                        <a href="https://facebook.com/chatlease" target="_blank" class="text-blue-600 hover:text-blue-800">
                            <i class="fab fa-facebook-f text-xl"></i>
                        </a>
                        <a href="https://twitter.com/chatlease" target="_blank" class="text-blue-600 hover:text-blue-800">
                            <i class="fab fa-twitter text-xl"></i>
                        </a>
                        <a href="https://instagram.com/chatlease" target="_blank" class="text-blue-600 hover:text-blue-800">
                            <i class="fab fa-instagram text-xl"></i>
                        </a>
                        <a href="https://linkedin.com/company/chatlease" target="_blank" class="text-blue-600 hover:text-blue-800">
                            <i class="fab fa-linkedin text-xl"></i>
                        </a>
                    </div>
                </div>
            </div>
        `
    });
}

function showContactSection() {
    showModal('contactModal', {
        title: 'Contact Us',
        content: `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h5 class="font-semibold mb-4">Send us a message</h5>
                        <form onsubmit="submitContactForm(event)" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">Name</label>
                                <input type="text" required class="input" placeholder="Your name">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Email</label>
                                <input type="email" required class="input" placeholder="your@email.com">
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Subject</label>
                                <select class="input">
                                    <option>General Inquiry</option>
                                    <option>Property Question</option>
                                    <option>Agent Request</option>
                                    <option>Technical Support</option>
                                    <option>Partnership</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-1">Message</label>
                                <textarea required class="input h-24 resize-none" placeholder="How can we help you?"></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary w-full">Send Message</button>
                        </form>
                    </div>
                    
                    <div>
                        <h5 class="font-semibold mb-4">Get in touch</h5>
                        <div class="space-y-4">
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-map-marker-alt text-blue-600 mt-1"></i>
                                <div>
                                    <p class="font-medium">Office</p>
                                    <p class="text-gray-600 text-sm">3255 Av Ridgewood #1<br>Montreal, QC H3V1B4</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-phone text-blue-600 mt-1"></i>
                                <div>
                                    <p class="font-medium">Phone</p>
                                    <p class="text-gray-600 text-sm">(579) 421-2927</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-envelope text-blue-600 mt-1"></i>
                                <div>
                                    <p class="font-medium">Email</p>
                                    <p class="text-gray-600 text-sm">narissarahoing@icloud.com</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-user text-blue-600 mt-1"></i>
                                <div>
                                    <p class="font-medium">Contact</p>
                                    <p class="text-gray-600 text-sm">Narissara Namkhan</p>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-clock text-blue-600 mt-1"></i>
                                <div>
                                    <p class="font-medium">Hours</p>
                                    <p class="text-gray-600 text-sm">Mon-Fri: 9AM-6PM<br>Sat-Sun: 10AM-4PM</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                            <p class="text-sm text-blue-800">
                                <i class="fas fa-info-circle mr-2"></i>
                                For urgent property inquiries, use our AI chat or call directly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `
    });
}

// Modal system
function showModal(id, { title, content }) {
    // Remove existing modal if any
    const existingModal = document.getElementById('dynamicModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'dynamicModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center p-6 border-b">
                <h3 class="text-xl font-semibold">${title}</h3>
                <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="p-6">
                ${content}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.transition = 'opacity 0.3s ease';
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    }
}

// Contact agent functionality
function contactAgent(agentId) {
    showModal('contactAgentModal', {
        title: 'Contact Agent',
        content: `
            <div class="space-y-4">
                <p class="text-gray-600">Send a message to your selected agent:</p>
                <form onsubmit="submitAgentContact(event, '${agentId}')" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Name</label>
                            <input type="text" required class="input" placeholder="Your name">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Phone</label>
                            <input type="tel" required class="input" placeholder="(514) 555-0123">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Email</label>
                        <input type="email" required class="input" placeholder="your@email.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">I'm interested in</label>
                        <select class="input">
                            <option>Renting an apartment</option>
                            <option>Buying a property</option>
                            <option>Selling my property</option>
                            <option>General consultation</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Message</label>
                        <textarea required class="input h-24 resize-none" placeholder="Tell the agent about your needs..."></textarea>
                    </div>
                    <div class="flex space-x-3">
                        <button type="submit" class="btn btn-primary flex-1">Send Message</button>
                        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        `
    });
}

// Form submission handlers
function submitContactForm(event) {
    event.preventDefault();
    showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
    closeModal();
}

function submitAgentContact(event, agentId) {
    event.preventDefault();
    showNotification(`Message sent to agent! They'll contact you within 24 hours.`, 'success');
    closeModal();
}

// Login/Signup modals
function showLoginModal() {
    showModal('loginModal', {
        title: 'Welcome Back',
        content: `
            <div class="space-y-4">
                <form onsubmit="handleLogin(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Email</label>
                        <input type="email" required class="input" placeholder="your@email.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Password</label>
                        <input type="password" required class="input" placeholder="••••••••">
                    </div>
                    <div class="flex items-center justify-between">
                        <label class="flex items-center">
                            <input type="checkbox" class="mr-2"> Remember me
                        </label>
                        <a href="#" class="text-blue-600 text-sm hover:underline">Forgot password?</a>
                    </div>
                    <button type="submit" class="btn btn-primary w-full">Sign In</button>
                </form>
                <div class="text-center">
                    <span class="text-gray-600">Don't have an account? </span>
                    <button onclick="showSignupModal()" class="text-blue-600 hover:underline">Sign up</button>
                </div>
            </div>
        `
    });
}

function showSignupModal() {
    showModal('signupModal', {
        title: 'Create Account',
        content: `
            <div class="space-y-4">
                <form onsubmit="handleSignup(event)" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">First Name</label>
                            <input type="text" required class="input" placeholder="John">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Last Name</label>
                            <input type="text" required class="input" placeholder="Doe">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Email</label>
                        <input type="email" required class="input" placeholder="your@email.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Password</label>
                        <input type="password" required class="input" placeholder="••••••••">
                    </div>
                    <div>
                        <label class="flex items-center">
                            <input type="checkbox" required class="mr-2">
                            <span class="text-sm">I agree to the <a href="#" class="text-blue-600">Terms of Service</a> and <a href="#" class="text-blue-600">Privacy Policy</a></span>
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary w-full">Create Account</button>
                </form>
                <div class="text-center">
                    <span class="text-gray-600">Already have an account? </span>
                    <button onclick="showLoginModal()" class="text-blue-600 hover:underline">Sign in</button>
                </div>
            </div>
        `
    });
}

function handleLogin(event) {
    event.preventDefault();
    showNotification('Login successful! Welcome back.', 'success');
    closeModal();
}

function handleSignup(event) {
    event.preventDefault();
    showNotification('Account created successfully! Welcome to ChatLease.', 'success');
    closeModal();
}

// Reset search form
function resetSearchForm() {
    // Clear all form fields
    document.getElementById('locationInput').value = '';
    document.getElementById('naturalLanguageInput').value = '';
    document.getElementById('minPriceSelect').value = '';
    document.getElementById('maxPriceSelect').value = '';
    document.getElementById('bedroomsSelect').value = '';
    document.getElementById('propertyTypeSelect').value = '';
    document.getElementById('nearMetroCheck').checked = false;
    document.getElementById('petsAllowedCheck').checked = false;
    
    // Also clear sticky search
    const stickyInput = document.getElementById('stickyNaturalLanguageInput');
    if (stickyInput) {
        stickyInput.value = '';
    }
    
    // Reload properties with default filters
    loadProperties();
    
    showNotification('Search form reset', 'info');
}

// Scroll to search function
function scrollToSearch() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        // Focus on the natural language input
        setTimeout(() => {
            const input = document.getElementById('naturalLanguageInput');
            if (input) {
                input.focus();
            }
        }, 500);
    }
}

// Scroll to main search from sticky bar
function scrollToMainSearch() {
    scrollToSearch();
    
    // Sync the search text
    const stickyInput = document.getElementById('stickyNaturalLanguageInput');
    const mainInput = document.getElementById('naturalLanguageInput');
    if (stickyInput && mainInput && stickyInput.value) {
        mainInput.value = stickyInput.value;
    }
}

// Process sticky search
function processStickyNaturalLanguageSearch() {
    const stickyInput = document.getElementById('stickyNaturalLanguageInput');
    const mainInput = document.getElementById('naturalLanguageInput');
    
    if (stickyInput && mainInput) {
        // Sync the text
        mainInput.value = stickyInput.value;
        
        // Process the search
        processNaturalLanguageSearch();
    }
}

// Sticky search bar functionality
function initializeStickySearch() {
    const stickyBar = document.getElementById('stickySearchBar');
    const searchForm = document.getElementById('searchForm');
    const nav = document.querySelector('nav');
    
    if (!stickyBar || !searchForm || !nav) return;
    
    let isSticky = false;
    
    const handleScroll = () => {
        const searchFormRect = searchForm.getBoundingClientRect();
        const navHeight = nav.offsetHeight;
        
        // Show sticky bar when search form is above viewport
        const shouldShowSticky = searchFormRect.bottom < navHeight;
        
        if (shouldShowSticky && !isSticky) {
            isSticky = true;
            stickyBar.style.transform = 'translateY(0)';
            
            // Sync the search text
            const mainInput = document.getElementById('naturalLanguageInput');
            const stickyInput = document.getElementById('stickyNaturalLanguageInput');
            if (mainInput && stickyInput && mainInput.value) {
                stickyInput.value = mainInput.value;
            }
        } else if (!shouldShowSticky && isSticky) {
            isSticky = false;
            stickyBar.style.transform = 'translateY(-100%)';
        }
    };
    
    // Throttle scroll events for better performance
    let ticking = false;
    const throttledScroll = () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    };
    
    window.addEventListener('scroll', throttledScroll);
}

// Update the setListingType function to refresh popular searches
const originalSetListingType = window.setListingType;
window.setListingType = function(type) {
    if (originalSetListingType) {
        originalSetListingType(type);
    }
    
    // Refresh popular searches for the new listing type
    loadPopularSearches();
};

// Initialize popular searches when page loads
window.addEventListener('DOMContentLoaded', () => {
    loadPopularSearches();
    initializeStickySearch();
});

// Track search when form is submitted
const originalSearchProperties = window.searchProperties;
window.searchProperties = function() {
    const location = document.getElementById('locationInput')?.value || '';
    if (location) {
        trackSearch(`Search: ${location}`, 'form');
    }
    if (originalSearchProperties) {
        originalSearchProperties();
    }
};

// Update processNaturalLanguageSearch to track analytics
const originalProcessNaturalLanguageSearch = window.processNaturalLanguageSearch;
window.processNaturalLanguageSearch = function() {
    const query = document.getElementById('naturalLanguageInput')?.value || '';
    if (query) {
        trackSearch(query, 'natural_language');
    }
    if (originalProcessNaturalLanguageSearch) {
        originalProcessNaturalLanguageSearch();
    }
};

// ============== FOOTER FUNCTIONALITY ==============

// For Renters section
function showMobileAppInfo() {
    showModal('mobileAppModal', {
        title: 'ChatLease Mobile App',
        content: `
            <div class="space-y-6">
                <div class="text-center">
                    <div class="w-24 h-24 mx-auto bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                        <i class="fas fa-mobile-alt text-white text-3xl"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Coming Soon!</h3>
                    <p class="text-gray-600">The ChatLease mobile app is currently in development.</p>
                </div>
                
                <div class="space-y-4">
                    <h4 class="font-semibold">Features Coming Soon:</h4>
                    <ul class="space-y-2 text-gray-600">
                        <li class="flex items-start space-x-2">
                            <i class="fas fa-check text-green-600 mt-1"></i>
                            <span>Real-time property notifications</span>
                        </li>
                        <li class="flex items-start space-x-2">
                            <i class="fas fa-check text-green-600 mt-1"></i>
                            <span>AR property viewing</span>
                        </li>
                        <li class="flex items-start space-x-2">
                            <i class="fas fa-check text-green-600 mt-1"></i>
                            <span>Offline property browsing</span>
                        </li>
                        <li class="flex items-start space-x-2">
                            <i class="fas fa-check text-green-600 mt-1"></i>
                            <span>Voice search with AI</span>
                        </li>
                    </ul>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h5 class="font-semibold mb-2">Get Notified</h5>
                    <p class="text-sm text-gray-600 mb-3">Be the first to know when our mobile app launches!</p>
                    <div class="flex space-x-2">
                        <input type="email" placeholder="your@email.com" class="input flex-1 text-sm">
                        <button class="btn btn-primary btn-sm">Notify Me</button>
                    </div>
                </div>
            </div>
        `
    });
}

function showRentalTips() {
    showModal('rentalTipsModal', {
        title: 'Montreal Rental Tips',
        content: `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2 text-blue-800">📋 Before You Search</h4>
                        <ul class="space-y-2 text-sm text-blue-700">
                            <li>• Know your budget (30% of income rule)</li>
                            <li>• Check credit score</li>
                            <li>• Prepare required documents</li>
                            <li>• Research neighborhoods</li>
                        </ul>
                    </div>
                    
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2 text-green-800">🏠 Viewing Properties</h4>
                        <ul class="space-y-2 text-sm text-green-700">
                            <li>• Visit at different times</li>
                            <li>• Check water pressure</li>
                            <li>• Test heating/cooling</li>
                            <li>• Inspect for damage</li>
                        </ul>
                    </div>
                    
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2 text-purple-800">📄 Quebec Rental Laws</h4>
                        <ul class="space-y-2 text-sm text-purple-700">
                            <li>• Rent increase limits</li>
                            <li>• Lease assignment rights</li>
                            <li>• Deposit restrictions</li>
                            <li>• Tenant protections</li>
                        </ul>
                    </div>
                    
                    <div class="bg-orange-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2 text-orange-800">🚨 Red Flags</h4>
                        <ul class="space-y-2 text-sm text-orange-700">
                            <li>• Pressure to sign immediately</li>
                            <li>• Requests for cash only</li>
                            <li>• No lease document</li>
                            <li>• Unusual deposit demands</li>
                        </ul>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">🎯 Montreal-Specific Tips</h4>
                    <ul class="space-y-2 text-sm text-gray-700">
                        <li>• Moving Day is July 1st (plan ahead!)</li>
                        <li>• Heating costs can be significant</li>
                        <li>• STM proximity affects value</li>
                        <li>• Consider snow removal policies</li>
                        <li>• Parking can be expensive downtown</li>
                    </ul>
                </div>
            </div>
        `
    });
}

// For Agents section
function showAgentDashboard() {
    showModal('agentDashboardModal', {
        title: 'Agent Dashboard',
        content: `
            <div class="space-y-6">
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-user-tie text-white text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Agent Portal</h3>
                    <p class="text-gray-600">Access your professional dashboard and tools.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">📊 Analytics</h4>
                        <p class="text-sm text-gray-600">Track your listings performance and client engagement.</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">🏠 Listings</h4>
                        <p class="text-sm text-gray-600">Manage your property listings and photos.</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">💬 Leads</h4>
                        <p class="text-sm text-gray-600">Connect with potential clients and schedule viewings.</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">🎓 Training</h4>
                        <p class="text-sm text-gray-600">Access professional development resources.</p>
                    </div>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">🚀 Join Our Network</h4>
                    <p class="text-sm text-gray-600 mb-3">Interested in becoming a ChatLease partner agent?</p>
                    <button onclick="showContactSection()" class="btn btn-primary btn-sm">Contact Us</button>
                </div>
            </div>
        `
    });
}

function showListProperties() {
    showModal('listPropertiesModal', {
        title: 'List Your Properties',
        content: `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold mb-4">List Properties on ChatLease</h3>
                    <p class="text-gray-600 mb-4">Reach thousands of potential tenants and buyers with our AI-powered platform.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="text-center p-4 bg-blue-50 rounded-lg">
                        <div class="w-12 h-12 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-3">
                            <i class="fas fa-upload text-white"></i>
                        </div>
                        <h4 class="font-semibold">Easy Upload</h4>
                        <p class="text-sm text-gray-600">Simple property listing process</p>
                    </div>
                    
                    <div class="text-center p-4 bg-green-50 rounded-lg">
                        <div class="w-12 h-12 mx-auto bg-green-600 rounded-full flex items-center justify-center mb-3">
                            <i class="fas fa-search text-white"></i>
                        </div>
                        <h4 class="font-semibold">AI Matching</h4>
                        <p class="text-sm text-gray-600">Smart client recommendations</p>
                    </div>
                    
                    <div class="text-center p-4 bg-purple-50 rounded-lg">
                        <div class="w-12 h-12 mx-auto bg-purple-600 rounded-full flex items-center justify-center mb-3">
                            <i class="fas fa-chart-line text-white"></i>
                        </div>
                        <h4 class="font-semibold">Analytics</h4>
                        <p class="text-sm text-gray-600">Detailed performance metrics</p>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">Pricing Plans</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span>Basic Listing</span>
                            <span class="font-semibold">$49/month</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Premium with AI</span>
                            <span class="font-semibold">$99/month</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Enterprise</span>
                            <span class="font-semibold">Contact us</span>
                        </div>
                    </div>
                </div>
                
                <div class="text-center">
                    <button onclick="showContactSection()" class="btn btn-primary">Get Started</button>
                </div>
            </div>
        `
    });
}

function showAnalytics() {
    showModal('analyticsModal', {
        title: 'Analytics & Insights',
        content: `
            <div class="space-y-6">
                <div class="text-center">
                    <h3 class="text-lg font-semibold mb-4">Market Analytics</h3>
                    <p class="text-gray-600">Comprehensive Montreal real estate market insights.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">📈 Market Trends</h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• Average rental prices by neighborhood</li>
                            <li>• Seasonal market fluctuations</li>
                            <li>• Property type demand analysis</li>
                            <li>• Price prediction models</li>
                        </ul>
                    </div>
                    
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">🎯 Demographics</h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• Buyer/renter profiles</li>
                            <li>• Income distribution analysis</li>
                            <li>• Age group preferences</li>
                            <li>• Family size correlations</li>
                        </ul>
                    </div>
                    
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">🌍 Location Intelligence</h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• Transit accessibility scores</li>
                            <li>• Amenity proximity analysis</li>
                            <li>• Neighborhood safety ratings</li>
                            <li>• Future development impact</li>
                        </ul>
                    </div>
                    
                    <div class="bg-orange-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">🤖 AI Insights</h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• Property valuation algorithms</li>
                            <li>• Market timing predictions</li>
                            <li>• Investment opportunity scores</li>
                            <li>• Risk assessment models</li>
                        </ul>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">📊 Current Market Snapshot</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">Average 1BR Rent:</span>
                            <span class="font-semibold float-right">$1,650</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Average 2BR Rent:</span>
                            <span class="font-semibold float-right">$2,200</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Average Condo Price:</span>
                            <span class="font-semibold float-right">$485,000</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Market Activity:</span>
                            <span class="font-semibold float-right text-green-600">High</span>
                        </div>
                    </div>
                </div>
            </div>
        `
    });
}

function showTraining() {
    showModal('trainingModal', {
        title: 'Agent Training & Resources',
        content: `
            <div class="space-y-6">
                <div class="text-center">
                    <h3 class="text-lg font-semibold mb-4">Professional Development</h3>
                    <p class="text-gray-600">Enhance your skills with our comprehensive training programs.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">🎓 Certification Programs</h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• Quebec Real Estate Law</li>
                            <li>• Digital Marketing for Agents</li>
                            <li>• AI Tools for Real Estate</li>
                            <li>• Client Communication Excellence</li>
                        </ul>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">📚 Learning Resources</h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• Market Analysis Guides</li>
                            <li>• Contract Templates</li>
                            <li>• Negotiation Strategies</li>
                            <li>• Technology Tutorials</li>
                        </ul>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">🤝 Mentorship</h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• One-on-one coaching</li>
                            <li>• Peer learning groups</li>
                            <li>• Industry expert sessions</li>
                            <li>• Career development planning</li>
                        </ul>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">🏆 Recognition</h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• Top performer awards</li>
                            <li>• Client satisfaction ratings</li>
                            <li>• Professional certifications</li>
                            <li>• Industry recognition</li>
                        </ul>
                    </div>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">🚀 Next Training Session</h4>
                    <p class="text-sm text-gray-600 mb-3">"Mastering AI-Powered Property Matching" - January 15, 2025</p>
                    <button onclick="showContactSection()" class="btn btn-primary btn-sm">Register Now</button>
                </div>
            </div>
        `
    });
}

// Support section
function showHelpCenter() {
    showModal('helpCenterModal', {
        title: 'Help Center',
        content: `
            <div class="space-y-6">
                <div class="text-center">
                    <h3 class="text-lg font-semibold mb-4">How Can We Help?</h3>
                    <div class="relative">
                        <input type="text" placeholder="Search help articles..." class="input pl-10 pr-4 py-2 w-full">
                        <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">🏠 Property Search</h4>
                        <ul class="space-y-2 text-sm text-blue-700">
                            <li><a href="#" class="hover:underline">How to use AI search</a></li>
                            <li><a href="#" class="hover:underline">Advanced filters guide</a></li>
                            <li><a href="#" class="hover:underline">Saving properties</a></li>
                            <li><a href="#" class="hover:underline">Setting up alerts</a></li>
                        </ul>
                    </div>
                    
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">💬 Chat Assistant</h4>
                        <ul class="space-y-2 text-sm text-green-700">
                            <li><a href="#" class="hover:underline">Getting started with AI</a></li>
                            <li><a href="#" class="hover:underline">Understanding responses</a></li>
                            <li><a href="#" class="hover:underline">Language settings</a></li>
                            <li><a href="#" class="hover:underline">Privacy & data</a></li>
                        </ul>
                    </div>
                    
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">👤 Account Management</h4>
                        <ul class="space-y-2 text-sm text-purple-700">
                            <li><a href="#" class="hover:underline">Creating an account</a></li>
                            <li><a href="#" class="hover:underline">Profile settings</a></li>
                            <li><a href="#" class="hover:underline">Notification preferences</a></li>
                            <li><a href="#" class="hover:underline">Password reset</a></li>
                        </ul>
                    </div>
                    
                    <div class="bg-orange-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">🔧 Technical Support</h4>
                        <ul class="space-y-2 text-sm text-orange-700">
                            <li><a href="#" class="hover:underline">Browser compatibility</a></li>
                            <li><a href="#" class="hover:underline">Mobile app issues</a></li>
                            <li><a href="#" class="hover:underline">Performance problems</a></li>
                            <li><a href="#" class="hover:underline">Bug reporting</a></li>
                        </ul>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">🎯 Quick Actions</h4>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="toggleChatbot()" class="btn btn-secondary btn-sm">Talk to AI</button>
                        <button onclick="showContactSection()" class="btn btn-secondary btn-sm">Contact Support</button>
                        <button onclick="showFAQ()" class="btn btn-secondary btn-sm">View FAQ</button>
                    </div>
                </div>
            </div>
        `
    });
}

function showFAQ() {
    showModal('faqModal', {
        title: 'Frequently Asked Questions',
        content: `
            <div class="space-y-6">
                <div class="space-y-4">
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">How does the AI search work?</h4>
                        <p class="text-sm text-gray-600">Our AI understands natural language queries and translates them into specific search criteria. Just describe what you're looking for in plain English, and our system will automatically fill in the search form with relevant filters.</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">Are all listings verified?</h4>
                        <p class="text-sm text-gray-600">Yes, all properties on ChatLease are verified by licensed agents. We cross-reference listings with official sources and conduct regular quality checks to ensure accuracy.</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">What languages are supported?</h4>
                        <p class="text-sm text-gray-600">ChatLease supports English, French, Spanish, Arabic, and Mandarin. Our AI assistant can communicate in all these languages to help Montreal's diverse community.</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">How do I schedule a property viewing?</h4>
                        <p class="text-sm text-gray-600">Click on any property to view details, then use the "Chat with AI" button to schedule a viewing. Our assistant will connect you with the appropriate agent and coordinate the appointment.</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">Is there a mobile app?</h4>
                        <p class="text-sm text-gray-600">We're currently developing a mobile app with advanced features like AR viewing and voice search. Sign up for notifications to be the first to know when it launches!</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h4 class="font-semibold mb-2">How do I report a problem?</h4>
                        <p class="text-sm text-gray-600">Use the contact form to report any issues. Our support team responds within 24 hours and will work to resolve your problem quickly.</p>
                    </div>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">Still have questions?</h4>
                    <p class="text-sm text-gray-600 mb-3">Our AI assistant is available 24/7 to help answer your questions.</p>
                    <button onclick="toggleChatbot()" class="btn btn-primary btn-sm">Ask ChatLease AI</button>
                </div>
            </div>
        `
    });
}

function showPrivacyPolicy() {
    showModal('privacyModal', {
        title: 'Privacy Policy',
        content: `
            <div class="space-y-6">
                <div class="text-sm space-y-4">
                    <p class="text-gray-600">Last updated: December 2024</p>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Information We Collect</h4>
                        <ul class="space-y-1 text-gray-600 ml-4">
                            <li>• Search queries and property preferences</li>
                            <li>• Account information (name, email, phone)</li>
                            <li>• Usage data and analytics</li>
                            <li>• Chat conversations with our AI assistant</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">How We Use Your Information</h4>
                        <ul class="space-y-1 text-gray-600 ml-4">
                            <li>• Provide personalized property recommendations</li>
                            <li>• Improve our AI algorithms</li>
                            <li>• Send relevant property alerts</li>
                            <li>• Analyze platform performance</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Data Security</h4>
                        <p class="text-gray-600">We use industry-standard encryption and security measures to protect your personal information. Your data is stored securely and never shared with third parties without your consent.</p>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Your Rights</h4>
                        <ul class="space-y-1 text-gray-600 ml-4">
                            <li>• Access your personal data</li>
                            <li>• Request data correction or deletion</li>
                            <li>• Opt-out of marketing communications</li>
                            <li>• Export your data</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Cookies</h4>
                        <p class="text-gray-600">We use cookies to enhance your experience, remember your preferences, and analyze site usage. You can control cookie settings through your browser.</p>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Contact Us</h4>
                        <p class="text-gray-600">If you have questions about this privacy policy, please contact our privacy team at privacy@chatlease.com.</p>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">Quebec Privacy Laws</h4>
                    <p class="text-sm text-gray-600">ChatLease complies with Quebec's privacy legislation, including the Act respecting the protection of personal information in the private sector.</p>
                </div>
            </div>
        `
    });
}

// ============== MORTGAGE CALCULATOR FUNCTIONS ==============

// Update down payment amount when percentage changes
function updateDownPaymentAmount(price) {
    const percent = document.getElementById('calcDownPaymentPercent').value;
    const downPayment = Math.round(price * (percent / 100));
    document.getElementById('calcDownPayment').value = downPayment;
}

// Calculate mortgage payment
async function calculateMortgagePayment() {
    const price = parseInt(document.getElementById('calcPrice').value);
    const downPayment = parseInt(document.getElementById('calcDownPayment').value);
    const interestRate = parseFloat(document.getElementById('calcInterestRate').value);
    const amortization = parseInt(document.getElementById('calcAmortization').value);
    
    try {
        const response = await fetch('/api/calculator/mortgage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                price: price,
                downPayment: downPayment,
                interestRate: interestRate,
                amortization: amortization
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            updateMortgageResults(data);
        } else {
            console.error('Error calculating mortgage:', data.error);
            showNotification('Error calculating mortgage', 'error');
        }
    } catch (error) {
        console.error('Error calculating mortgage:', error);
        showNotification('Error calculating mortgage', 'error');
    }
}

// Update mortgage calculation results
function updateMortgageResults(data) {
    // Monthly payment breakdown
    document.getElementById('monthlyPayment').textContent = `$${data.monthlyPayment.toLocaleString()}`;
    document.getElementById('monthlyTax').textContent = `$${data.monthlyPropertyTax.toLocaleString()}`;
    document.getElementById('monthlyInsurance').textContent = `$${data.monthlyInsurance.toLocaleString()}`;
    
    const condoFees = parseInt(document.getElementById('monthlyCondoFees').textContent.replace('$', '').replace(',', '')) || 0;
    const totalMonthly = data.monthlyPayment + data.monthlyPropertyTax + data.monthlyInsurance + condoFees;
    document.getElementById('totalMonthly').textContent = `$${totalMonthly.toLocaleString()}`;
    
    // Upfront costs
    document.getElementById('upfrontDownPayment').textContent = `$${data.upfrontCosts.downPayment.toLocaleString()}`;
    document.getElementById('upfrontCMHC').textContent = `$${data.upfrontCosts.cmhcInsurance.toLocaleString()}`;
    document.getElementById('upfrontLandTax').textContent = `$${data.upfrontCosts.landTransferTax.toLocaleString()}`;
    document.getElementById('upfrontClosing').textContent = `$${(data.upfrontCosts.notaryFees + data.upfrontCosts.inspectionFees + data.upfrontCosts.legalFees).toLocaleString()}`;
    document.getElementById('totalUpfront').textContent = `$${data.upfrontCosts.total.toLocaleString()}`;
}