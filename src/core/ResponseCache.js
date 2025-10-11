/**
 * Response Cache
 * Intelligent caching for API responses to reduce load and improve performance
 *
 * Features:
 * - Automatic cache key generation
 * - TTL-based expiration
 * - Cache statistics
 * - Smart invalidation
 *
 * @module ResponseCache
 */

const NodeCache = require('node-cache');

class ResponseCache {
  /**
   * Create response cache
   * @param {Object} options - Cache options
   * @param {number} [options.stdTTL=300] - Standard TTL in seconds (default: 5 minutes)
   * @param {number} [options.checkperiod=60] - Check period for expired keys
   * @param {boolean} [options.useClones=false] - Clone cached data (slower but safer)
   */
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.stdTTL || 300, // 5 minutes default
      checkperiod: options.checkperiod || 60,
      useClones: options.useClones || false
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Cache configuration per endpoint type
    this.ttlConfig = {
      // Read-only data (rarely changes)
      workspaces: 3600,      // 1 hour
      users: 1800,           // 30 minutes
      teams: 1800,           // 30 minutes
      custom_fields: 1800,   // 30 minutes

      // Frequently changing data
      tasks: 60,             // 1 minute
      projects: 300,         // 5 minutes
      sections: 300,         // 5 minutes

      // Real-time data (don't cache)
      events: 0,
      webhooks: 0,
      batch: 0
    };
  }

  /**
   * Generate cache key from endpoint and params
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @returns {string} Cache key
   */
  generateKey(method, endpoint, params = {}) {
    // Only cache GET requests
    if (method !== 'GET') {
      return null;
    }

    // Sort params for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    const paramString = JSON.stringify(sortedParams);
    return `${method}:${endpoint}:${paramString}`;
  }

  /**
   * Get TTL for endpoint
   * @param {string} endpoint - API endpoint
   * @returns {number} TTL in seconds
   */
  getTTL(endpoint) {
    // Extract resource type from endpoint
    const match = endpoint.match(/^\/([^/]+)/);
    if (!match) return 300; // Default 5 minutes

    const resource = match[1];
    return this.ttlConfig[resource] || 300;
  }

  /**
   * Get cached response
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @returns {*} Cached value or undefined
   */
  get(method, endpoint, params = {}) {
    const key = this.generateKey(method, endpoint, params);
    if (!key) return undefined;

    const value = this.cache.get(key);

    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }

    this.stats.misses++;
    return undefined;
  }

  /**
   * Set cached response
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @param {*} value - Value to cache
   * @returns {boolean} Success
   */
  set(method, endpoint, params = {}, value) {
    const key = this.generateKey(method, endpoint, params);
    if (!key) return false;

    const ttl = this.getTTL(endpoint);
    if (ttl === 0) return false; // Don't cache

    const success = this.cache.set(key, value, ttl);
    if (success) {
      this.stats.sets++;
    }

    return success;
  }

  /**
   * Invalidate cache for endpoint
   * @param {string} endpoint - Endpoint to invalidate
   * @returns {number} Number of deleted keys
   */
  invalidate(endpoint) {
    const keys = this.cache.keys();
    let deleted = 0;

    for (const key of keys) {
      if (key.includes(endpoint)) {
        if (this.cache.del(key)) {
          deleted++;
          this.stats.deletes++;
        }
      }
    }

    return deleted;
  }

  /**
   * Invalidate all caches for a resource type
   * @param {string} resourceType - Resource type (tasks, projects, etc.)
   * @returns {number} Number of deleted keys
   */
  invalidateResource(resourceType) {
    return this.invalidate(`/${resourceType}`);
  }

  /**
   * Smart invalidation after mutations
   * @param {string} method - HTTP method (POST, PUT, DELETE)
   * @param {string} endpoint - Endpoint that was mutated
   */
  invalidateAfterMutation(method, endpoint) {
    // Don't invalidate on GET
    if (method === 'GET') return;

    // Extract resource type
    const match = endpoint.match(/^\/([^/]+)/);
    if (!match) return;

    const resourceType = match[1];

    // Invalidate related caches
    const relatedResources = this.getRelatedResources(resourceType);
    for (const resource of relatedResources) {
      this.invalidateResource(resource);
    }
  }

  /**
   * Get related resources that should be invalidated
   * @param {string} resourceType - Primary resource
   * @returns {Array<string>} Related resources
   */
  getRelatedResources(resourceType) {
    const relations = {
      tasks: ['tasks', 'projects', 'sections'],
      projects: ['projects', 'sections', 'tasks'],
      sections: ['sections', 'tasks'],
      workspaces: ['workspaces', 'projects', 'teams'],
      teams: ['teams', 'users'],
      custom_fields: ['custom_fields']
    };

    return relations[resourceType] || [resourceType];
  }

  /**
   * Clear all cache
   */
  flush() {
    this.cache.flushAll();
    this.stats.deletes += this.cache.keys().length;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : '0.00';

    return {
      ...this.stats,
      total,
      hitRate: `${hitRate}%`,
      keys: this.cache.keys().length,
      size: this.cache.getStats()
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
}

module.exports = ResponseCache;
