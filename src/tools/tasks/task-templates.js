/** Task Templates Tools */
module.exports = (client) => [
  {
    name: 'get_task_template',
    description: 'Get a task template',
    inputSchema: {
      type: 'object',
      properties: {
        task_template_gid: { type: 'string', description: 'Task template GID' }
      },
      required: ['task_template_gid']
    },
    handler: async (args) => await client.get(`/task_templates/${args.task_template_gid}`)
  },
  {
    name: 'list_project_task_templates',
    description: 'Get task templates for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' }
      },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}/task_templates`)
  },
  {
    name: 'instantiate_task_template',
    description: 'Instantiate a task from a template',
    inputSchema: {
      type: 'object',
      properties: {
        task_template_gid: { type: 'string', description: 'Task template GID' },
        name: { type: 'string', description: 'Task name (overrides template)' }
      },
      required: ['task_template_gid']
    },
    handler: async (args) => {
      const { task_template_gid, ...data } = args;
      return await client.post(`/task_templates/${task_template_gid}/instantiateTask`, data);
    }
  },
  {
    name: 'delete_task_template',
    description: 'Delete a task template',
    inputSchema: {
      type: 'object',
      properties: {
        task_template_gid: { type: 'string', description: 'Task template GID' }
      },
      required: ['task_template_gid']
    },
    handler: async (args) => await client.delete(`/task_templates/${args.task_template_gid}`)
  }
];
