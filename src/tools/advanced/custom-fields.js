/** Custom Field Tools - Complete CRUD + Enum Options */
module.exports = (client) => [
  {
    name: 'list_custom_fields',
    description: 'List custom fields in a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' }
      },
      required: ['workspace']
    },
    handler: async (args) => await client.get('/custom_fields', { workspace: args.workspace })
  },
  {
    name: 'get_custom_field',
    description: 'Get a custom field by GID',
    inputSchema: {
      type: 'object',
      properties: { custom_field_gid: { type: 'string' } },
      required: ['custom_field_gid']
    },
    handler: async (args) => await client.get(`/custom_fields/${args.custom_field_gid}`)
  },
  {
    name: 'create_custom_field',
    description: 'Create a custom field',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string' },
        name: { type: 'string' },
        resource_subtype: {
          type: 'string',
          description: 'text, enum, number, etc.'
        }
      },
      required: ['workspace', 'name', 'resource_subtype']
    },
    handler: async (args) => await client.post('/custom_fields', args)
  },
  {
    name: 'update_custom_field',
    description: 'Update a custom field',
    inputSchema: {
      type: 'object',
      properties: {
        custom_field_gid: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['custom_field_gid']
    },
    handler: async (args) => {
      const { custom_field_gid, ...data } = args;
      return await client.put(`/custom_fields/${custom_field_gid}`, data);
    }
  },
  {
    name: 'delete_custom_field',
    description: 'Delete a custom field',
    inputSchema: {
      type: 'object',
      properties: { custom_field_gid: { type: 'string' } },
      required: ['custom_field_gid']
    },
    handler: async (args) => await client.delete(`/custom_fields/${args.custom_field_gid}`)
  },
  {
    name: 'create_enum_custom_field',
    description: 'Create an enum (dropdown) custom field',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string' },
        name: { type: 'string' },
        enum_options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              color: { type: 'string' }
            }
          }
        }
      },
      required: ['workspace', 'name', 'enum_options']
    },
    handler: async (args) => {
      return await client.post('/custom_fields', {
        workspace: args.workspace,
        name: args.name,
        resource_subtype: 'enum',
        enum_options: args.enum_options
      });
    }
  },
  {
    name: 'set_custom_field_value',
    description: 'Set custom field value on a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string' },
        custom_field_gid: { type: 'string' },
        value: {
          type: 'string',
          description: 'Value (for enum, use option GID)'
        }
      },
      required: ['task_gid', 'custom_field_gid', 'value']
    },
    handler: async (args) => {
      const { task_gid, custom_field_gid, value } = args;
      const custom_fields = {};
      custom_fields[custom_field_gid] = value;
      return await client.put(`/tasks/${task_gid}`, { custom_fields });
    }
  }
];
