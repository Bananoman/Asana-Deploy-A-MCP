/** Custom Objects Tools (Premium Feature) */
module.exports = (client) => [
  {
    name: 'list_custom_objects',
    description: 'List custom objects in a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' }
      },
      required: ['workspace']
    },
    handler: async (args) => await client.get('/custom_objects', { workspace: args.workspace })
  },
  {
    name: 'get_custom_object',
    description: 'Get a custom object',
    inputSchema: {
      type: 'object',
      properties: {
        custom_object_gid: { type: 'string', description: 'Custom object GID' }
      },
      required: ['custom_object_gid']
    },
    handler: async (args) => await client.get(`/custom_objects/${args.custom_object_gid}`)
  },
  {
    name: 'create_custom_object',
    description: 'Create a custom object',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        name: { type: 'string', description: 'Custom object name' },
        description: { type: 'string', description: 'Custom object description' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => await client.post('/custom_objects', args)
  },
  {
    name: 'update_custom_object',
    description: 'Update a custom object',
    inputSchema: {
      type: 'object',
      properties: {
        custom_object_gid: { type: 'string', description: 'Custom object GID' },
        name: { type: 'string', description: 'New name' },
        description: { type: 'string', description: 'New description' }
      },
      required: ['custom_object_gid']
    },
    handler: async (args) => {
      const { custom_object_gid, ...data } = args;
      return await client.put(`/custom_objects/${custom_object_gid}`, data);
    }
  },
  {
    name: 'delete_custom_object',
    description: 'Delete a custom object',
    inputSchema: {
      type: 'object',
      properties: {
        custom_object_gid: { type: 'string', description: 'Custom object GID' }
      },
      required: ['custom_object_gid']
    },
    handler: async (args) => await client.delete(`/custom_objects/${args.custom_object_gid}`)
  },
  {
    name: 'list_custom_object_records',
    description: 'List records for a custom object',
    inputSchema: {
      type: 'object',
      properties: {
        custom_object_gid: { type: 'string', description: 'Custom object GID' }
      },
      required: ['custom_object_gid']
    },
    handler: async (args) => await client.get(`/custom_objects/${args.custom_object_gid}/records`)
  },
  {
    name: 'create_custom_object_record',
    description: 'Create a record for a custom object',
    inputSchema: {
      type: 'object',
      properties: {
        custom_object_gid: { type: 'string', description: 'Custom object GID' },
        name: { type: 'string', description: 'Record name' },
        custom_fields: { type: 'object', description: 'Custom field values' }
      },
      required: ['custom_object_gid', 'name']
    },
    handler: async (args) => {
      const { custom_object_gid, ...data } = args;
      return await client.post(`/custom_objects/${custom_object_gid}/records`, data);
    }
  },
  {
    name: 'get_custom_object_record',
    description: 'Get a custom object record',
    inputSchema: {
      type: 'object',
      properties: {
        record_gid: { type: 'string', description: 'Record GID' }
      },
      required: ['record_gid']
    },
    handler: async (args) => await client.get(`/custom_object_records/${args.record_gid}`)
  }
];
