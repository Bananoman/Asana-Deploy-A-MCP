/**
 * Events (Change Monitoring) Tools - Poll-based change detection
 *
 * The Events API provides incremental change tracking using sync tokens.
 * It is the polling alternative to Webhooks for detecting resource changes.
 *
 * Key constraints:
 * - First call WITHOUT a sync token returns HTTP 412 with a starter sync token — this is EXPECTED, not an error
 * - Sync tokens expire after 24 hours of inactivity
 * - Events include: action (changed/added/removed/deleted), resource, user, and field changes
 * - Higher rate limits than standard endpoints
 * - For push-based notifications, use Webhooks instead
 *
 * @module events
 */
module.exports = (client) => [
  {
    name: 'get_events',
    description: 'Get change events for a resource (project, task, etc.) using sync token-based polling. IMPORTANT: First call without a sync token returns HTTP 412 with a starter token — this is EXPECTED behavior, not an error. Use that token in your next call to get actual events. Sync tokens expire after 24 hours of inactivity. Events include action type (changed/added/removed/deleted), the affected resource, the acting user, and field-level changes. Has higher rate limits than standard endpoints. For push-based real-time notifications, use Webhooks (create_webhook) instead. Related: create_webhook for push notifications instead of polling.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Resource GID to monitor (project, task, etc.)' },
        sync: { type: 'string', description: 'Sync token from previous response. Omit on first call to get starter token (returns 412).' },
        opt_fields: { type: 'string', description: 'Example: "user.name,resource.name,action,change.field,change.new_value"' }
      },
      required: ['resource']
    },
    handler: async (args) => {
      const params = {};
      params.resource = args.resource;
      if (args.sync) params.sync = args.sync;
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get('/events', params);
    }
  }
];
