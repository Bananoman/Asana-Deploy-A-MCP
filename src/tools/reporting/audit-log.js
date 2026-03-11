/**
 * Audit Log Tools - Enterprise Security & Compliance Event Logging
 *
 * The audit log API provides a chronological record of security-relevant actions taken within
 * an Asana organization. Events include user logins, permission changes, data exports, resource
 * creation/deletion, membership changes, and admin actions.
 *
 * Plan requirements: Enterprise only
 * Rate limits: Standard (1500 req/min paid)
 *
 * Key constraints:
 * - Enterprise only — will return 402/403 on non-Enterprise organizations
 * - Requires Service Account token (not personal access token) for full access
 * - Read-only API — audit events cannot be created, modified, or deleted via API
 * - Events are retained for a limited time (varies by Enterprise plan)
 * - Results are paginated — use offset to retrieve all events in large date ranges
 * - Date range filtering uses ISO 8601 timestamps (e.g., "2024-01-01T00:00:00Z")
 *
 * NOT possible via API (use Asana UI instead):
 * - Configuring audit log retention periods
 * - Setting up audit log email alerts
 * - Exporting audit logs to SIEM integrations
 *
 * @module audit-log
 */

module.exports = (client) => [
  {
    name: 'get_audit_log_events',
    description: 'Retrieve audit log events for an Enterprise organization. Returns a chronological log of security-relevant actions: user logins (succeeded/failed), permission changes, data exports, resource creation/deletion, membership changes, and admin actions. ENTERPRISE ONLY — requires organization admin or Service Account token (personal access tokens have limited access). Filter by date range (ISO 8601), actor (who performed the action), event type, or specific resource. Results are paginated (default 20, max 100) — use offset for subsequent pages. Event types include: "user_login_succeeded", "user_login_failed", "role_changed", "export_started", "project_deleted", "task_deleted", "user_invited", "user_deprovisioned". Use this for security auditing, compliance reporting, incident investigation, or user activity tracking. Related: list_users to find actor GIDs, get_workspace to verify Enterprise status.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'The workspace/organization GID to retrieve audit logs for. Must be an Enterprise organization.' },
        start_at: { type: 'string', description: 'Start of date range filter (ISO 8601 format, e.g., "2024-01-01T00:00:00Z"). Only events on or after this time are returned.' },
        end_at: { type: 'string', description: 'End of date range filter (ISO 8601 format, e.g., "2024-01-31T23:59:59Z"). Only events before this time are returned.' },
        event_type: { type: 'string', description: 'Filter by event type. Examples: "user_login_succeeded", "user_login_failed", "role_changed", "export_started", "project_deleted", "task_deleted", "user_invited", "user_deprovisioned"' },
        actor_type: { type: 'string', description: 'Filter by actor type: "user" (human action) or "asana" (system action)' },
        actor_gid: { type: 'string', description: 'Filter by the GID of the user who performed the action. Use list_users to find user GIDs.' },
        resource_gid: { type: 'string', description: 'Filter by the GID of the resource that was acted upon (task, project, user, etc.)' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      const { workspace_gid, ...params } = args;
      if (!params.limit) params.limit = 20;
      return await client.get(`/workspaces/${workspace_gid}/audit_log_events`, params);
    }
  }
];
