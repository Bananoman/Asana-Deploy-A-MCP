/**
 * Circuit Breaker Wrapper
 * Protects against cascading failures using circuit breaker pattern
 *
 * Features:
 * - Automatic failure detection
 * - Configurable thresholds
 * - Half-open state for recovery testing
 * - Event listeners for monitoring
 *
 * @module CircuitBreakerWrapper
 */

const CircuitBreaker = require('opossum');

class CircuitBreakerWrapper {
  /**
   * Create circuit breaker for AsanaClient
   * @param {Object} options - Circuit breaker options
   */
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 30000,           // 30s timeout
      errorThresholdPercentage: options.errorThresholdPercentage || 50, // 50% error rate
      resetTimeout: options.resetTimeout || 30000,  // 30s before retry
      rollingCountTimeout: options.rollingCountTimeout || 10000, // 10s window
      rollingCountBuckets: options.rollingCountBuckets || 10,
      name: options.name || 'AsanaAPI',
      ...options
    };

    this.breakers = new Map();
    this.stats = {
      opened: 0,
      closed: 0,
      halfOpen: 0,
      fallbackCalls: 0
    };
  }

  /**
   * Get or create circuit breaker for operation
   * @param {string} operation - Operation name
   * @param {Function} action - Async function to wrap
   * @param {Function} fallback - Fallback function
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  getBreaker(operation, action, fallback = null) {
    if (this.breakers.has(operation)) {
      return this.breakers.get(operation);
    }

    const breaker = new CircuitBreaker(action, {
      ...this.options,
      name: `${this.options.name}:${operation}`
    });

    // Add fallback if provided
    if (fallback) {
      breaker.fallback(fallback);
    }

    // Event listeners for monitoring
    breaker.on('open', () => {
      this.stats.opened++;
      console.warn(`Circuit breaker OPENED for ${operation}`);
    });

    breaker.on('close', () => {
      this.stats.closed++;
      console.info(`Circuit breaker CLOSED for ${operation}`);
    });

    breaker.on('halfOpen', () => {
      this.stats.halfOpen++;
      console.info(`Circuit breaker HALF-OPEN for ${operation}`);
    });

    breaker.on('fallback', () => {
      this.stats.fallbackCalls++;
    });

    breaker.on('failure', (error) => {
      console.error(`Circuit breaker failure in ${operation}:`, error.message);
    });

    this.breakers.set(operation, breaker);
    return breaker;
  }

  /**
   * Execute function with circuit breaker protection
   * @param {string} operation - Operation name
   * @param {Function} fn - Function to execute
   * @param {Array} args - Function arguments
   * @param {Function} fallback - Optional fallback
   * @returns {Promise<*>} Result
   */
  async execute(operation, fn, args = [], fallback = null) {
    const action = async () => fn(...args);
    const breaker = this.getBreaker(operation, action, fallback);

    return breaker.fire();
  }

  /**
   * Wrap HTTP client methods with circuit breakers
   * @param {Object} client - HTTP client instance
   * @returns {Object} Wrapped client
   */
  wrapClient(client) {
    const wrapper = {
      get: async (endpoint, params = {}, options = {}) => {
        return this.execute(
          'GET',
          client.get.bind(client),
          [endpoint, params, options],
          async () => {
            // Fallback: return cached data or throw
            throw new Error('Circuit breaker OPEN: GET request failed');
          }
        );
      },

      post: async (endpoint, data = {}, options = {}) => {
        return this.execute(
          'POST',
          client.post.bind(client),
          [endpoint, data, options],
          async () => {
            throw new Error('Circuit breaker OPEN: POST request failed');
          }
        );
      },

      put: async (endpoint, data = {}, options = {}) => {
        return this.execute(
          'PUT',
          client.put.bind(client),
          [endpoint, data, options],
          async () => {
            throw new Error('Circuit breaker OPEN: PUT request failed');
          }
        );
      },

      delete: async (endpoint, options = {}) => {
        return this.execute(
          'DELETE',
          client.delete.bind(client),
          [endpoint, options],
          async () => {
            throw new Error('Circuit breaker OPEN: DELETE request failed');
          }
        );
      },

      // Pass through non-HTTP methods
      getMetrics: client.getMetrics?.bind(client),
      healthCheck: client.healthCheck?.bind(client),
      shutdown: client.shutdown?.bind(client)
    };

    return wrapper;
  }

  /**
   * Get circuit breaker statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const breakerStats = {};

    for (const [name, breaker] of this.breakers) {
      breakerStats[name] = {
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED',
        stats: breaker.stats
      };
    }

    return {
      ...this.stats,
      breakers: breakerStats
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.close();
    }
  }

  /**
   * Shutdown all circuit breakers
   */
  async shutdown() {
    for (const breaker of this.breakers.values()) {
      await breaker.shutdown();
    }
    this.breakers.clear();
  }
}

module.exports = CircuitBreakerWrapper;
