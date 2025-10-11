/** Webhooks Tools */
module.exports = (client) => [
  {
    name: 'list_webhooks',
    description: 'Get all webhooks in a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' }
      },
      required: ['workspace']
    },
    handler: async (args) => await client.get('/webhooks', { workspace: args.workspace })
  },
  {
    name: 'create_webhook',
    description: 'Create a webhook',
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Resource GID to watch' },
        target: { type: 'string', description: 'Target URL for webhook' },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resource_type: { type: 'string' },
              resource_subtype: { type: 'string' },
              action: { type: 'string' }
            }
          },
          description: 'Filters for webhook events'
        }
      },
      required: ['resource', 'target']
    },
    handler: async (args) => await client.post('/webhooks', args)
  },
  {
    name: 'get_webhook',
    description: 'Get webhook details',
    inputSchema: {
      type: 'object',
      properties: {
        webhook_gid: { type: 'string', description: 'Webhook GID' }
      },
      required: ['webhook_gid']
    },
    handler: async (args) => await client.get(`/webhooks/${args.webhook_gid}`)
  },
  {
    name: 'update_webhook',
    description: 'Update a webhook',
    inputSchema: {
      type: 'object',
      properties: {
        webhook_gid: { type: 'string', description: 'Webhook GID' },
        filters: {
          type: 'array',
          items: { type: 'object' },
          description: 'New filters for webhook'
        }
      },
      required: ['webhook_gid']
    },
    handler: async (args) => {
      const { webhook_gid, ...data } = args;
      return await client.put(`/webhooks/${webhook_gid}`, data);
    }
  },
  {
    name: 'delete_webhook',
    description: 'Delete a webhook',
    inputSchema: {
      type: 'object',
      properties: {
        webhook_gid: { type: 'string', description: 'Webhook GID' }
      },
      required: ['webhook_gid']
    },
    handler: async (args) => await client.delete(`/webhooks/${args.webhook_gid}`)
  }
];
