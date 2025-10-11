/** Tags Tools - Complete CRUD */
module.exports = (client) => [
  {
    name: 'list_workspace_tags',
    description: 'List tags in a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' }
      },
      required: ['workspace']
    },
    handler: async (args) => await client.get(`/workspaces/${args.workspace}/tags`)
  },
  {
    name: 'create_tag',
    description: 'Create a tag',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        name: { type: 'string', description: 'Tag name' },
        color: { type: 'string', description: 'Tag color' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => await client.post('/tags', args)
  },
  {
    name: 'get_tag',
    description: 'Get tag details',
    inputSchema: {
      type: 'object',
      properties: {
        tag_gid: { type: 'string', description: 'Tag GID' }
      },
      required: ['tag_gid']
    },
    handler: async (args) => await client.get(`/tags/${args.tag_gid}`)
  },
  {
    name: 'update_tag',
    description: 'Update a tag',
    inputSchema: {
      type: 'object',
      properties: {
        tag_gid: { type: 'string', description: 'Tag GID' },
        name: { type: 'string', description: 'New tag name' },
        color: { type: 'string', description: 'New tag color' }
      },
      required: ['tag_gid']
    },
    handler: async (args) => {
      const { tag_gid, ...data } = args;
      return await client.put(`/tags/${tag_gid}`, data);
    }
  },
  {
    name: 'delete_tag',
    description: 'Delete a tag',
    inputSchema: {
      type: 'object',
      properties: {
        tag_gid: { type: 'string', description: 'Tag GID' }
      },
      required: ['tag_gid']
    },
    handler: async (args) => await client.delete(`/tags/${args.tag_gid}`)
  },
  {
    name: 'get_task_tags',
    description: 'Get tags on a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' }
      },
      required: ['task_gid']
    },
    handler: async (args) => await client.get(`/tasks/${args.task_gid}/tags`)
  }
];
