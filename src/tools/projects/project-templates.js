/**
 * Project Template Tools - Reusable project structures
 *
 * Project templates define standardized project configurations (sections, task templates,
 * custom field settings) that can be instantiated to create consistent projects.
 *
 * Plan requirements: Premium or higher
 *
 * Key constraints:
 * - Instantiation returns an async Job — poll with get_job (may take minutes for complex templates)
 * - Rules are NOT preserved during template instantiation via API
 * - Forms are NOT preserved during template instantiation via API
 * - Custom field values on template tasks may not fully carry over
 * - Max 5 concurrent instantiation/duplication jobs per user
 * - requested_dates and requested_roles must match template configuration
 *
 * @module project-templates
 */
module.exports = (client) => [
  {
    name: 'get_project_template',
    description: 'Get details of a project template by GID. Returns template name, description, requested_dates (date variables), and template_roles (assignable roles). Use this to inspect template configuration before instantiation. Premium feature. Related: instantiate_project_template, list_team_project_templates.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_template_gid: { type: 'string', description: 'Project template GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,description,html_description,color,requested_dates,template_roles"' }
      },
      required: ['project_template_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/project_templates/${args.project_template_gid}`, params);
    }
  },
  {
    name: 'list_team_project_templates',
    description: 'List all project templates available in a team. Returns templates that can be instantiated to create standardized projects. Premium feature. Returns max 100 per page. Related: get_project_template for details, instantiate_project_template, list_workspace_project_templates for all templates.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        team_gid: { type: 'string', description: 'Team GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,description,color"' }
      },
      required: ['team_gid']
    },
    handler: async (args) => {
      const { team_gid, ...params } = args;
      return await client.get(`/teams/${team_gid}/project_templates`, params);
    }
  },
  {
    name: 'instantiate_project_template',
    description: 'Create a new project from a template. Copies all template structure (sections, task templates, custom fields). Returns an async Job — use get_job to poll for completion (may take minutes for complex templates). IMPORTANT: Rules and forms are NOT applied during API instantiation. Use requested_dates to set template date variables and requested_roles to assign template roles to users — these must match the template configuration (inspect with get_project_template first). Max 5 concurrent instantiation jobs per user. Premium feature. Related: get_project_template to inspect first, get_job to track progress.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_template_gid: { type: 'string', description: 'Template GID to instantiate' },
        name: { type: 'string', description: 'Name for the new project' },
        team: { type: 'string', description: 'Team GID for the new project' },
        workspace: { type: 'string', description: 'Workspace GID' },
        public: { type: 'boolean', description: 'Whether the new project is public' },
        requested_dates: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of {gid, value} objects to set template date variables'
        },
        requested_roles: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of {gid, value} objects to assign template roles to users'
        },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['project_template_gid', 'name']
    },
    handler: async (args) => {
      const { project_template_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/project_templates/${project_template_gid}/instantiateProject`, data, { params });
    }
  },
  {
    name: 'list_workspace_project_templates',
    description: 'List all project templates in a workspace or organization. For organizations, you must provide team_gid instead of workspace_gid (Asana requires team-scoped queries for orgs). Premium feature. Returns max 100 per page. Related: list_team_project_templates for team-specific listing, get_project_template for details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID (use for regular workspaces, not organizations)' },
        team_gid: { type: 'string', description: 'Team GID (required for organizations instead of workspace_gid)' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,description,color,team.name"' }
      }
    },
    handler: async (args) => {
      const { workspace_gid, team_gid, ...params } = args;
      if (team_gid) {
        params.team = team_gid;
      } else if (workspace_gid) {
        params.workspace = workspace_gid;
      }
      return await client.get('/project_templates', params);
    }
  },
  {
    name: 'save_project_as_template',
    description: 'Save an existing project as a reusable template. Captures the project structure: sections, task templates, and custom field settings. Returns an async Job — use get_job to poll for completion. IMPORTANT: Rules and forms are NOT included in the saved template. The original project is not modified. Premium feature. Related: get_project for project details, instantiate_project_template to use the template.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID to save as template' },
        name: { type: 'string', description: 'Name for the template' },
        public: { type: 'boolean', description: 'Whether the template is public' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['project_gid', 'name']
    },
    handler: async (args) => {
      const { project_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/projects/${project_gid}/saveAsTemplate`, data, { params });
    }
  }
];
