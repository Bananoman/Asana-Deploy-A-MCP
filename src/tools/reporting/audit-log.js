/** Audit Log Tools */
module.exports = (client) => [
  {
    name: 'get_audit_log_events',
    description: 'Get audit log events for a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID' },
        start_at: { type: 'string', description: 'Start timestamp (ISO 8601)' },
        end_at: { type: 'string', description: 'End timestamp (ISO 8601)' },
        event_type: { type: 'string', description: 'Event type filter' },
        actor_type: { type: 'string', description: 'Actor type filter' },
        actor_gid: { type: 'string', description: 'Actor GID filter' },
        resource_gid: { type: 'string', description: 'Resource GID filter' }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      const { workspace_gid, ...params } = args;
      return await client.get(`/workspaces/${workspace_gid}/audit_log_events`, params);
    }
  }
];
