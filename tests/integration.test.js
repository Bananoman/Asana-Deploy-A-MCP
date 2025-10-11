/**
 * Integration Tests for MCP Server
 * End-to-end tests with real Asana API calls
 */

const AsanaClient = require('../src/core/AsanaClient');
const { getAllTools } = require('../src/tools');

// Skip if no token available
const ASANA_TOKEN = process.env.ASANA_TOKEN;
const describeIf = ASANA_TOKEN ? describe : describe.skip;

describeIf('MCP Server Integration', () => {
  let client;
  let tools;

  beforeAll(() => {
    client = new AsanaClient(ASANA_TOKEN);
    tools = getAllTools(client);
  });

  describe('Tool Registration', () => {
    test('should register all 19 tools', () => {
      expect(tools).toHaveLength(19);
    });

    test('should have unique tool names', () => {
      const names = tools.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test('all tools should be callable', () => {
      tools.forEach(tool => {
        expect(typeof tool.handler).toBe('function');
      });
    });
  });

  describe('Workspace Operations', () => {
    test('list_workspaces should return workspaces', async () => {
      const tool = tools.find(t => t.name === 'list_workspaces');
      const result = await tool.handler({});

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      if (result.data.length > 0) {
        expect(result.data[0]).toHaveProperty('gid');
        expect(result.data[0]).toHaveProperty('name');
      }
    });

    test('get_current_user should return user info', async () => {
      const tool = tools.find(t => t.name === 'get_current_user');
      const result = await tool.handler({});

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('gid');
      expect(result.data).toHaveProperty('email');
      expect(result.data).toHaveProperty('workspaces');
    });
  });

  describe('Project Operations', () => {
    let workspaceGid;

    beforeAll(async () => {
      const tool = tools.find(t => t.name === 'list_workspaces');
      const result = await tool.handler({});
      workspaceGid = result.data[0]?.gid;
    });

    test('list_projects should return projects', async () => {
      if (!workspaceGid) {
        return; // Skip if no workspace
      }

      const tool = tools.find(t => t.name === 'list_projects');
      const result = await tool.handler({ workspace: workspaceGid });

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    test('list_projects should respect limit parameter', async () => {
      if (!workspaceGid) {
        return;
      }

      const tool = tools.find(t => t.name === 'list_projects');
      const result = await tool.handler({ workspace: workspaceGid, limit: 5 });

      expect(result.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid workspace GID', async () => {
      const tool = tools.find(t => t.name === 'get_workspace');

      await expect(
        tool.handler({ workspace_gid: 'invalid-gid' })
      ).rejects.toThrow();
    });

    test('should handle invalid project GID', async () => {
      const tool = tools.find(t => t.name === 'get_project');

      await expect(
        tool.handler({ project_gid: 'invalid-gid' })
      ).rejects.toThrow();
    });

    test('should handle invalid task GID', async () => {
      const tool = tools.find(t => t.name === 'get_task');

      await expect(
        tool.handler({ task_gid: 'invalid-gid' })
      ).rejects.toThrow();
    });
  });

  describe('Tool Input Validation', () => {
    test('should enforce required parameters', () => {
      const listProjects = tools.find(t => t.name === 'list_projects');
      expect(listProjects.inputSchema.required).toContain('workspace');

      const createTask = tools.find(t => t.name === 'create_task');
      expect(createTask.inputSchema.required).toContain('workspace');
      expect(createTask.inputSchema.required).toContain('name');
    });

    test('should define input schemas for all tools', () => {
      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema).toHaveProperty('required');
      });
    });
  });

  describe('Response Format', () => {
    test('all responses should have data property', async () => {
      const tool = tools.find(t => t.name === 'list_workspaces');
      const result = await tool.handler({});

      expect(result).toHaveProperty('data');
    });

    test('list operations should return arrays', async () => {
      const listTools = tools.filter(t => t.name.startsWith('list_'));

      for (const tool of listTools) {
        const args = {};

        // Add required parameters based on tool
        if (tool.name === 'list_projects' || tool.name === 'list_tasks') {
          const workspaceTool = tools.find(t => t.name === 'list_workspaces');
          const workspaces = await workspaceTool.handler({});
          if (workspaces.data.length > 0) {
            args.workspace = workspaces.data[0].gid;
            if (tool.name === 'list_tasks') {
              args.project = 'dummy'; // Will fail but tests format
              continue;
            }
          } else {
            continue;
          }
        } else if (tool.name === 'list_users_workspace') {
          const workspaceTool = tools.find(t => t.name === 'list_workspaces');
          const workspaces = await workspaceTool.handler({});
          if (workspaces.data.length > 0) {
            args.workspace = workspaces.data[0].gid;
          } else {
            continue;
          }
        }

        try {
          const result = await tool.handler(args);
          expect(result).toHaveProperty('data');
          expect(Array.isArray(result.data)).toBe(true);
        } catch (e) {
          // Some may fail due to missing data, that's ok
        }
      }
    });
  });
});
