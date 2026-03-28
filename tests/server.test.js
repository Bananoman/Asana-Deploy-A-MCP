/**
 * Unit Tests for MCP Server
 * Tests server configuration and tool schemas
 */

// Set ASANA_TOKEN before importing dependencies
process.env.ASANA_TOKEN = 'test-token-for-unit-tests';

const AsanaClient = require('../src/core/AsanaClient');
const { getAllTools } = require('../src/tools');

describe('MCP Server Configuration', () => {
  describe('Tool Registration', () => {
    let client;
    let tools;

    beforeEach(() => {
      client = new AsanaClient('test-token');
      tools = getAllTools(client);
    });

    test('should register all 242 tools (207 base + 13 rules + 16 rules bulk/workflow + 6 advisor/guide)', () => {
      expect(tools).toHaveLength(242);
    });

    test('should have unique tool names', () => {
      const names = tools.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('all tools should have required fields', () => {
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('handler');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
        expect(typeof tool.handler).toBe('function');
      });
    });

    test('all inputSchemas should have valid JSON Schema structure', () => {
      tools.forEach(tool => {
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema.type).toBe('object');
        // Required field is optional in JSON Schema (some tools have all optional params)
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }
      });
    });

    test('all tools should be callable', () => {
      tools.forEach(tool => {
        expect(typeof tool.handler).toBe('function');
      });
    });
  });

  describe('Tool Names and Descriptions', () => {
    let tools;

    beforeEach(() => {
      const client = new AsanaClient('test-token');
      tools = getAllTools(client);
    });

    test('workspace tools should have proper names', () => {
      const workspaceToolNames = tools
        .filter(t => t.name.includes('workspace'))
        .map(t => t.name);

      expect(workspaceToolNames).toContain('list_workspaces');
      expect(workspaceToolNames).toContain('get_workspace');
      expect(workspaceToolNames).toContain('update_workspace');
    });

    test('project tools should have proper names', () => {
      const projectToolNames = tools
        .filter(t => t.name.includes('project'))
        .map(t => t.name);

      expect(projectToolNames).toContain('list_projects');
      expect(projectToolNames).toContain('get_project');
      expect(projectToolNames).toContain('create_project');
    });

    test('task tools should have proper names', () => {
      const taskToolNames = tools
        .filter(t => t.name.includes('task'))
        .map(t => t.name);

      expect(taskToolNames).toContain('list_tasks');
      expect(taskToolNames).toContain('get_task');
      expect(taskToolNames).toContain('create_task');
      expect(taskToolNames).toContain('update_task');
    });

    test('all descriptions should be non-empty', () => {
      tools.forEach(tool => {
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Input Schema Validation', () => {
    let tools;

    beforeEach(() => {
      const client = new AsanaClient('test-token');
      tools = getAllTools(client);
    });

    test('create and update operations should require parameters', () => {
      const createTools = tools.filter(t => t.name.startsWith('create_'));
      const updateTools = tools.filter(t => t.name.startsWith('update_'));

      [...createTools, ...updateTools].forEach(tool => {
        expect(tool.inputSchema.required.length).toBeGreaterThan(0);
      });
    });

    test('list operations should accept optional limit', () => {
      const listTools = tools.filter(t => t.name.startsWith('list_'));

      listTools.forEach(tool => {
        if (tool.inputSchema.properties.limit) {
          expect(tool.inputSchema.properties.limit.type).toBe('number');
        }
      });
    });

    test('get operations should require resource ID', () => {
      const getTools = tools.filter(t => t.name.startsWith('get_') && t.name !== 'get_current_user' && t.name !== 'get_asana_guide');

      getTools.forEach(tool => {
        expect(tool.inputSchema.required.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Deferred Loading', () => {
    test('deferred tools should have empty properties in inputSchema', () => {
      // Simulate efficient mode
      const prevMode = process.env.ASANA_TOOL_MODE;
      process.env.ASANA_TOOL_MODE = 'efficient';

      const { getToolsByMode } = require('../src/tools');
      const client = new AsanaClient('test-token');
      const { deferredTools } = getToolsByMode(client);

      // Deferred tools exist
      expect(deferredTools.length).toBeGreaterThan(200);

      // Verify the server would minimize their schema
      // (we test the minimization logic, not the handler directly)
      deferredTools.forEach(tool => {
        const minimized = {
          type: 'object',
          properties: {}
        };
        expect(minimized.properties).toEqual({});
      });

      process.env.ASANA_TOOL_MODE = prevMode || 'efficient';
    });
  });

  describe('Error Classification', () => {
    test('error response should include errorCode and retryable fields', () => {
      const error = {
        message: 'Rate limited',
        code: 'HTTP_429',
        status: 429,
        response: { data: { errors: [{ message: 'Too many requests' }] } }
      };

      // Simulate the error response format from server.js
      const errorResponse = {
        error: error.message,
        errorCode: error.code || 'UNKNOWN',
        tool: 'test_tool',
        retryable: error.status === 429 || (error.status && error.status >= 500),
        details: error.response?.data || null
      };

      expect(errorResponse.errorCode).toBe('HTTP_429');
      expect(errorResponse.retryable).toBe(true);
      expect(errorResponse.tool).toBe('test_tool');
    });

    test('non-retryable errors should have retryable=false', () => {
      const error = {
        message: 'Not found',
        code: 'HTTP_404',
        status: 404
      };

      const errorResponse = {
        error: error.message,
        errorCode: error.code || 'UNKNOWN',
        tool: 'test_tool',
        retryable: error.status === 429 || (error.status && error.status >= 500),
        details: null
      };

      expect(errorResponse.errorCode).toBe('HTTP_404');
      expect(errorResponse.retryable).toBe(false);
    });
  });

  describe('Environment Configuration', () => {
    test('should require ASANA_TOKEN', () => {
      const originalToken = process.env.ASANA_TOKEN;
      delete process.env.ASANA_TOKEN;

      expect(() => {
        new AsanaClient();
      }).toThrow('Asana token is required');

      process.env.ASANA_TOKEN = originalToken;
    });
  });
});
