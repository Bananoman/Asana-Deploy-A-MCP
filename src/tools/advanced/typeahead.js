/** Typeahead Tools */
module.exports = (client) => [
  {
    name: 'workspace_typeahead',
    description: 'Typeahead search in a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID' },
        resource_type: {
          type: 'string',
          description: 'Resource type to search (project, task, user, portfolio, tag, etc.)'
        },
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Number of results (default 20)' }
      },
      required: ['workspace_gid', 'resource_type']
    },
    handler: async (args) => {
      const { workspace_gid, resource_type, ...params } = args;
      return await client.get(`/workspaces/${workspace_gid}/typeahead`, {
        type: resource_type,
        ...params
      });
    }
  }
];
