/**
 * Proxy Provider Configuration
 * Add your proxy providers here for production use
 */

const ProxyProviders = {
  // Free proxy services (not recommended for production)
  free: [
    { ip: '8.8.8.8', port: 8080, protocol: 'http', provider: 'test' },
    { ip: '1.1.1.1', port: 8080, protocol: 'http', provider: 'test' },
  ],
  
  // Premium proxy services (recommended for production)
  premium: [
    // Example: Bright Data (formerly Luminati)
    // {
    //   ip: 'brd-customer-hl_USERNAME-zone-static.brightdata.com',
    //   port: 22225,
    //   protocol: 'http',
    //   username: 'brd-customer-hl_USERNAME-zone-static',
    //   password: 'YOUR_PASSWORD',
    //   provider: 'brightdata'
    // },
    
    // Example: Smartproxy
    // {
    //   ip: 'gate.smartproxy.com',
    //   port: 10000,
    //   protocol: 'http',
    //   username: 'sp_USERNAME',
    //   password: 'YOUR_PASSWORD',
    //   provider: 'smartproxy'
    // },
    
    // Example: ProxyMesh
    // {
    //   ip: 'ca.proxymesh.com',
    //   port: 31280,
    //   protocol: 'http',
    //   username: 'YOUR_USERNAME',
    //   password: 'YOUR_PASSWORD',
    //   provider: 'proxymesh'
    // }
  ],
  
  // Residential proxies (best for web scraping)
  residential: [
    // Example: Oxylabs
    // {
    //   ip: 'pr.oxylabs.io',
    //   port: 7777,
    //   protocol: 'http',
    //   username: 'customer-YOUR_USERNAME',
    //   password: 'YOUR_PASSWORD',
    //   provider: 'oxylabs'
    // }
  ]
};

/**
 * Get proxy configuration based on environment
 */
function getProxyConfig() {
  const environment = process.env.NODE_ENV || 'development';
  const proxyType = process.env.PROXY_TYPE || 'free';
  
  if (environment === 'production') {
    // Use premium proxies in production
    return ProxyProviders.premium.length > 0 ? ProxyProviders.premium : ProxyProviders.free;
  } else {
    // Use free proxies in development
    return ProxyProviders.free;
  }
}

/**
 * Add proxy to database
 */
async function addProxyToDatabase(db, proxy) {
  try {
    await db.query(`
      INSERT INTO proxy_pool (ip_address, port, protocol, username, password, country, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (ip_address, port) DO UPDATE SET
        protocol = EXCLUDED.protocol,
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
    `, [
      proxy.ip,
      proxy.port,
      proxy.protocol,
      proxy.username || null,
      proxy.password || null,
      proxy.country || 'CA'
    ]);
    
    console.log(`✅ Added proxy ${proxy.ip}:${proxy.port} to database`);
  } catch (error) {
    console.error(`❌ Error adding proxy ${proxy.ip}:${proxy.port}:`, error.message);
  }
}

/**
 * Initialize proxy pool in database
 */
async function initializeProxyPool(db) {
  try {
    console.log('🔄 Initializing proxy pool...');
    
    const proxies = getProxyConfig();
    
    for (const proxy of proxies) {
      await addProxyToDatabase(db, proxy);
    }
    
    console.log(`✅ Initialized proxy pool with ${proxies.length} proxies`);
  } catch (error) {
    console.error('❌ Error initializing proxy pool:', error.message);
  }
}

/**
 * Proxy provider recommendations
 */
const ProxyRecommendations = {
  scraping: [
    {
      name: 'Bright Data',
      url: 'https://brightdata.com',
      pros: ['Largest proxy network', 'High success rate', 'Good for Centris'],
      cons: ['Expensive', 'Complex setup'],
      pricing: 'From $500/month'
    },
    {
      name: 'Smartproxy',
      url: 'https://smartproxy.com',
      pros: ['Affordable', 'Good for beginners', 'Canadian IPs'],
      cons: ['Smaller network', 'Limited locations'],
      pricing: 'From $75/month'
    },
    {
      name: 'Oxylabs',
      url: 'https://oxylabs.io',
      pros: ['Residential IPs', 'High anonymity', 'Good support'],
      cons: ['Expensive', 'Complex API'],
      pricing: 'From $300/month'
    }
  ],
  
  free: [
    {
      name: 'Free Proxy Lists',
      url: 'https://free-proxy-list.net',
      pros: ['Free', 'Easy to use'],
      cons: ['Unreliable', 'Often blocked', 'Not suitable for production'],
      pricing: 'Free'
    }
  ]
};

module.exports = {
  ProxyProviders,
  getProxyConfig,
  addProxyToDatabase,
  initializeProxyPool,
  ProxyRecommendations
};