/** Project Tools - Complete CRUD + Operations */
module.exports = (client) => [
  {
    name: 'list_projects',
    description: 'List projects in a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        limit: { type: 'number', description: 'Results per page', default: 20 }
      },
      required: ['workspace']
    },
    handler: async (args) => await client.get('/projects', { workspace: args.workspace, limit: args.limit || 20 })
  },
  {
    name: 'get_project',
    description: 'Get project details',
    inputSchema: {
      type: 'object',
      properties: { project_gid: { type: 'string' } },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}`)
  },
  {
    name: 'create_project',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string' },
        name: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => await client.post('/projects', args)
  },
  {
    name: 'update_project',
    description: 'Update a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string' },
        name: { type: 'string' },
        notes: { type: 'string' },
        archived: { type: 'boolean' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, ...data } = args;
      return await client.put(`/projects/${project_gid}`, data);
    }
  },
  {
    name: 'delete_project',
    description: 'Delete a project',
    inputSchema: {
      type: 'object',
      properties: { project_gid: { type: 'string' } },
      required: ['project_gid']
    },
    handler: async (args) => await client.delete(`/projects/${args.project_gid}`)
  },
  {
    name: 'duplicate_project',
    description: 'Duplicate a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string' },
        name: { type: 'string', description: 'Name for duplicated project' }
      },
      required: ['project_gid', 'name']
    },
    handler: async (args) => {
      const { project_gid, name } = args;
      return await client.post(`/projects/${project_gid}/duplicate`, { name });
    }
  },
  {
    name: 'get_project_sections',
    description: 'Get sections in a project',
    inputSchema: {
      type: 'object',
      properties: { project_gid: { type: 'string' } },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}/sections`)
  }
];
