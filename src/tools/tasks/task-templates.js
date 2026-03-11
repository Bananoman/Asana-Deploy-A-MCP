/**
 * Task Template Tools - Reusable task configurations
 *
 * Task templates define standardized task configurations (name, description, assignee,
 * custom field defaults) that can be instantiated to create consistent tasks.
 *
 * Plan requirements: Premium or higher
 *
 * Key constraints:
 * - Templates are project-scoped — each template belongs to a specific project
 * - Instantiation returns an async Job — poll with get_job for completion
 * - Rules configured on templates are NOT preserved during instantiation via API
 * - Template custom field values may not fully carry over during instantiation
 *
 * @module task-templates
 */
module.exports = (client) => [
  {
    name: 'get_task_template',
    description: 'Get details of a task template by GID. Returns the template configuration including name, description, assignee defaults, and custom field settings. Premium feature — returns error on free plans. Related: list_project_task_templates to discover templates, instantiate_task_template to create a task from it.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_template_gid: { type: 'string', description: 'Task template GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['task_template_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/task_templates/${args.task_template_gid}`, params);
    }
  },
  {
    name: 'list_project_task_templates',
    description: 'List all task templates available in a project. Returns templates that can be instantiated to create standardized tasks. Premium feature. Returns max 100 per page. Related: get_task_template for full details, instantiate_task_template to create a task.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID to list templates from' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, ...params } = args;
      params.project = project_gid;
      return await client.get('/task_templates', params);
    }
  },
  {
    name: 'instantiate_task_template',
    description: 'Create a new task from a task template. Applies all template settings (name, description, assignee, custom fields, etc.). Returns an async Job — use get_job to poll for completion and get the created task GID (job may take seconds). NOTE: Rules and forms associated with the template are NOT applied during API instantiation. You can override the template name with the name parameter. Premium feature. Related: get_task_template to inspect before instantiating, get_job to track progress.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        task_template_gid: { type: 'string', description: 'Task template GID to instantiate' },
        name: { type: 'string', description: 'Override the template name for this instance' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['task_template_gid']
    },
    handler: async (args) => {
      const { task_template_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/task_templates/${task_template_gid}/instantiateTask`, data, { params });
    }
  },
  {
    name: 'delete_task_template',
    description: 'Permanently delete a task template. DESTRUCTIVE: Cannot be undone. Existing tasks previously created from this template are NOT affected. Premium feature. Related: get_task_template, list_project_task_templates.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_template_gid: { type: 'string', description: 'Task template GID to delete' }
      },
      required: ['task_template_gid']
    },
    handler: async (args) => await client.delete(`/task_templates/${args.task_template_gid}`)
  }
];
