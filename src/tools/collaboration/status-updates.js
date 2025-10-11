/** Status Updates Tools */
module.exports = (client) => [
  {
    name: 'get_status_update',
    description: 'Get a status update',
    inputSchema: {
      type: 'object',
      properties: {
        status_update_gid: { type: 'string', description: 'Status update GID' }
      },
      required: ['status_update_gid']
    },
    handler: async (args) => await client.get(`/status_updates/${args.status_update_gid}`)
  },
  {
    name: 'delete_status_update',
    description: 'Delete a status update',
    inputSchema: {
      type: 'object',
      properties: {
        status_update_gid: { type: 'string', description: 'Status update GID' }
      },
      required: ['status_update_gid']
    },
    handler: async (args) => await client.delete(`/status_updates/${args.status_update_gid}`)
  },
  {
    name: 'create_status_update',
    description: 'Create a status update',
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent project or portfolio GID' },
        text: { type: 'string', description: 'Status update text' },
        status_type: {
          type: 'string',
          description: 'Status type: on_track, at_risk, off_track, on_hold, complete',
          enum: ['on_track', 'at_risk', 'off_track', 'on_hold', 'complete']
        },
        title: { type: 'string', description: 'Status update title' }
      },
      required: ['parent', 'text', 'status_type']
    },
    handler: async (args) => await client.post('/status_updates', args)
  },
  {
    name: 'list_project_status_updates',
    description: 'Get status updates for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' }
      },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}/status_updates`)
  },
  {
    name: 'list_portfolio_status_updates',
    description: 'Get status updates for a portfolio',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => await client.get(`/portfolios/${args.portfolio_gid}/status_updates`)
  }
];
