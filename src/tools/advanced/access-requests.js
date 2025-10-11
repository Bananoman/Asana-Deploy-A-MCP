/** Access Requests Tools */
module.exports = (client) => [
  {
    name: 'list_access_requests',
    description: 'Get access requests',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID filter' }
      }
    },
    handler: async (args) => await client.get('/access_requests', args)
  },
  {
    name: 'approve_access_request',
    description: 'Approve an access request',
    inputSchema: {
      type: 'object',
      properties: {
        access_request_gid: { type: 'string', description: 'Access request GID' }
      },
      required: ['access_request_gid']
    },
    handler: async (args) => await client.post(`/access_requests/${args.access_request_gid}/approve`, {})
  }
];
