/**
 * Access Request Tools - Manage resource access requests
 *
 * Access requests are generated when users request access to resources
 * they don't have permission to view (projects, teams, etc.).
 * Admin/resource owner feature.
 *
 * @module access-requests
 */
module.exports = (client) => [
  {
    name: 'list_access_requests',
    description: 'List pending access requests for a resource (workspace, project, team, etc.). Shows requests from users wanting access. Admin or resource owner feature. Returns max 100 per page. Related: approve_access_request.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target resource GID (workspace, project, team, etc.) to list access requests for. Required.' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['target']
    },
    handler: async (args) => {
      const params = {};
      params.target = args.target;
      if (args.limit) params.limit = args.limit;
      if (args.offset) params.offset = args.offset;
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get('/access_requests', params);
    }
  },
  {
    name: 'approve_access_request',
    description: 'Approve a pending access request, granting the requesting user access to the resource. Admin or resource owner feature. Related: list_access_requests.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        access_request_gid: { type: 'string', description: 'Access request GID to approve' }
      },
      required: ['access_request_gid']
    },
    handler: async (args) => await client.post(`/access_requests/${args.access_request_gid}/approve`, {})
  }
];
