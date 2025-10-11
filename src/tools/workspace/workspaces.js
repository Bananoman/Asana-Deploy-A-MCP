/**
 * Workspace Tools
 * MCP tools for Asana workspace operations
 *
 * @module tools/workspaces
 */

module.exports = (client) => [
  {
    name: 'list_workspaces',
    description: 'List all workspaces you have access to',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async () => {
      return await client.get('/workspaces');
    }
  },

  {
    name: 'get_workspace',
    description: 'Get details of a specific workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: {
          type: 'string',
          description: 'Workspace GID'
        }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      return await client.get(`/workspaces/${args.workspace_gid}`);
    }
  },

  {
    name: 'update_workspace',
    description: 'Update workspace properties',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: {
          type: 'string',
          description: 'Workspace GID'
        },
        name: {
          type: 'string',
          description: 'New workspace name'
        }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      const { workspace_gid, ...data } = args;
      return await client.put(`/workspaces/${workspace_gid}`, data);
    }
  },

  {
    name: 'add_user_to_workspace',
    description: 'Add a user to a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: {
          type: 'string',
          description: 'Workspace GID'
        },
        user: {
          type: 'string',
          description: 'User email or GID'
        }
      },
      required: ['workspace_gid', 'user']
    },
    handler: async (args) => {
      const { workspace_gid, user } = args;
      return await client.post(`/workspaces/${workspace_gid}/addUser`, { user });
    }
  },

  {
    name: 'remove_user_from_workspace',
    description: 'Remove a user from a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: {
          type: 'string',
          description: 'Workspace GID'
        },
        user: {
          type: 'string',
          description: 'User GID'
        }
      },
      required: ['workspace_gid', 'user']
    },
    handler: async (args) => {
      const { workspace_gid, user } = args;
      return await client.post(`/workspaces/${workspace_gid}/removeUser`, { user });
    }
  }
];
