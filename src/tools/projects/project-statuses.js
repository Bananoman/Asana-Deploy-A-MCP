/** Project Statuses Tools */
module.exports = (client) => [
  {
    name: 'get_project_status',
    description: 'Get a project status',
    inputSchema: {
      type: 'object',
      properties: {
        project_status_gid: { type: 'string', description: 'Project status GID' }
      },
      required: ['project_status_gid']
    },
    handler: async (args) => await client.get(`/project_statuses/${args.project_status_gid}`)
  },
  {
    name: 'delete_project_status',
    description: 'Delete a project status',
    inputSchema: {
      type: 'object',
      properties: {
        project_status_gid: { type: 'string', description: 'Project status GID' }
      },
      required: ['project_status_gid']
    },
    handler: async (args) => await client.delete(`/project_statuses/${args.project_status_gid}`)
  },
  {
    name: 'list_project_statuses',
    description: 'Get project statuses for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' }
      },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}/project_statuses`)
  },
  {
    name: 'create_project_status',
    description: 'Create a project status',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        text: { type: 'string', description: 'Status text' },
        color: {
          type: 'string',
          description: 'Status color: green, yellow, red, blue',
          enum: ['green', 'yellow', 'red', 'blue']
        },
        title: { type: 'string', description: 'Status title' }
      },
      required: ['project_gid', 'text', 'color']
    },
    handler: async (args) => {
      const { project_gid, ...data } = args;
      return await client.post(`/projects/${project_gid}/project_statuses`, data);
    }
  }
];
