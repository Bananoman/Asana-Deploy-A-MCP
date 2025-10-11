/**
 * Unit Tests for AsanaClient - Enterprise Grade
 * Tests enterprise features: rate limiting, retry logic, logging, metrics
 */

const AsanaClient = require('../src/core/AsanaClient');

// Mock winston to avoid file I/O
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    add: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(() => jest.fn()),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

describe('AsanaClient - Enterprise Grade', () => {
  let client;
  const mockToken = 'test-token-123';

  beforeEach(() => {
    jest.clearAllMocks();
    client = new AsanaClient(mockToken);
  });

  describe('Constructor', () => {
    test('should throw error if token is missing', () => {
      expect(() => new AsanaClient()).toThrow('Asana token is required');
    });

    test('should initialize with default configuration', () => {
      expect(client.baseURL).toBe('https://app.asana.com/api/1.0');
      expect(client.timeout).toBe(30000);
      expect(client.maxRetries).toBe(3);
    });

    test('should accept custom configuration', () => {
      const customClient = new AsanaClient(mockToken, {
        baseURL: 'https://custom.api.com',
        timeout: 60000,
        maxRetries: 5,
        rateLimit: 1000
      });

      expect(customClient.baseURL).toBe('https://custom.api.com');
      expect(customClient.timeout).toBe(60000);
      expect(customClient.maxRetries).toBe(5);
    });
  });

  describe('Core Features', () => {
    test('should initialize metrics tracking', () => {
      expect(client.metrics).toBeDefined();
      expect(client.metrics.totalRequests).toBe(0);
      expect(client.metrics.successfulRequests).toBe(0);
      expect(client.metrics.failedRequests).toBe(0);
      expect(client.metrics.retriedRequests).toBe(0);
    });

    test('should initialize rate limiter', () => {
      expect(client.limiter).toBeDefined();
      expect(typeof client.limiter.schedule).toBe('function');
    });

    test('should initialize axios client with correct config', () => {
      expect(client.client).toBeDefined();
      expect(client.client.defaults.baseURL).toBe('https://app.asana.com/api/1.0');
      expect(client.client.defaults.timeout).toBe(30000);
      expect(client.client.defaults.headers.Authorization).toBe(`Bearer ${mockToken}`);
    });
  });

  describe('API Methods', () => {
    test('get() method should exist', () => {
      expect(typeof client.get).toBe('function');
    });

    test('post() method should exist', () => {
      expect(typeof client.post).toBe('function');
    });

    test('put() method should exist', () => {
      expect(typeof client.put).toBe('function');
    });

    test('delete() method should exist', () => {
      expect(typeof client.delete).toBe('function');
    });
  });

  describe('Metrics', () => {
    test('getMetrics() should return comprehensive metrics object', () => {
      const metrics = client.getMetrics();

      // HTTP metrics
      expect(metrics).toHaveProperty('http');
      expect(metrics.http).toHaveProperty('totalRequests');
      expect(metrics.http).toHaveProperty('successfulRequests');
      expect(metrics.http).toHaveProperty('failedRequests');
      expect(metrics.http).toHaveProperty('retriedRequests');
      expect(metrics.http).toHaveProperty('successRate');
      expect(metrics.http).toHaveProperty('queuedRequests');
      expect(metrics.http).toHaveProperty('runningRequests');

      // Cache metrics
      expect(metrics).toHaveProperty('cache');
      expect(metrics.cache).toHaveProperty('hits');
      expect(metrics.cache).toHaveProperty('misses');
      expect(metrics.cache).toHaveProperty('hitRate');

      // Circuit breaker metrics
      expect(metrics).toHaveProperty('circuitBreaker');
    });

    test('should calculate N/A success rate when no requests', () => {
      const metrics = client.getMetrics();
      expect(metrics.http.successRate).toBe('N/A');
    });

    test('should have cache stats method', () => {
      const cacheStats = client.getCacheStats();
      expect(cacheStats).toHaveProperty('hitRate');
      expect(cacheStats).toHaveProperty('keys');
    });

    test('should have clearCache method', () => {
      expect(typeof client.clearCache).toBe('function');
      client.clearCache(); // Should not throw
    });
  });

  describe('Enterprise Features', () => {
    test('should have healthCheck method', () => {
      expect(typeof client.healthCheck).toBe('function');
    });

    test('should have shutdown method for graceful shutdown', () => {
      expect(typeof client.shutdown).toBe('function');
    });

    test('should have rate limiter configured', () => {
      expect(client.limiter).toBeDefined();
      expect(client.limiter.counts).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('_handleError() should handle response errors', () => {
      const responseError = {
        response: {
          status: 404,
          data: { errors: [{ message: 'Not found' }] }
        }
      };

      const handledError = client._handleError(responseError, 'GET', '/test');

      expect(handledError.message).toContain('404');
      expect(handledError.message).toContain('Not found');
      expect(handledError.code).toBe('HTTP_404');
      expect(handledError.status).toBe(404);
      expect(handledError.endpoint).toBe('/test');
      expect(handledError.method).toBe('GET');
    });

    test('_handleError() should handle rate limit errors', () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: { errors: [{ message: 'Rate limit exceeded' }] },
          headers: { 'retry-after': '60' }
        }
      };

      const handledError = client._handleError(rateLimitError, 'POST', '/tasks');

      expect(handledError.message).toContain('429');
      expect(handledError.code).toBe('HTTP_429');
      expect(handledError.retryAfter).toBe('60');
    });

    test('_handleError() should handle network errors', () => {
      const networkError = {
        request: {},
        message: 'Network failed'
      };

      const handledError = client._handleError(networkError, 'GET', '/test');

      expect(handledError.message).toContain('Network error');
      expect(handledError.code).toBe('NETWORK_ERROR');
      expect(handledError.endpoint).toBe('/test');
    });

    test('_handleError() should handle unknown errors', () => {
      const unknownError = new Error('Something went wrong');

      const handledError = client._handleError(unknownError, 'GET', '/test');

      expect(handledError.message).toContain('Something went wrong');
      expect(handledError.code).toBe('UNKNOWN_ERROR');
    });
  });
});
