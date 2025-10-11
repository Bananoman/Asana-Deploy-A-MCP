/** User Task Lists Tools */
module.exports = (client) => [
  {
    name: 'get_user_task_list',
    description: 'Get a user task list',
    inputSchema: {
      type: 'object',
      properties: {
        user_task_list_gid: { type: 'string', description: 'User task list GID' }
      },
      required: ['user_task_list_gid']
    },
    handler: async (args) => await client.get(`/user_task_lists/${args.user_task_list_gid}`)
  },
  {
    name: 'get_user_task_list_for_user',
    description: 'Get user task list for a user',
    inputSchema: {
      type: 'object',
      properties: {
        user_gid: { type: 'string', description: 'User GID' },
        workspace: { type: 'string', description: 'Workspace GID' }
      },
      required: ['user_gid', 'workspace']
    },
    handler: async (args) => await client.get(`/users/${args.user_gid}/user_task_list`, {
      workspace: args.workspace
    })
  },
  {
    name: 'list_user_task_list_tasks',
    description: 'Get tasks from a user task list',
    inputSchema: {
      type: 'object',
      properties: {
        user_task_list_gid: { type: 'string', description: 'User task list GID' }
      },
      required: ['user_task_list_gid']
    },
    handler: async (args) => await client.get(`/user_task_lists/${args.user_task_list_gid}/tasks`)
  }
];
