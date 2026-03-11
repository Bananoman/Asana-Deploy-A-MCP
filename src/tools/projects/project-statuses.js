/**
 * Project Status Tools - Legacy color-coded status updates
 *
 * Project statuses are the legacy way to post color-coded progress updates on projects.
 * For the newer, more flexible approach, use the status_updates tools (create_status_update).
 *
 * Key constraints:
 * - Status updates are IMMUTABLE after creation — cannot be edited, only deleted
 * - Colors map to states: green=on_track, yellow=at_risk, red=off_track, blue=on_hold
 * - Each status update notifies all project followers
 *
 * @module project-statuses
 */
module.exports = (client) => [
  {
    name: 'get_project_status',
    description: 'Get a specific legacy project status update by GID. Returns status text, color (green/yellow/red/blue), author, and timestamp. NOTE: This is the legacy status API — for the newer approach with more status types, use the status_updates tools (get_status_update). Related: list_project_statuses for history, create_project_status to post new.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_status_gid: { type: 'string', description: 'Project status GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "title,text,color,created_by.name,created_at"' }
      },
      required: ['project_status_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/project_statuses/${args.project_status_gid}`, params);
    }
  },
  {
    name: 'delete_project_status',
    description: 'Delete a legacy project status update. DESTRUCTIVE: Cannot be undone. Related: get_project_status, list_project_statuses.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_status_gid: { type: 'string', description: 'Project status GID to delete' }
      },
      required: ['project_status_gid']
    },
    handler: async (args) => await client.delete(`/project_statuses/${args.project_status_gid}`)
  },
  {
    name: 'list_project_statuses',
    description: 'List all legacy status updates for a project, ordered chronologically. Shows project health history over time. Returns max 100 per page. For the newer status update API with more features, use list_project_status_updates. Related: create_project_status, get_project_status.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "title,text,color,created_by.name,created_at"' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, ...params } = args;
      return await client.get(`/projects/${project_gid}/project_statuses`, params);
    }
  },
  {
    name: 'create_project_status',
    description: 'Create a legacy project status update with a color-coded indicator. IMMUTABLE: Status updates cannot be edited after creation — only deleted. Colors map to states: green=on_track, yellow=at_risk, red=off_track, blue=on_hold. All project followers are notified. For rich text status updates with more state options (on_track, at_risk, off_track, on_hold, complete, dropped), use create_status_update instead. Related: list_project_statuses, delete_project_status, create_status_update for newer API.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        text: { type: 'string', description: 'Status update text content' },
        color: { type: 'string', enum: ['green', 'yellow', 'red', 'blue'], description: 'Status indicator color: green=on_track, yellow=at_risk, red=off_track, blue=on_hold' },
        title: { type: 'string', description: 'Optional status title' },
        html_text: { type: 'string', description: 'Rich HTML text (wrap in <body> tags)' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['project_gid', 'text', 'color']
    },
    handler: async (args) => {
      const { project_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/projects/${project_gid}/project_statuses`, data, { params });
    }
  }
];
