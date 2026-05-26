/**
 * Asana API Client - Enterprise Grade
 * Production-ready HTTP client with rate limiting, retry logic, and logging
 *
 * Features:
 * - Rate limiting (Asana: 1500 requests/min, 150 concurrent)
 * - Automatic retry with exponential backoff
 * - Structured logging with Winston
 * - Request cancellation support
 * - Performance monitoring
 * - Comprehensive error handling
 *
 * @module AsanaClient
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const Bottleneck = require('bottleneck');
const winston = require('winston');
const os = require('os');
const path = require('path');
require('winston-daily-rotate-file');

const ResponseCache = require('./ResponseCache');
const InputValidator = require('./InputValidator');
const CircuitBreakerWrapper = require('./CircuitBreakerWrapper');

/**
 * Configure Winston logger with rotation
 * Use temp directory for logs when running in read-only environments (like Claude Desktop)
 */
const logDir = process.env.MCP_LOG_DIR || path.join(os.tmpdir(), 'deploy-a-mcp-logs');

const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true
});

const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'asana-mcp-client' },
  transports: [
    errorRotateTransport,
    combinedRotateTransport
  ]
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

class AsanaClient {
  /**
   * Create an enterprise-grade Asana API client
   * @param {string} token - Asana Personal Access Token
   * @param {Object} options - Client configuration options
   * @param {string} [options.baseURL] - API base URL
   * @param {number} [options.timeout] - Request timeout in ms (default: 30000)
   * @param {number} [options.maxRetries] - Max retry attempts (default: 3)
   * @param {number} [options.rateLimit] - Max requests per minute (default: 1400)
   */
  constructor(token, options = {}) {
    if (!token) {
      throw new Error('Asana token is required');
    }

    this.token = token;
    this.baseURL = options.baseURL || 'https://app.asana.com/api/1.0';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;

    // Initialize metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0
    };

