/**
 * Jest Configuration for Asana MCP Server
 * Enterprise-grade test configuration
 */

module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/core/**/*.js',
    'src/tools/**/*.js',
    '!src/index.js',
    '!src/server.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000
};
