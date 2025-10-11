/** Reactions Tools */
module.exports = (client) => [
  {
    name: 'list_task_reactions',
    description: 'Get reactions on a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' }
      },
      required: ['task_gid']
    },
    handler: async (args) => await client.get(`/tasks/${args.task_gid}/reactions`)
  },
  {
    name: 'create_task_reaction',
    description: 'Add a reaction to a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        emoji: { type: 'string', description: 'Emoji for reaction (e.g., thumbsup, heart)' }
      },
      required: ['task_gid', 'emoji']
    },
    handler: async (args) => {
      const { task_gid, emoji } = args;
      return await client.post(`/tasks/${task_gid}/reactions`, { emoji });
    }
  },
  {
    name: 'delete_reaction',
    description: 'Delete a reaction',
    inputSchema: {
      type: 'object',
      properties: {
        reaction_gid: { type: 'string', description: 'Reaction GID' }
      },
      required: ['reaction_gid']
    },
    handler: async (args) => await client.delete(`/reactions/${args.reaction_gid}`)
  },
  {
    name: 'get_reaction',
    description: 'Get a reaction',
    inputSchema: {
      type: 'object',
      properties: {
        reaction_gid: { type: 'string', description: 'Reaction GID' }
      },
      required: ['reaction_gid']
    },
    handler: async (args) => await client.get(`/reactions/${args.reaction_gid}`)
  }
];