    // Initialize response cache
    this.cache = new ResponseCache({
      stdTTL: options.cacheTTL || 300, // 5 minutes default
      useClones: false // Performance optimization
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreakerWrapper({
      timeout: this.timeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    // Input validator instance
    this.validator = InputValidator;

    // Create Axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Configure retry logic with exponential backoff
    axiosRetry(this.client, {
      retries: this.maxRetries,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors and 5xx server errors
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status >= 500 && error.response?.status < 600) ||
               error.response?.status === 429; // Rate limit
      },
      onRetry: (retryCount, error, requestConfig) => {
        this.metrics.retriedRequests++;
        logger.warn('Retrying request', {
          retryCount,
          endpoint: requestConfig.url,
          error: error.message
        });
      }
    });

    // Configure rate limiter (Asana: 1500 req/min, we use 1400 for safety)
    // Also limit concurrent requests to 150 (Asana limit)
    this.limiter = new Bottleneck({
      reservoir: options.rateLimit || 1400, // Max requests
      reservoirRefreshAmount: options.rateLimit || 1400,
      reservoirRefreshInterval: 60 * 1000, // Per minute
      maxConcurrent: 150, // Max concurrent requests
      minTime: 40 // Min time between requests (ms)
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        this.metrics.totalRequests++;
        logger.debug('Request started', {
          method: config.method.toUpperCase(),
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('Request setup failed', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        this.metrics.successfulRequests++;
        logger.info('Request successful', {
          method: response.config.method.toUpperCase(),
          url: response.config.url,
          status: response.status,
          duration: `${duration}ms`
        });
        return response;
      },
      (error) => {
        if (error.config?.metadata) {
          const duration = Date.now() - error.config.metadata.startTime;
          this.metrics.failedRequests++;
          logger.error('Request failed', {
            method: error.config?.method?.toUpperCase(),
            url: error.config?.url,
            status: error.response?.status,
            duration: `${duration}ms`,
            error: error.message
          });
        }
        return Promise.reject(error);
      }
    );

    logger.info('AsanaClient initialized', {
      baseURL: this.baseURL,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      rateLimit: options.rateLimit || 1400
    });
  }

  /**
   * Make GET request with rate limiting, caching, and circuit breaker
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {Object} options - Request options
   * @param {AbortSignal} [options.signal] - Abort signal for cancellation
   * @param {boolean} [options.skipCache=false] - Skip cache
   * @returns {Promise<Object>} API response
   */
  async get(endpoint, params = {}, options = {}) {
    // Check cache first (unless skipCache is true)
    if (!options.skipCache) {
      const cached = this.cache.get('GET', endpoint, params);
      if (cached !== undefined) {
        logger.debug('Cache HIT', { endpoint, params });
        return cached;
      }
    }

    return this.limiter.schedule(async () => {
      try {
        const response = await this.client.get(endpoint, {
          params,
          signal: options.signal
        });

        // Cache successful GET responses
        this.cache.set('GET', endpoint, params, response.data);

        return response.data;
      } catch (error) {
        throw this._handleError(error, 'GET', endpoint);
      }
    });
  }

  /**
   * Fetch all pages of a paginated GET endpoint
   * Automatically follows next_page.offset tokens until all results are collected.
   * Useful for composite operations that need complete result sets.
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters (limit will be set to 100 for efficiency)
   * @param {Object} options - Request options
   * @param {number} [options.maxPages=50] - Safety limit on pages to prevent runaway pagination
   * @returns {Promise<Object>} Combined response with all data items
   */
  async getAll(endpoint, params = {}, options = {}) {
    const allData = [];
    let offset = null;
    let pageCount = 0;
    const maxPages = options.maxPages || 50;

    do {
      const pageParams = { ...params, limit: 100 };
      if (offset) pageParams.offset = offset;

      const response = await this.get(endpoint, pageParams, { skipCache: true });
      const items = response.data || [];
      allData.push(...items);

      offset = response.next_page?.offset || null;
      pageCount++;

      if (pageCount >= maxPages) {
        logger.warn('getAll reached max pages limit', { endpoint, maxPages, totalItems: allData.length });
        break;
      }
    } while (offset);

    return { data: allData };
  }

  /**
   * Make POST request with rate limiting and cache invalidation
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @param {AbortSignal} [options.signal] - Abort signal for cancellation
   * @returns {Promise<Object>} API response
   */
  async post(endpoint, data = {}, options = {}) {
    return this.limiter.schedule(async () => {
      try {
        const response = await this.client.post(endpoint, { data }, {
          signal: options.signal,
          params: options.params
        });

        // Invalidate related caches after mutation
        this.cache.invalidateAfterMutation('POST', endpoint);

        return response.data;
      } catch (error) {
        throw this._handleError(error, 'POST', endpoint);
      }
    });
  }

  /**
   * Make PUT request with rate limiting and cache invalidation
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @param {AbortSignal} [options.signal] - Abort signal for cancellation
   * @returns {Promise<Object>} API response
   */
  async put(endpoint, data = {}, options = {}) {
    return this.limiter.schedule(async () => {
      try {
        const response = await this.client.put(endpoint, { data }, {
          signal: options.signal,
          params: options.params
        });

        // Invalidate related caches after mutation
        this.cache.invalidateAfterMutation('PUT', endpoint);

        return response.data;
      } catch (error) {
        throw this._handleError(error, 'PUT', endpoint);
      }
    });
  }

  /**
   * Make DELETE request with rate limiting and cache invalidation
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @param {AbortSignal} [options.signal] - Abort signal for cancellation
   * @returns {Promise<Object>} API response
   */
  async delete(endpoint, options = {}) {
    return this.limiter.schedule(async () => {
      try {
        const response = await this.client.delete(endpoint, {
          signal: options.signal
        });

        // Invalidate related caches after mutation
        this.cache.invalidateAfterMutation('DELETE', endpoint);

        return response.data;
      } catch (error) {
        throw this._handleError(error, 'DELETE', endpoint);
      }
    });
  }

  shapeCustomFieldValue(fieldType, value) {
    if (value === null || value === undefined) return value;
    const t = typeof fieldType === 'string' ? fieldType.toLowerCase() : null;

    if (t === 'date') {
      if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: value, date_time: null };
        const datePart = value.split('T')[0];
        return { date: datePart, date_time: value };
      }
      return value;
    }

    if (t === 'people') {
      if (Array.isArray(value)) {
        return value.map(v => (typeof v === 'string' ? { gid: v } : v));
      }
      if (typeof value === 'string') return [{ gid: value }];
      return value;
    }

    return value;
  }

  shapeCustomFieldsMap(customFields, fieldTypes = {}) {
    if (!customFields || typeof customFields !== 'object') return customFields;
    const out = {};
    for (const [gid, value] of Object.entries(customFields)) {
      out[gid] = this.shapeCustomFieldValue(fieldTypes[gid], value);
    }
    return out;
  }

  /**
   * Get comprehensive client metrics
   * @returns {Object} Performance metrics including cache and circuit breaker
   */
  getMetrics() {
    return {
      // HTTP metrics
      http: {
        ...this.metrics,
        successRate: this.metrics.totalRequests > 0
          ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
          : 'N/A',
        queuedRequests: this.limiter.counts().QUEUED,
        runningRequests: this.limiter.counts().RUNNING
      },
      // Cache metrics
      cache: this.cache.getStats(),
      // Circuit breaker metrics
      circuitBreaker: this.circuitBreaker.getStats()
    };
  }

  /**
   * Get cache statistics only
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   * @param {string} resourceType - Optional: clear specific resource type
   */
  clearCache(resourceType = null) {
    if (resourceType) {
      this.cache.invalidateResource(resourceType);
      logger.info('Cache cleared for resource', { resourceType });
    } else {
      this.cache.flush();
      logger.info('All cache cleared');
    }
  }

  /**
   * Health check - verify API connectivity
   * @returns {Promise<boolean>} True if API is reachable
   */
  async healthCheck() {
    try {
      await this.get('/users/me');
      logger.info('Health check passed');
      return true;
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Graceful shutdown - wait for pending requests
   * @param {number} timeout - Max wait time in ms (default: 30000)
   * @returns {Promise<void>}
   */
  async shutdown(timeout = 30000) {
    logger.info('Shutting down AsanaClient...');

    try {
      await this.limiter.stop({ dropWaitingJobs: false, timeout });
      logger.info('AsanaClient shutdown complete');
    } catch (error) {
      logger.error('AsanaClient shutdown error', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle API errors with detailed context
   * @private
   * @param {Error} error - The error object
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @returns {Error} Enhanced error object
   */
  _handleError(error, method, endpoint) {
    // Request was cancelled
    if (axios.isCancel(error)) {
      const cancelError = new Error(`Request cancelled: ${method} ${endpoint}`);
      cancelError.code = 'REQUEST_CANCELLED';
      return cancelError;
    }

    // Response error (4xx, 5xx)
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.errors?.[0]?.message || data?.message || 'Unknown error';

      // Asana-specific error context for better debugging
      const errorContextMap = {
        400: 'Bad request - check parameter names and values match the Asana API specification',
        401: 'Unauthorized - verify that ASANA_TOKEN is valid and not expired',
        402: 'Payment required - this feature requires a paid Asana plan (Premium/Business/Enterprise)',
        403: 'Forbidden - insufficient permissions for this workspace, project, or task',
        404: 'Not found - check that the GID exists and you have access to the resource',
        409: 'Conflict - resource was modified by another request, try again',
        412: 'Precondition failed - for Events API, get a new sync token by calling without sync parameter',
        429: 'Rate limited - too many requests, wait before retrying',
        451: 'Unavailable for legal reasons - content blocked in your region',
        500: 'Asana server error - retry in a few seconds',
        502: 'Bad gateway - Asana may be experiencing issues, retry shortly',
        503: 'Service unavailable - Asana may be down for maintenance'
      };

      const context = errorContextMap[status] || 'Unexpected error';
      const apiError = new Error(`Asana API Error (${status}): ${message}. ${context}`);
      apiError.code = `HTTP_${status}`;
      apiError.status = status;
      apiError.endpoint = endpoint;
      apiError.method = method;
      apiError.details = data;
      apiError.context = context;

      // Rate limit specific handling
      if (status === 429) {
        apiError.retryAfter = error.response.headers['retry-after'] || 60;
        logger.warn('Rate limit exceeded', {
          endpoint,
          retryAfter: apiError.retryAfter
        });
      }

      return apiError;
    }

    // Network error (no response)
    if (error.request) {
      const networkError = new Error(`Network error: No response from Asana API (${method} ${endpoint})`);
      networkError.code = 'NETWORK_ERROR';
      networkError.endpoint = endpoint;
      networkError.method = method;
      return networkError;
    }

    // Other errors (setup, config, etc.)
    const genericError = new Error(`Asana API Error: ${error.message}`);
    genericError.code = 'UNKNOWN_ERROR';
    genericError.originalError = error;
    return genericError;
  }
}

module.exports = AsanaClient;
