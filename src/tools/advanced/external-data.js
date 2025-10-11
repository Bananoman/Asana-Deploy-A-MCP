/** External Data Tools (Premium Feature) */
module.exports = (client) => [
  {
    name: 'attach_external_data',
    description: 'Attach external data to a resource',
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent resource GID (task, project, etc.)' },
        external_id: { type: 'string', description: 'External ID' },
        external_url: { type: 'string', description: 'External URL' },
        external_data: { type: 'object', description: 'External data object' }
      },
      required: ['parent', 'external_id']
    },
    handler: async (args) => await client.post('/external_data', args)
  },
  {
    name: 'get_external_data',
    description: 'Get external data by ID',
    inputSchema: {
      type: 'object',
      properties: {
        external_data_gid: { type: 'string', description: 'External data GID' }
      },
      required: ['external_data_gid']
    },
    handler: async (args) => await client.get(`/external_data/${args.external_data_gid}`)
  },
  {
    name: 'update_external_data',
    description: 'Update external data',
    inputSchema: {
      type: 'object',
      properties: {
        external_data_gid: { type: 'string', description: 'External data GID' },
        external_url: { type: 'string', description: 'New external URL' },
        external_data: { type: 'object', description: 'New external data' }
      },
      required: ['external_data_gid']
    },
    handler: async (args) => {
      const { external_data_gid, ...data } = args;
      return await client.put(`/external_data/${external_data_gid}`, data);
    }
  },
  {
    name: 'delete_external_data',
    description: 'Delete external data',
    inputSchema: {
      type: 'object',
      properties: {
        external_data_gid: { type: 'string', description: 'External data GID' }
      },
      required: ['external_data_gid']
    },
    handler: async (args) => await client.delete(`/external_data/${args.external_data_gid}`)
  },
  {
    name: 'list_external_data_for_resource',
    description: 'List external data for a resource',
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent resource GID' }
      },
      required: ['parent']
    },
    handler: async (args) => await client.get('/external_data', { parent: args.parent })
  },
  {
    name: 'sync_external_data',
    description: 'Sync external data for a resource',
    inputSchema: {
      type: 'object',
      properties: {
        external_data_gid: { type: 'string', description: 'External data GID' }
      },
      required: ['external_data_gid']
    },
    handler: async (args) => await client.post(`/external_data/${args.external_data_gid}/sync`, {})
  }
];
