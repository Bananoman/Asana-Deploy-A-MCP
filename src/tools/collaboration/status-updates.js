/**
 * Status Update Tools - Project, Portfolio & Goal Progress Reporting
 *
 * Status updates communicate progress on projects, portfolios, and goals to stakeholders.
 * They appear in the parent resource's timeline and are visible to all resource members.
 *
 * IMPORTANT: Status updates are IMMUTABLE after creation — text and status_type cannot be
 * edited. To correct a mistake, delete the update and create a new one.
 *
 * Plan requirements: Free (project status), Premium (portfolio status), Business (goal status)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - Status types for projects: on_track, at_risk, off_track, on_hold, complete
 * - Status types for goals: on_track, at_risk, off_track, achieved, partial, missed, dropped
 * - html_text must be wrapped in <body> tags for rich formatting
 * - Cannot update/edit status updates after creation — only delete and recreate
 * - Status updates can be created on projects, portfolios, and goals
 *
 * NOT possible via API (use Asana UI instead):
 * - Editing status update text after creation
 * - Scheduling automatic status update reminders
 * - Viewing status update read receipts
 *
 * @module status-updates
 */

module.exports = (client) => [
  {
    name: 'get_status_update',
    description: 'Get a single status update by GID. Returns the full status update including title, text, html_text, status_type, author, created_at, and parent resource. IMPORTANT: status updates are immutable after creation — text and status_type cannot be modified. If you need corrections, delete this update and create a new one. Use opt_fields to control response size. Related: list_project_status_updates or list_portfolio_status_updates to find GIDs, create_status_update to post new updates, delete_status_update to remove.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        status_update_gid: { type: 'string', description: 'The globally unique identifier for the status update' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "title,text,html_text,status_type,author,author.name,created_at,parent,parent.name"' }
      },
      required: ['status_update_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/status_updates/${args.status_update_gid}`, params);
    }
  },
  {
    name: 'delete_status_update',
    description: 'Permanently delete a status update. This action cannot be undone. Since status updates are immutable (cannot be edited after creation), deletion is the only way to correct a mistake — create a new status update afterward as a replacement. Only the author or a workspace admin can delete. Related: get_status_update to verify content before deleting, create_status_update to post a corrected replacement.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        status_update_gid: { type: 'string', description: 'The globally unique identifier for the status update to delete' }
      },
      required: ['status_update_gid']
    },
    handler: async (args) => await client.delete(`/status_updates/${args.status_update_gid}`)
  },
  {
    name: 'create_status_update',
    description: 'Create a new status update on a project, portfolio, or goal. Status updates communicate progress to stakeholders and appear in the parent resource timeline. Status types for projects: on_track, at_risk, off_track, on_hold, complete. Status types for goals: on_track, at_risk, off_track, achieved, partial, missed, dropped. CRITICAL: status updates CANNOT be modified after creation — double-check text and status_type before posting. Supports html_text for rich formatting (must be wrapped in <body> tags). If both text and html_text are provided, html_text takes precedence. Related: list_project_status_updates or list_portfolio_status_updates to see history, get_status_update for full details.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'GID of the parent resource (project, portfolio, or goal) to post the status update on' },
        text: { type: 'string', description: 'Plain text body of the status update. Describe progress, blockers, and next steps.' },
        html_text: { type: 'string', description: 'Rich HTML body of the status update. Must be wrapped in <body> tags. Overrides text if provided. Supports bold, italic, lists, links.' },
        status_type: {
          type: 'string',
          description: 'Status indicator. Projects: on_track, at_risk, off_track, on_hold, complete. Goals: on_track, at_risk, off_track, achieved, partial, missed, dropped.',
          enum: ['on_track', 'at_risk', 'off_track', 'on_hold', 'complete', 'achieved', 'partial', 'missed', 'dropped']
        },
        title: { type: 'string', description: 'Optional title for the status update. If omitted, Asana generates one from the status_type and date.' }
      },
      required: ['parent', 'text', 'status_type']
    },
    handler: async (args) => await client.post('/status_updates', args)
  },
  {
    name: 'list_project_status_updates',
    description: 'List all status updates for a project, ordered by creation date (newest first). Returns status update history including status_type, text, author, and creation date. Use this to review project health over time, track status changes, or find specific updates to reference. Returns paginated results (default 20, max 100). Related: create_status_update to post new updates, get_status_update for full details with html_text, list_project_statuses for legacy status format.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID to list status updates for' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "title,text,status_type,author.name,created_at"' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, ...params } = args;
      params.parent = project_gid;
      if (!params.limit) params.limit = 20;
      return await client.get('/status_updates', params);
    }
  },
  {
    name: 'list_portfolio_status_updates',
    description: 'List all status updates for a portfolio, ordered by creation date (newest first). Returns status update history for portfolio-level progress reporting. Portfolios track status across multiple projects, so these updates reflect overall portfolio health. Returns paginated results (default 20, max 100). Related: create_status_update with portfolio GID as parent to post new updates, get_status_update for full details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'The portfolio GID to list status updates for' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "title,text,status_type,author.name,created_at"' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => {
      const { portfolio_gid, ...params } = args;
      params.parent = portfolio_gid;
      if (!params.limit) params.limit = 20;
      return await client.get('/status_updates', params);
    }
  },
];
