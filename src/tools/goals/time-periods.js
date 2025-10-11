/** Time Periods Tools */
module.exports = (client) => [
  {
    name: 'get_time_period',
    description: 'Get a time period',
    inputSchema: {
      type: 'object',
      properties: {
        time_period_gid: { type: 'string', description: 'Time period GID' }
      },
      required: ['time_period_gid']
    },
    handler: async (args) => await client.get(`/time_periods/${args.time_period_gid}`)
  },
  {
    name: 'list_workspace_time_periods',
    description: 'Get time periods for a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID' },
        start_on: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
        end_on: { type: 'string', description: 'End date filter (YYYY-MM-DD)' }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      const { workspace_gid, ...params } = args;
      return await client.get(`/workspaces/${workspace_gid}/time_periods`, params);
    }
  }
];
