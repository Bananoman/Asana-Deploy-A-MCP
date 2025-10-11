/** Project Briefs Tools */
module.exports = (client) => [
  {
    name: 'get_project_brief',
    description: 'Get a project brief',
    inputSchema: {
      type: 'object',
      properties: {
        project_brief_gid: { type: 'string', description: 'Project brief GID' }
      },
      required: ['project_brief_gid']
    },
    handler: async (args) => await client.get(`/project_briefs/${args.project_brief_gid}`)
  },
  {
    name: 'update_project_brief',
    description: 'Update a project brief',
    inputSchema: {
      type: 'object',
      properties: {
        project_brief_gid: { type: 'string', description: 'Project brief GID' },
        title: { type: 'string', description: 'Brief title' },
        html_text: { type: 'string', description: 'Brief HTML content' }
      },
      required: ['project_brief_gid']
    },
    handler: async (args) => {
      const { project_brief_gid, ...data } = args;
      return await client.put(`/project_briefs/${project_brief_gid}`, data);
    }
  },
  {
    name: 'delete_project_brief',
    description: 'Delete a project brief',
    inputSchema: {
      type: 'object',
      properties: {
        project_brief_gid: { type: 'string', description: 'Project brief GID' }
      },
      required: ['project_brief_gid']
    },
    handler: async (args) => await client.delete(`/project_briefs/${args.project_brief_gid}`)
  },
  {
    name: 'create_project_brief',
    description: 'Create a project brief',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        title: { type: 'string', description: 'Brief title' },
        html_text: { type: 'string', description: 'Brief HTML content' }
      },
      required: ['project_gid', 'title']
    },
    handler: async (args) => {
      const { project_gid, ...data } = args;
      return await client.post(`/projects/${project_gid}/project_briefs`, data);
    }
  }
];
