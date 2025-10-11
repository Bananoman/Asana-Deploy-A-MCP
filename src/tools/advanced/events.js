/** Events Tools */
module.exports = (client) => [
  {
    name: 'get_events',
    description: 'Get events for a resource',
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Resource GID to get events for' },
        sync: { type: 'string', description: 'Sync token for pagination' }
      },
      required: ['resource']
    },
    handler: async (args) => await client.get('/events', args)
  }
];
