/**
 * Automation Tools - Webhooks for Real-time Event Notifications
 *
 * Webhooks send HTTP POST requests to a target URL whenever resources change in Asana.
 * They enable real-time integrations without polling.
 *
 * Plan requirements: Free (all plans)
 * Rate limits: Standard (1500 req/min paid, 150 req/min free)
 *
 * Key constraints:
 * - Target URL MUST be HTTPS and publicly accessible (no localhost, no HTTP)
 * - Handshake required: Asana sends X-Hook-Secret header on creation, target must echo it back with 200
 * - Heartbeat sent every 8 hours — webhook auto-deleted after 24 hours without successful heartbeat
 * - Max 10,000 webhooks per API token, 1,000 per resource
 * - Field-level filtering NOT supported for workspace/team/portfolio webhooks
 * - Failed deliveries retried with exponential backoff
 *
 * NOT possible via API:
 * - Receiving webhooks at non-HTTPS or private URLs
 * - Bypassing the handshake requirement
 *
 * @module webhooks
 */

module.exports = (client) => [
  {
    name: 'list_webhooks',
    description: 'List all webhooks in a workspace. Returns all active webhooks for the authenticated token in the given workspace, including target URLs, resource GIDs, filters, and active status. Use this to audit existing webhooks, find duplicates, or verify configuration. Limits: max 10,000 webhooks per token, 1,000 per resource. Webhooks auto-delete after 24 hours without successful heartbeat. Related: create_webhook to set up new webhooks, get_webhook for details on a specific webhook, delete_webhook to remove.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID to list webhooks for' },
        resource: { type: 'string', description: 'Optional: filter to webhooks watching this specific resource GID' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "resource,target,active,filters,created_at,last_success_at,last_failure_at,last_failure_content"' }
      },
      required: ['workspace']
    },
    handler: async (args) => {
      const params = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) params[key] = value;
      }
      if (!params.limit) params.limit = 20;
      return await client.get('/webhooks', params);
    }
  },
  {
    name: 'create_webhook',
    description: 'Subscribe to real-time event notifications on a resource via webhook — use for "subscribe to webhook events when a task is created in project X", integration triggers, real-time sync. Direct action — pass resource by GID; do NOT call get_project or list_workspaces first. Target URL MUST be HTTPS and publicly accessible. Handshake: Asana sends POST with X-Hook-Secret header, your server must respond 200 echoing the same X-Hook-Secret in the response header. Heartbeat every 8 hours; auto-deleted after 24 hours without successful heartbeat. Filter events: resource_type (task/project/story), resource_subtype (e.g. milestone), action (changed/added/removed/deleted), fields ([completed, assignee]). Field-level filtering NOT supported for workspace/team/portfolio webhooks; without filters ALL changes deliver. Failed deliveries retried with exponential backoff. Related: list_webhooks, get_webhook (status), update_webhook (change filters), delete_webhook.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Resource GID to watch for changes (task, project, portfolio, etc.)' },
        target: { type: 'string', description: 'HTTPS URL to receive webhook POST requests. Must be publicly accessible and respond to the handshake.' },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resource_type: { type: 'string', description: 'Filter by resource type: "task", "project", "story", "section", etc.' },
              resource_subtype: { type: 'string', description: 'Filter by subtype: "default_task", "milestone", "approval", etc.' },
              action: { type: 'string', description: 'Filter by action: "changed", "added", "removed", "deleted", "undeleted"' },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific fields to watch: ["completed", "assignee", "due_on", "custom_fields", etc.]'
              }
            }
          },
          description: 'Array of filter objects to narrow which events trigger delivery. Multiple filters are OR-ed together.'
        }
      },
      required: ['resource', 'target']
    },
    handler: async (args) => await client.post('/webhooks', args)
  },
  {
    name: 'get_webhook',
    description: 'Get detailed information about a specific webhook by GID. Returns the target URL, resource being watched, active status, filters, creation date, and last success/failure details. Use this to debug delivery issues, verify configuration, or check if the heartbeat is healthy. Webhooks auto-delete after 24 hours without successful heartbeat. Related: list_webhooks to find webhook GIDs, update_webhook to change filters, delete_webhook to remove.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        webhook_gid: { type: 'string', description: 'The globally unique identifier for the webhook' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "resource,target,active,filters,created_at,last_success_at,last_failure_at,last_failure_content"' }
      },
      required: ['webhook_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/webhooks/${args.webhook_gid}`, params);
    }
  },
  {
    name: 'update_webhook',
    description: 'Update a webhook to change its event filters. The target URL and resource cannot be changed after creation — delete and recreate for those changes. Filter options: resource_type, resource_subtype, action, fields. Field-level filtering NOT supported for workspace/team/portfolio webhooks. New filters replace existing filters entirely (not merged). Related: get_webhook to see current config, create_webhook to make a new one, delete_webhook to remove.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        webhook_gid: { type: 'string', description: 'The globally unique identifier for the webhook to update' },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resource_type: { type: 'string', description: 'Filter by resource type: "task", "project", "story", etc.' },
              resource_subtype: { type: 'string', description: 'Filter by subtype' },
              action: { type: 'string', description: 'Filter by action: "changed", "added", "removed", "deleted"' },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific fields to watch'
              }
            }
          },
          description: 'New filters to replace existing filters. Multiple filters are OR-ed.'
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
    description: 'Permanently delete a webhook. The target URL stops receiving events immediately. This action cannot be undone — use create_webhook to set up a new one if needed. Note that webhooks also auto-delete after 24 hours without successful heartbeat. Related: list_webhooks to find webhook GIDs, get_webhook to verify before deleting.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        webhook_gid: { type: 'string', description: 'The globally unique identifier for the webhook to delete' }
      },
      required: ['webhook_gid']
    },
    handler: async (args) => await client.delete(`/webhooks/${args.webhook_gid}`)
  }
];
