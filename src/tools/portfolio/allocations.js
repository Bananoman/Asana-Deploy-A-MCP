/** Allocations Tools */
module.exports = (client) => [
  {
    name: 'list_allocations',
    description: 'Get allocations',
    inputSchema: {
      type: 'object',
      properties: {
        assignee: { type: 'string', description: 'Assignee GID filter' },
        workspace: { type: 'string', description: 'Workspace GID filter' },
        start_on: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
        end_on: { type: 'string', description: 'End date filter (YYYY-MM-DD)' }
      }
    },
    handler: async (args) => await client.get('/allocations', args)
  },
  {
    name: 'get_allocation',
    description: 'Get an allocation',
    inputSchema: {
      type: 'object',
      properties: {
        allocation_gid: { type: 'string', description: 'Allocation GID' }
      },
      required: ['allocation_gid']
    },
    handler: async (args) => await client.get(`/allocations/${args.allocation_gid}`)
  },
  {
    name: 'create_allocation',
    description: 'Create an allocation',
    inputSchema: {
      type: 'object',
      properties: {
        assignee: { type: 'string', description: 'Assignee GID' },
        project: { type: 'string', description: 'Project GID' },
        start_on: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_on: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        percent_effort: { type: 'number', description: 'Percent effort (0-100)' }
      },
      required: ['assignee', 'project', 'start_on', 'end_on']
    },
    handler: async (args) => await client.post('/allocations', args)
  },
  {
    name: 'update_allocation',
    description: 'Update an allocation',
    inputSchema: {
      type: 'object',
      properties: {
        allocation_gid: { type: 'string', description: 'Allocation GID' },
        start_on: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_on: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        percent_effort: { type: 'number', description: 'Percent effort (0-100)' }
      },
      required: ['allocation_gid']
    },
    handler: async (args) => {
      const { allocation_gid, ...data } = args;
      return await client.put(`/allocations/${allocation_gid}`, data);
    }
  },
  {
    name: 'delete_allocation',
    description: 'Delete an allocation',
    inputSchema: {
      type: 'object',
      properties: {
        allocation_gid: { type: 'string', description: 'Allocation GID' }
      },
      required: ['allocation_gid']
    },
    handler: async (args) => await client.delete(`/allocations/${args.allocation_gid}`)
  }
];
