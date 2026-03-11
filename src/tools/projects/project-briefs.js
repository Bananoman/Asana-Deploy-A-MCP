/**
 * Project Brief Tools - Project overview documentation
 *
 * Each project can have at most ONE brief containing rich text documentation
 * about the project scope, goals, timeline, stakeholders, and other context.
 *
 * Key constraints:
 * - Maximum one brief per project — creating a second brief fails
 * - Supports rich HTML content wrapped in <body> tags
 * - Briefs are separate from project notes/description
 *
 * @module project-briefs
 */
module.exports = (client) => [
  {
    name: 'get_project_brief',
    description: 'Get the brief for a project by its brief GID. Each project has at most one brief containing rich text documentation (goals, scope, timeline, etc.). Returns title, text, html_text, and permalink. To find the brief GID, get the project with opt_fields="project_brief" first. Related: update_project_brief, create_project_brief.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_brief_gid: { type: 'string', description: 'Project brief GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "title,html_text,text,permalink_url"' }
      },
      required: ['project_brief_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/project_briefs/${args.project_brief_gid}`, params);
    }
  },
  {
    name: 'update_project_brief',
    description: 'Update a project brief title and/or content. Supports rich HTML content wrapped in <body> tags. html_text overrides text if both provided. Each project has at most one brief. Related: get_project_brief, delete_project_brief.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_brief_gid: { type: 'string', description: 'Project brief GID' },
        title: { type: 'string', description: 'Brief title' },
        text: { type: 'string', description: 'Plain text content' },
        html_text: { type: 'string', description: 'Rich HTML content. Wrap in <body> tags. Supports full formatting. Overrides text if both provided.' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['project_brief_gid']
    },
    handler: async (args) => {
      const { project_brief_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/project_briefs/${project_brief_gid}`, data, { params });
    }
  },
  {
    name: 'delete_project_brief',
    description: 'Permanently delete a project brief. DESTRUCTIVE: Cannot be undone — all brief content is lost. Related: get_project_brief, create_project_brief to recreate.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_brief_gid: { type: 'string', description: 'Project brief GID to delete' }
      },
      required: ['project_brief_gid']
    },
    handler: async (args) => await client.delete(`/project_briefs/${args.project_brief_gid}`)
  },
  {
    name: 'create_project_brief',
    description: 'Create a brief for a project. Each project can have at most ONE brief — attempting to create a second returns an error. Use for project overview documentation: goals, scope, timeline, stakeholders. Supports rich HTML content wrapped in <body> tags. html_text overrides text if both provided. Related: get_project_brief, update_project_brief.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID (one brief per project)' },
        title: { type: 'string', description: 'Brief title' },
        text: { type: 'string', description: 'Plain text content' },
        html_text: { type: 'string', description: 'Rich HTML content. Wrap in <body> tags.' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['project_gid', 'title']
    },
    handler: async (args) => {
      const { project_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/projects/${project_gid}/project_briefs`, data, { params });
    }
  }
];
