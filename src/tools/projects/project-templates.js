/** Project Templates Tools */
module.exports = (client) => [
  {
    name: 'get_project_template',
    description: 'Get a project template',
    inputSchema: {
      type: 'object',
      properties: {
        project_template_gid: { type: 'string', description: 'Project template GID' }
      },
      required: ['project_template_gid']
    },
    handler: async (args) => await client.get(`/project_templates/${args.project_template_gid}`)
  },
  {
    name: 'list_team_project_templates',
    description: 'Get project templates for a team',
    inputSchema: {
      type: 'object',
      properties: {
        team_gid: { type: 'string', description: 'Team GID' }
      },
      required: ['team_gid']
    },
    handler: async (args) => await client.get(`/teams/${args.team_gid}/project_templates`)
  },
  {
    name: 'instantiate_project_template',
    description: 'Instantiate a project from a template',
    inputSchema: {
      type: 'object',
      properties: {
        project_template_gid: { type: 'string', description: 'Project template GID' },
        name: { type: 'string', description: 'Project name' },
        team: { type: 'string', description: 'Team GID' },
        workspace: { type: 'string', description: 'Workspace GID' },
        public: { type: 'boolean', description: 'Is project public' }
      },
      required: ['project_template_gid', 'name']
    },
    handler: async (args) => {
      const { project_template_gid, ...data } = args;
      return await client.post(`/project_templates/${project_template_gid}/instantiateProject`, data);
    }
  },
  {
    name: 'list_workspace_project_templates',
    description: 'Get project templates for a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID' }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => await client.get(`/workspaces/${args.workspace_gid}/project_templates`)
  }
];
