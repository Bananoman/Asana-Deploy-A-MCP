/** Section Tools - Complete CRUD + Operations */
module.exports = (client) => [
  {
    name: 'list_sections',
    description: 'List sections in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' }
      },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}/sections`)
  },
  {
    name: 'get_section',
    description: 'Get a section by GID',
    inputSchema: {
      type: 'object',
      properties: { section_gid: { type: 'string' } },
      required: ['section_gid']
    },
    handler: async (args) => await client.get(`/sections/${args.section_gid}`)
  },
  {
    name: 'create_section',
    description: 'Create a section in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        name: { type: 'string', description: 'Section name' }
      },
      required: ['project_gid', 'name']
    },
    handler: async (args) => {
      const { project_gid, name } = args;
      return await client.post(`/projects/${project_gid}/sections`, { name });
    }
  },
  {
    name: 'update_section',
    description: 'Update a section',
    inputSchema: {
      type: 'object',
      properties: {
        section_gid: { type: 'string' },
        name: { type: 'string' }
      },
      required: ['section_gid']
    },
    handler: async (args) => {
      const { section_gid, ...data } = args;
      return await client.put(`/sections/${section_gid}`, data);
    }
  },
  {
    name: 'delete_section',
    description: 'Delete a section',
    inputSchema: {
      type: 'object',
      properties: { section_gid: { type: 'string' } },
      required: ['section_gid']
    },
    handler: async (args) => await client.delete(`/sections/${args.section_gid}`)
  },
  {
    name: 'add_task_to_section',
    description: 'Add a task to a section',
    inputSchema: {
      type: 'object',
      properties: {
        section_gid: { type: 'string' },
        task: { type: 'string', description: 'Task GID' }
      },
      required: ['section_gid', 'task']
    },
    handler: async (args) => {
      const { section_gid, task } = args;
      return await client.post(`/sections/${section_gid}/addTask`, { task });
    }
  }
];
