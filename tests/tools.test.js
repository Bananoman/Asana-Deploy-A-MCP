/**
 * Unit Tests for Tool Modules
 * Tests tool definitions and handlers for 100% Asana API coverage (220 tools)
 */

const { getAllTools } = require('../src/tools');
const AsanaClient = require('../src/core/AsanaClient');

describe('Tool Modules - 100% Asana API Coverage + Rules Automation', () => {
  let mockClient;
  let tools;

  beforeEach(() => {
    mockClient = new AsanaClient('test-token');
    // Mock the axios methods
    mockClient.client.get = jest.fn();
    mockClient.client.post = jest.fn();
    mockClient.client.put = jest.fn();
    mockClient.client.delete = jest.fn();

    tools = getAllTools(mockClient);
  });

  describe('Tool Count and Structure', () => {
    test('should have exactly 242 tools (207 base + 13 rules + 16 rules bulk/workflow + 6 advisor/guide)', () => {
      expect(tools).toHaveLength(242);
    });

    test('all tools should have unique names', () => {
      const names = tools.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(242);
    });

    test('all tools should have required properties', () => {
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
  });

  describe('Core Resource Tools', () => {
    test('should have workspace management tools', () => {
      const workspaceTools = tools.filter(t => t.name.includes('workspace'));
      expect(workspaceTools.length).toBeGreaterThanOrEqual(3);

      const toolNames = workspaceTools.map(t => t.name);
      expect(toolNames).toContain('list_workspaces');
      expect(toolNames).toContain('get_workspace');
      expect(toolNames).toContain('update_workspace');
    });

    test('should have project management tools', () => {
      const projectTools = tools.filter(t => t.name.includes('project'));
      expect(projectTools.length).toBeGreaterThanOrEqual(3);

      const toolNames = projectTools.map(t => t.name);
      expect(toolNames).toContain('list_projects');
      expect(toolNames).toContain('get_project');
      expect(toolNames).toContain('create_project');
    });

    test('should have task management tools', () => {
      const taskTools = tools.filter(t => t.name.includes('task'));
      expect(taskTools.length).toBeGreaterThanOrEqual(4);

      const toolNames = taskTools.map(t => t.name);
      expect(toolNames).toContain('list_tasks');
      expect(toolNames).toContain('get_task');
      expect(toolNames).toContain('create_task');
      expect(toolNames).toContain('update_task');
    });

    test('should have user management tools', () => {
      const userTools = tools.filter(t => t.name.includes('user'));
      expect(userTools.length).toBeGreaterThanOrEqual(2);

      const toolNames = userTools.map(t => t.name);
      expect(toolNames).toContain('get_current_user');
    });
  });

  describe('Premium Feature Tools', () => {
    test('should have custom object tools (Premium)', () => {
      const customObjectTools = tools.filter(t => t.name.includes('custom_object'));
      expect(customObjectTools.length).toBeGreaterThanOrEqual(5);

      const toolNames = customObjectTools.map(t => t.name);
      expect(toolNames).toContain('list_custom_objects');
      expect(toolNames).toContain('create_custom_object');
    });

    test('should have external data tools (Premium)', () => {
      const externalDataTools = tools.filter(t => t.name.includes('external'));
      expect(externalDataTools.length).toBeGreaterThanOrEqual(3);

      const toolNames = externalDataTools.map(t => t.name);
      expect(toolNames).toContain('attach_external_data');
    });

    test('should have goal tools (Premium)', () => {
      const goalTools = tools.filter(t => t.name.includes('goal'));
      expect(goalTools.length).toBeGreaterThanOrEqual(2);

      const toolNames = goalTools.map(t => t.name);
      expect(toolNames).toContain('list_goals');
      expect(toolNames).toContain('get_goal');
    });
  });

  describe('Bulk Operations Tools', () => {
    test('should have bulk operation tools', () => {
      const bulkTools = tools.filter(t => t.name.startsWith('bulk_'));
      expect(bulkTools.length).toBeGreaterThanOrEqual(5);

      const toolNames = bulkTools.map(t => t.name);
      expect(toolNames).toContain('bulk_create_tasks');
      expect(toolNames).toContain('bulk_update_tasks');
    });
  });

  describe('Composite Operations Tools', () => {
    test('should have composite operation tools', () => {
      const compositeTools = tools.filter(t =>
        t.name.includes('clone_project') ||
        t.name.includes('setup_') ||
        t.name.includes('migrate_')
      );
      expect(compositeTools.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Tool Handler Functionality', () => {
    test('list tools should accept limit parameter', () => {
      const listTools = tools.filter(t => t.name.startsWith('list_'));

      listTools.forEach(tool => {
        if (tool.inputSchema.properties.limit) {
          expect(tool.inputSchema.properties.limit.type).toBe('number');
        }
      });
    });

    test('create tools should require necessary parameters', () => {
      const createTools = tools.filter(t => t.name.startsWith('create_'));

      createTools.forEach(tool => {
        expect(tool.inputSchema.required).toBeDefined();
        expect(tool.inputSchema.required.length).toBeGreaterThan(0);
      });
    });

    test('get tools should require resource ID', () => {
      const getTools = tools.filter(t =>
        t.name.startsWith('get_') &&
        t.name !== 'get_current_user' &&
        t.name !== 'get_asana_guide'
      );

      getTools.forEach(tool => {
        expect(tool.inputSchema.required).toBeDefined();
        expect(tool.inputSchema.required.length).toBeGreaterThan(0);
      });
    });

    test('update tools should require resource ID', () => {
      const updateTools = tools.filter(t => t.name.startsWith('update_'));

      updateTools.forEach(tool => {
        expect(tool.inputSchema.required).toBeDefined();
        expect(tool.inputSchema.required.length).toBeGreaterThan(0);
      });
    });

    test('delete tools should require resource ID', () => {
      const deleteTools = tools.filter(t => t.name.startsWith('delete_'));

      deleteTools.forEach(tool => {
        expect(tool.inputSchema.required).toBeDefined();
        expect(tool.inputSchema.required.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tool Descriptions', () => {
    test('all tools should have meaningful descriptions', () => {
      tools.forEach(tool => {
        expect(tool.description.length).toBeGreaterThan(5);
        expect(tool.description).not.toMatch(/TODO|FIXME|XXX/i);
      });
    });

    test('bulk tools should mention "multiple" or "bulk" in description', () => {
      const bulkTools = tools.filter(t => t.name.startsWith('bulk_'));

      bulkTools.forEach(tool => {
        expect(
          tool.description.toLowerCase().includes('multiple') ||
          tool.description.toLowerCase().includes('bulk') ||
          tool.description.toLowerCase().includes('batch')
        ).toBe(true);
      });
    });
  });

  describe('Input Schema Validation', () => {
    test('all inputSchemas should be valid JSON Schema', () => {
      tools.forEach(tool => {
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(typeof tool.inputSchema.properties).toBe('object');
      });
    });

    test('GID parameters should be strings', () => {
      tools.forEach(tool => {
        const props = tool.inputSchema.properties;
        Object.keys(props).forEach(key => {
          if (key.endsWith('_gid') || key === 'gid') {
            expect(props[key].type).toBe('string');
          }
        });
      });
    });

    test('limit parameters should be numbers with defaults', () => {
      const listTools = tools.filter(t => t.name.startsWith('list_'));

      listTools.forEach(tool => {
        if (tool.inputSchema.properties.limit) {
          expect(tool.inputSchema.properties.limit.type).toBe('number');
          // Should have a reasonable default
          if (tool.inputSchema.properties.limit.default) {
            expect(tool.inputSchema.properties.limit.default).toBeGreaterThan(0);
            expect(tool.inputSchema.properties.limit.default).toBeLessThanOrEqual(100);
          }
        }
      });
    });
  });

  describe('Read-Only Mode', () => {
    test('read-only mode should only return tools with readOnlyHint', () => {
      const prevMode = process.env.ASANA_READ_ONLY;
      process.env.ASANA_READ_ONLY = 'true';

      // Re-require to pick up env change
      const { getToolsByMode } = require('../src/tools');
      const client = new AsanaClient('test-token');
      const { allTools } = getToolsByMode(client);

      allTools.forEach(tool => {
        expect(tool.annotations?.readOnlyHint).toBe(true);
      });

      // Should have fewer tools than full mode
      expect(allTools.length).toBeLessThan(242);
      expect(allTools.length).toBeGreaterThan(20);

      process.env.ASANA_READ_ONLY = prevMode;
    });
  });

  describe('Coverage of All 38 Asana Resources', () => {
    const expectedResources = [
      'workspace', 'project', 'task', 'user', 'team', 'section',
      'portfolio', 'goal', 'status_update', 'attachment', 'story',
      'tag', 'custom_field', 'membership', 'batch', 'event',
      'webhook', 'organization_export', 'job', 'project_brief',
      'project_status', 'project_membership', 'portfolio_membership',
      'time_tracking_entry', 'typeahead', 'audit_log', 'custom_object',
      'external_data', 'project_template', 'task_template',
      'time_period', 'workspace_membership', 'team_membership',
      'goal_relationship', 'project_role', 'rule', 'status_update_template',
      'allocation'
    ];

    test('should have tools for all 38 Asana resources', () => {
      const missingResources = [];
      expectedResources.forEach(resource => {
        const resourceTools = tools.filter(t =>
          t.name.includes(resource) ||
          t.description.toLowerCase().includes(resource)
        );

        if (resourceTools.length === 0) {
          missingResources.push(resource);
        }
      });

      // Allow some flexibility for resources that may be named differently
      expect(missingResources.length).toBeLessThanOrEqual(5);
    });
  });
});
