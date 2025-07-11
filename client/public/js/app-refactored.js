/**
 * ChatLease - Modern Real Estate Platform
 * Refactored JavaScript Architecture
 * 
 * This file implements a modular, maintainable architecture
 * with clear separation of concerns and improved performance.
 */

// =====================================================
// 1. NAMESPACE & CONFIGURATION
// =====================================================
const ChatLease = (function() {
    'use strict';

    // ========== Configuration ==========
    const CONFIG = {
        API: {
            BASE_URL: window.location.origin,
            ENDPOINTS: {
                properties: '/api/properties',
                unifiedChat: '/api/ai/unified-chat',
                compare: '/api/compare',
                favorites: '/api/favorites',
                neighborhoods: '/api/neighborhoods',
                priceRanges: '/api/price-ranges'
            }
        },
        UI: {
            DEBOUNCE_DELAY: 300,
            ANIMATION_DURATION: 300,
            MAX_QUICK_AMENITIES: 3,
            PROPERTIES_PER_PAGE: 20,
            CHAT_TIME_FORMAT: { hour: '2-digit', minute: '2-digit' }
        },
        STORAGE: {
            THEME: 'chatlease_theme',
            LANGUAGE: 'chatlease_language',
            SAVED_PROPERTIES: 'chatlease_saved_properties',
            USER_PREFERENCES: 'chatlease_user_prefs'
        }
    };

    // ========== State Management ==========
    const state = {
        properties: [],
        currentProperty: null,
        savedProperties: new Set(),
        currentListingType: 'rental',
        currentChatMode: 'general',
        chatMessages: [],
        isLoading: false,
        error: null
    };

    // =====================================================
    // 2. UTILITY FUNCTIONS
    // =====================================================
    const Utils = {
        /**
         * Debounce function to limit API calls
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Format currency with locale support
         */
        formatCurrency(amount) {
            return new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        },

        /**
         * Format date with locale support
         */
        formatDate(date, options = {}) {
            return new Intl.DateTimeFormat('en-CA', options).format(new Date(date));
        },

        /**
         * Sanitize HTML to prevent XSS
         */
        sanitizeHTML(html) {
            const temp = document.createElement('div');
            temp.textContent = html;
            return temp.innerHTML;
        },

        /**
         * Generate unique ID
         */
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        /**
         * Deep clone object
         */
        deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * Get element by ID with null check
         */
        getElement(id) {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Element with ID '${id}' not found`);
            }
            return element;
        },

        /**
         * Add event listener with automatic cleanup
         */
        addEventListener(element, event, handler, options) {
            element.addEventListener(event, handler, options);
            return () => element.removeEventListener(event, handler, options);
        }
    };

    // =====================================================
    // 3. API MODULE
    // =====================================================
    const API = {
        /**
         * Generic fetch wrapper with error handling
         */
        async request(endpoint, options = {}) {
            try {
                const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                console.error('API request failed:', error);
                throw error;
            }
        },

        /**
         * Load properties with filters
         */
        async loadProperties(filters = {}) {
            const params = new URLSearchParams({
                ...filters,
                listingType: state.currentListingType,
                limit: CONFIG.UI.PROPERTIES_PER_PAGE
            });

            return this.request(`${CONFIG.API.ENDPOINTS.properties}?${params}`);
        },

        /**
         * Send chat message
         */
        async sendChatMessage(message, context = {}) {
            return this.request(CONFIG.API.ENDPOINTS.unifiedChat, {
                method: 'POST',
                body: JSON.stringify({
                    message,
                    mode: state.currentChatMode,
                    context
                })
            });
        }
    };

    // =====================================================
    // 4. STORAGE MODULE
    // =====================================================
    const Storage = {
        /**
         * Get item from localStorage with JSON parsing
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Storage get error:', error);
                return defaultValue;
            }
        },

        /**
         * Set item in localStorage with JSON stringification
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Storage set error:', error);
                return false;
            }
        },

        /**
         * Remove item from localStorage
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Storage remove error:', error);
                return false;
            }
        },

        /**
         * Clear all app-related storage
         */
        clearAll() {
            Object.values(CONFIG.STORAGE).forEach(key => this.remove(key));
        }
    };

    // =====================================================
    // 5. THEME MODULE
    // =====================================================
    const Theme = {
        /**
         * Initialize theme system
         */
        init() {
            const savedTheme = Storage.get(CONFIG.STORAGE.THEME, 'light');
            this.apply(savedTheme);
            this.bindEvents();
        },

        /**
         * Apply theme to document
         */
        apply(theme) {
            document.documentElement.classList.add('theme-transitioning');
            document.documentElement.setAttribute('data-theme', theme);
            this.updateIcon(theme);
            
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transitioning');
            }, 50);
        },

        /**
         * Toggle between light and dark themes
         */
        toggle() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.apply(newTheme);
            Storage.set(CONFIG.STORAGE.THEME, newTheme);
        },

        /**
         * Update theme toggle icon
         */
        updateIcon(theme) {
            const icon = Utils.getElement('themeIcon');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm';
            }
        },

        /**
         * Bind theme toggle events
         */
        bindEvents() {
            const toggle = Utils.getElement('themeToggle');
            if (toggle) {
                Utils.addEventListener(toggle, 'click', () => this.toggle());
            }
        }
    };

    // =====================================================
    // 6. PROPERTY MODULE
    // =====================================================
    const Property = {
        /**
         * Load and display properties
         */
        async load(filters = {}) {
            try {
                UI.setLoading(true);
                const data = await API.loadProperties(filters);
                state.properties = data.properties || data;
                this.display();
                UI.updateResultCount();
            } catch (error) {
                UI.showError('Failed to load properties', error);
            } finally {
                UI.setLoading(false);
            }
        },

        /**
         * Display properties in grid
         */
        display() {
            const container = Utils.getElement('propertyResults');
            if (!container) return;

            if (state.properties.length === 0) {
                container.innerHTML = UI.renderEmptyState();
                return;
            }

            container.innerHTML = state.properties.map(property => 
                this.renderCard(property)
            ).join('');
        },

        /**
         * Render single property card
         */
        renderCard(property) {
            const isSaved = state.savedProperties.has(property.id);
            const price = property.listing_type === 'rental' 
                ? `${Utils.formatCurrency(property.price)}/mo` 
                : Utils.formatCurrency(property.price);

            return `
                <div class="property-card card" onclick="ChatLease.Property.showDetails(${property.id})">
                    <div class="relative overflow-hidden h-48">
                        <img src="${property.imageUrl}" 
                             alt="${property.address}" 
                             class="w-full h-full object-cover"
                             loading="lazy">
                        
                        <!-- Price Badge -->
                        <span class="absolute top-4 right-4 badge badge-price">
                            ${price}
                        </span>
                        
                        <!-- Listing Type Badge -->
                        <span class="absolute top-4 left-4 badge badge-primary">
                            ${property.listing_type === 'rental' ? 'For Rent' : 'For Sale'}
                        </span>
                    </div>
                    
                    <div class="p-4">
                        <h3 class="text-lg font-semibold mb-2">${property.address}</h3>
                        <p class="text-secondary text-sm mb-2">${property.neighborhood}</p>
                        
                        <!-- Property Details -->
                        <div class="flex gap-4 text-sm text-tertiary mb-3">
                            <span><i class="fas fa-bed"></i> ${property.bedrooms} bed</span>
                            <span><i class="fas fa-bath"></i> ${property.bathrooms} bath</span>
                            <span><i class="fas fa-expand"></i> ${property.sqft} sqft</span>
                        </div>
                        
                        <!-- Amenities -->
                        <div class="flex flex-wrap gap-2 mb-4">
                            ${this.renderAmenities(property.amenities)}
                        </div>
                        
                        <!-- Actions -->
                        <div class="flex gap-2">
                            <button onclick="ChatLease.Chat.openPropertyChat(${property.id}); event.stopPropagation()" 
                                    class="btn btn-primary btn-sm flex-1">
                                <i class="fas fa-robot mr-2"></i>Chat with AI
                            </button>
                            <button onclick="ChatLease.Property.toggleSave(${property.id}); event.stopPropagation()" 
                                    class="btn ${isSaved ? 'btn-primary' : 'btn-secondary'} btn-sm">
                                <i class="fas fa-heart ${isSaved ? '' : 'text-gray-400'}"></i>
                            </button>
                            <button onclick="ChatLease.Property.share(${property.id}); event.stopPropagation()" 
                                    class="btn btn-secondary btn-sm">
                                <i class="fas fa-share"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Render amenities with limit
         */
        renderAmenities(amenities) {
            const visible = amenities.slice(0, CONFIG.UI.MAX_QUICK_AMENITIES);
            const remaining = amenities.length - CONFIG.UI.MAX_QUICK_AMENITIES;

            let html = visible.map(amenity => 
                `<span class="badge bg-tertiary">${this.translateAmenity(amenity)}</span>`
            ).join('');

            if (remaining > 0) {
                html += `<span class="badge badge-primary">+${remaining} more</span>`;
            }

            return html;
        },

        /**
         * Translate amenity from French to English
         */
        translateAmenity(amenity) {
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
                'Vue sur le fleuve': 'River View'
            };
            return translations[amenity] || amenity;
        },

        /**
         * Toggle save property
         */
        toggleSave(propertyId) {
            if (state.savedProperties.has(propertyId)) {
                state.savedProperties.delete(propertyId);
            } else {
                state.savedProperties.add(propertyId);
            }
            
            Storage.set(CONFIG.STORAGE.SAVED_PROPERTIES, Array.from(state.savedProperties));
            this.display();
            UI.updateSavedCount();
        },

        /**
         * Share property
         */
        share(propertyId) {
            const property = state.properties.find(p => p.id === propertyId);
            if (!property) return;

            const url = `${window.location.origin}/property/${propertyId}`;
            const text = `Check out this property: ${property.address}`;

            if (navigator.share) {
                navigator.share({ title: property.address, text, url });
            } else {
                navigator.clipboard.writeText(url);
                UI.showToast('Link copied to clipboard!');
            }
        },

        /**
         * Show property details modal
         */
        showDetails(propertyId) {
            const property = state.properties.find(p => p.id === propertyId);
            if (!property) return;

            state.currentProperty = property;
            // Modal implementation would go here
            console.log('Show property details:', property);
        }
    };

    // =====================================================
    // 7. CHAT MODULE
    // =====================================================
    const Chat = {
        /**
         * Initialize chat system
         */
        init() {
            this.bindEvents();
            this.loadSavedProperties();
        },

        /**
         * Open property-specific chat
         */
        openPropertyChat(propertyId) {
            const property = state.properties.find(p => p.id === propertyId);
            if (!property) return;

            state.currentProperty = property;
            state.currentChatMode = 'property';
            this.open();
            this.updateInterface();
            this.addSystemMessage(`🏠 I'm now helping you with this ${property.property_type} in ${property.neighborhood}!`);
        },

        /**
         * Open chat window
         */
        open() {
            const window = Utils.getElement('chatbotWindow');
            const bubble = Utils.getElement('chatBubble');
            
            if (window && window.classList.contains('hidden')) {
                window.classList.remove('hidden');
                UI.animateIn(window);
                
                if (bubble) {
                    bubble.style.opacity = '0';
                    bubble.style.pointerEvents = 'none';
                }
            }
        },

        /**
         * Close chat window
         */
        close() {
            const window = Utils.getElement('chatbotWindow');
            const bubble = Utils.getElement('chatBubble');
            
            if (window) {
                UI.animateOut(window, () => {
                    window.classList.add('hidden');
                });
                
                if (bubble) {
                    bubble.style.opacity = '1';
                    bubble.style.pointerEvents = 'auto';
                }
            }
        },

        /**
         * Toggle chat window
         */
        toggle() {
            const window = Utils.getElement('chatbotWindow');
            if (window && window.classList.contains('hidden')) {
                this.open();
            } else {
                this.close();
            }
        },

        /**
         * Send message
         */
        async send(message = null) {
            const input = Utils.getElement('unifiedChatInput');
            const text = message || input?.value.trim();
            
            if (!text) return;

            // Add user message
            this.addMessage('user', text);
            
            // Clear input
            if (input) input.value = '';

            // Show typing indicator
            this.showTyping();

            try {
                const response = await API.sendChatMessage(text, {
                    propertyId: state.currentProperty?.id,
                    savedProperties: Array.from(state.savedProperties)
                });

                this.hideTyping();
                this.addMessage('ai', response.message);
            } catch (error) {
                this.hideTyping();
                this.addMessage('ai', 'Sorry, I encountered an error. Please try again.');
            }
        },

        /**
         * Add message to chat
         */
        addMessage(type, content) {
            const message = {
                id: Utils.generateId(),
                type,
                content,
                timestamp: new Date(),
                mode: state.currentChatMode
            };

            state.chatMessages.push(message);
            this.displayMessages();
        },

        /**
         * Add system message
         */
        addSystemMessage(content) {
            this.addMessage('system', content);
        },

        /**
         * Display chat messages
         */
        displayMessages() {
            const container = Utils.getElement('unifiedChatMessages');
            if (!container) return;

            const messages = state.chatMessages.map(msg => this.renderMessage(msg));
            container.innerHTML = messages.join('');
            container.scrollTop = container.scrollHeight;
        },

        /**
         * Render single message
         */
        renderMessage(message) {
            const time = Utils.formatDate(message.timestamp, CONFIG.UI.CHAT_TIME_FORMAT);
            const isUser = message.type === 'user';

            return `
                <div class="chat-message ${isUser ? 'text-right' : ''}">
                    <div class="inline-block max-w-xs">
                        <div class="${isUser ? 'bg-primary text-white' : 'bg-tertiary'} 
                                    rounded-lg px-4 py-2 shadow-sm">
                            ${Utils.sanitizeHTML(message.content)}
                        </div>
                        <div class="text-xs text-tertiary mt-1">
                            ${isUser ? 'You' : 'AI'} • ${time}
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Show typing indicator
         */
        showTyping() {
            const container = Utils.getElement('unifiedChatMessages');
            if (!container) return;

            const indicator = document.createElement('div');
            indicator.id = 'typingIndicator';
            indicator.className = 'chat-message';
            indicator.innerHTML = `
                <div class="inline-block bg-tertiary rounded-lg px-4 py-2">
                    <span class="typing-indicator"></span>
                    <span class="typing-indicator"></span>
                    <span class="typing-indicator"></span>
                </div>
            `;
            
            container.appendChild(indicator);
            container.scrollTop = container.scrollHeight;
        },

        /**
         * Hide typing indicator
         */
        hideTyping() {
            const indicator = Utils.getElement('typingIndicator');
            if (indicator) {
                indicator.remove();
            }
        },

        /**
         * Update chat interface for current mode
         */
        updateInterface() {
            // Update mode buttons
            ['general', 'saved', 'property'].forEach(mode => {
                const btn = Utils.getElement(`${mode}ChatMode`);
                if (btn) {
                    const isActive = mode === state.currentChatMode;
                    btn.className = isActive 
                        ? 'flex-1 px-3 py-2 text-xs rounded-md font-medium bg-primary text-white'
                        : 'flex-1 px-3 py-2 text-xs rounded-md font-medium text-secondary hover:bg-tertiary';
                }
            });

            // Show/hide property mode button
            const propertyBtn = Utils.getElement('propertyChatMode');
            if (propertyBtn) {
                propertyBtn.classList.toggle('hidden', !state.currentProperty);
            }
        },

        /**
         * Set chat mode
         */
        setMode(mode) {
            state.currentChatMode = mode;
            this.updateInterface();
            
            // Add context message
            if (mode === 'property' && state.currentProperty) {
                this.addSystemMessage(`Switched to property mode for: ${state.currentProperty.address}`);
            } else if (mode === 'saved') {
                const count = state.savedProperties.size;
                this.addSystemMessage(`Switched to saved properties mode. You have ${count} saved properties.`);
            } else {
                this.addSystemMessage('Switched to general mode. Ask me anything about Montreal real estate!');
            }
        },

        /**
         * Load saved properties from storage
         */
        loadSavedProperties() {
            const saved = Storage.get(CONFIG.STORAGE.SAVED_PROPERTIES, []);
            state.savedProperties = new Set(saved);
            UI.updateSavedCount();
        },

        /**
         * Bind chat events
         */
        bindEvents() {
            // Chat toggle
            const bubble = Utils.getElement('chatBubble');
            if (bubble) {
                Utils.addEventListener(bubble, 'click', () => this.toggle());
            }

            // Close button
            const closeBtn = document.querySelector('#chatbotWindow .fa-times')?.parentElement;
            if (closeBtn) {
                Utils.addEventListener(closeBtn, 'click', () => this.close());
            }

            // Send button
            const sendBtn = document.querySelector('#chatbotWindow .fa-paper-plane')?.parentElement;
            if (sendBtn) {
                Utils.addEventListener(sendBtn, 'click', () => this.send());
            }

            // Input enter key
            const input = Utils.getElement('unifiedChatInput');
            if (input) {
                Utils.addEventListener(input, 'keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.send();
                    }
                });
            }

            // Mode buttons
            ['general', 'saved', 'property'].forEach(mode => {
                const btn = Utils.getElement(`${mode}ChatMode`);
                if (btn) {
                    Utils.addEventListener(btn, 'click', () => this.setMode(mode));
                }
            });

            // Quick questions
            document.querySelectorAll('[data-quick-question]').forEach(btn => {
                Utils.addEventListener(btn, 'click', () => {
                    this.send(btn.getAttribute('data-quick-question'));
                });
            });
        }
    };

    // =====================================================
    // 8. UI MODULE
    // =====================================================
    const UI = {
        /**
         * Set loading state
         */
        setLoading(isLoading) {
            state.isLoading = isLoading;
            const container = Utils.getElement('propertyResults');
            
            if (container && isLoading) {
                container.innerHTML = this.renderLoadingState();
            }
        },

        /**
         * Show error message
         */
        showError(message, error = null) {
            console.error(message, error);
            const container = Utils.getElement('propertyResults');
            
            if (container) {
                container.innerHTML = this.renderErrorState(message);
            }
        },

        /**
         * Show toast notification
         */
        showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `fixed bottom-4 left-4 px-6 py-3 rounded-lg shadow-lg 
                             ${type === 'success' ? 'bg-success text-white' : 'bg-error text-white'}
                             z-50 animate-slide-in`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('animate-slide-out');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        /**
         * Update result count
         */
        updateResultCount() {
            const element = Utils.getElement('resultCount');
            if (element) {
                const type = state.currentListingType === 'rental' ? 'rentals' : 'properties for sale';
                element.textContent = `${state.properties.length} ${type} found`;
            }
        },

        /**
         * Update saved properties count
         */
        updateSavedCount() {
            const element = Utils.getElement('savedCount');
            if (element) {
                element.textContent = state.savedProperties.size;
            }
        },

        /**
         * Animate element in
         */
        animateIn(element) {
            element.style.transform = 'scale(0.8) translateY(20px)';
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.transform = 'scale(1) translateY(0)';
                element.style.opacity = '1';
            }, 50);
        },

        /**
         * Animate element out
         */
        animateOut(element, callback) {
            element.style.transform = 'scale(0.8) translateY(20px)';
            element.style.opacity = '0';
            
            setTimeout(() => {
                if (callback) callback();
            }, CONFIG.UI.ANIMATION_DURATION);
        },

        /**
         * Render loading state
         */
        renderLoadingState() {
            return `
                <div class="col-span-full text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 
                                border-b-2 border-primary mb-4"></div>
                    <p class="text-secondary">Loading properties...</p>
                </div>
            `;
        },

        /**
         * Render empty state
         */
        renderEmptyState() {
            return `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">No Properties Found</h3>
                    <p class="text-secondary">Try adjusting your search criteria</p>
                </div>
            `;
        },

        /**
         * Render error state
         */
        renderErrorState(message) {
            return `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-exclamation-triangle text-4xl text-error mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">Error</h3>
                    <p class="text-secondary mb-4">${message}</p>
                    <button onclick="ChatLease.Property.load()" 
                            class="btn btn-primary">
                        <i class="fas fa-refresh mr-2"></i>Try Again
                    </button>
                </div>
            `;
        }
    };

    // =====================================================
    // 9. SEARCH MODULE
    // =====================================================
    const Search = {
        /**
         * Initialize search functionality
         */
        init() {
            this.bindEvents();
        },

        /**
         * Perform property search
         */
        perform() {
            const filters = this.getFilters();
            Property.load(filters);
        },

        /**
         * Get current search filters
         */
        getFilters() {
            return {
                location: Utils.getElement('locationInput')?.value || '',
                minPrice: Utils.getElement('minPriceSelect')?.value || '',
                maxPrice: Utils.getElement('maxPriceSelect')?.value || '',
                bedrooms: Utils.getElement('bedroomsSelect')?.value || '',
                propertyType: Utils.getElement('propertyTypeSelect')?.value || '',
                nearMetro: Utils.getElement('nearMetroCheck')?.checked || false,
                petsAllowed: Utils.getElement('petsAllowedCheck')?.checked || false
            };
        },

        /**
         * Set listing type
         */
        setListingType(type) {
            state.currentListingType = type;
            this.updateListingTypeUI();
            this.updatePriceOptions();
            Property.load();
        },

        /**
         * Update listing type UI
         */
        updateListingTypeUI() {
            const rentTab = Utils.getElement('rentTab');
            const buyTab = Utils.getElement('buyTab');
            
            if (rentTab && buyTab) {
                const isRental = state.currentListingType === 'rental';
                rentTab.className = isRental 
                    ? 'px-6 py-3 rounded-md font-medium bg-primary text-white'
                    : 'px-6 py-3 rounded-md font-medium text-secondary hover:bg-tertiary';
                buyTab.className = !isRental 
                    ? 'px-6 py-3 rounded-md font-medium bg-primary text-white'
                    : 'px-6 py-3 rounded-md font-medium text-secondary hover:bg-tertiary';
            }

            // Update title
            const title = Utils.getElement('propertiesTitle');
            if (title) {
                title.textContent = state.currentListingType === 'rental' 
                    ? 'Available Rentals' 
                    : 'Properties for Sale';
            }
        },

        /**
         * Update price options based on listing type
         */
        updatePriceOptions() {
            const isRental = state.currentListingType === 'rental';
            
            document.querySelectorAll('.rental-price').forEach(option => {
                option.style.display = isRental ? 'block' : 'none';
            });
            
            document.querySelectorAll('.purchase-price').forEach(option => {
                option.style.display = isRental ? 'none' : 'block';
            });
            
            // Reset price selections
            ['minPriceSelect', 'maxPriceSelect'].forEach(id => {
                const select = Utils.getElement(id);
                if (select) select.value = '';
            });
        },

        /**
         * Bind search events
         */
        bindEvents() {
            // Search button
            const searchBtn = document.querySelector('[onclick*="searchProperties"]');
            if (searchBtn) {
                searchBtn.onclick = () => this.perform();
            }

            // Listing type tabs
            const rentTab = Utils.getElement('rentTab');
            const buyTab = Utils.getElement('buyTab');
            
            if (rentTab) {
                rentTab.onclick = () => this.setListingType('rental');
            }
            
            if (buyTab) {
                buyTab.onclick = () => this.setListingType('purchase');
            }

            // Debounced location search
            const locationInput = Utils.getElement('locationInput');
            if (locationInput) {
                Utils.addEventListener(locationInput, 'input', 
                    Utils.debounce(() => this.perform(), CONFIG.UI.DEBOUNCE_DELAY)
                );
            }
        }
    };

    // =====================================================
    // 10. INITIALIZATION
    // =====================================================
    const init = () => {
        // Initialize modules
        Theme.init();
        Chat.init();
        Search.init();
        
        // Load initial data
        Property.load();
        
        // Initialize language selector
        const languageSelector = Utils.getElement('languageSelector');
        if (languageSelector) {
            const savedLang = Storage.get(CONFIG.STORAGE.LANGUAGE, 'en');
            languageSelector.value = savedLang;
            
            Utils.addEventListener(languageSelector, 'change', (e) => {
                Storage.set(CONFIG.STORAGE.LANGUAGE, e.target.value);
                // Language change logic would go here
            });
        }

        // Mobile menu toggle
        window.toggleMobileMenu = () => {
            const menu = Utils.getElement('mobile-menu');
            if (menu) {
                menu.classList.toggle('hidden');
            }
        };
    };

    // =====================================================
    // 11. PUBLIC API
    // =====================================================
    return {
        init,
        Property,
        Chat,
        Search,
        Theme,
        Utils,
        state,
        CONFIG
    };
})();

// =====================================================
// 12. INITIALIZE APP
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    ChatLease.init();
});

// Expose to global scope for onclick handlers
window.ChatLease = ChatLease;