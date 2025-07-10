/**
 * Simple caching utility
 */

const CONFIG = require('../config/constants');

class CacheManager {
  constructor() {
    this.cache = {};
  }

  /**
   * Get cached data if valid, otherwise return null
   * @param {string} key - Cache key
   * @returns {*} Cached data or null
   */
  get(key) {
    const cached = this.cache[key];
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > CONFIG.CACHE_DURATION) {
      delete this.cache[key];
      return null;
    }

    return cached.data;
  }

  /**
   * Set cache data
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  set(key, data) {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
  }

  /**
   * Clear specific cache or all cache
   * @param {string} key - Optional cache key to clear
   */
  clear(key) {
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {};
    }
  }

  /**
   * Get or fetch data with caching
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @returns {Promise<*>} Cached or fetched data
   */
  async getOrFetch(key, fetchFn) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data);
    return data;
  }
}

module.exports = new CacheManager();