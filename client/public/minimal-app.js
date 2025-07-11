// MINIMAL CLIENT-SIDE APP FOR DEBUGGING
console.log('🔍 Minimal app loaded');

// Load properties on page load
window.onload = function() {
    console.log('🔍 Page loaded, fetching properties...');
    loadMinimalProperties();
};

async function loadMinimalProperties() {
    try {
        console.log('🔍 Fetching from /api/properties...');
        
        const response = await fetch('/api/properties?listingType=rental');
        console.log('🔍 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🔍 Data received:', data);
        
        displayMinimalProperties(data.properties || []);
        
        // Update status
        const statusEl = document.getElementById('resultCount');
        if (statusEl) {
            statusEl.textContent = `${data.properties.length} properties loaded (minimal server)`;
        }
        
    } catch (error) {
        console.error('❌ Error loading properties:', error);
        
        // Show error message
        const container = document.getElementById('propertyResults');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3>Unable to Load Properties</h3>
                    <p>Error: ${error.message}</p>
                    <button onclick="loadMinimalProperties()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Try Again
                    </button>
                </div>
            `;
        }
        
        // Update status
        const statusEl = document.getElementById('resultCount');
        if (statusEl) {
            statusEl.textContent = `Error: ${error.message}`;
        }
    }
}

function displayMinimalProperties(properties) {
    const container = document.getElementById('propertyResults');
    if (!container) {
        console.error('❌ Property results container not found');
        return;
    }
    
    if (!properties || properties.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px;">No properties found</div>';
        return;
    }
    
    const html = properties.map(property => `
        <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">
                ${property.address || 'Address not available'}
            </h3>
            <p style="margin: 4px 0; color: #666;">
                Price: $${property.price || 'N/A'}
            </p>
            <p style="margin: 4px 0; color: #666;">
                Bedrooms: ${property.bedrooms || 'N/A'}
            </p>
            <p style="margin: 4px 0; color: #666;">
                ID: ${property.id || 'N/A'}
            </p>
        </div>
    `).join('');
    
    container.innerHTML = html;
    console.log(`✅ Displayed ${properties.length} properties`);
}