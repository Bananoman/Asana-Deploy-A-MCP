/** Batch API Tools */
module.exports = (client) => [
  {
    name: 'batch_api',
    description: 'Execute multiple API requests in a single batch',
    inputSchema: {
      type: 'object',
      properties: {
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              method: { type: 'string', description: 'HTTP method (GET, POST, PUT, DELETE)' },
              relative_path: { type: 'string', description: 'Relative API path' },
              data: { type: 'object', description: 'Request body for POST/PUT' }
            },
            required: ['method', 'relative_path']
          },
          description: 'Array of actions to execute'
        }
      },
      required: ['actions']
    },
    handler: async (args) => await client.post('/batch', { actions: args.actions })
  }
];
