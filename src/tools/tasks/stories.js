/** Stories (Comments) Tools */
module.exports = (client) => [
  {
    name: 'get_task_stories',
    description: 'Get stories (comments/updates) for a task',
    inputSchema: {
      type: 'object',
      properties: { task_gid: { type: 'string' } },
      required: ['task_gid']
    },
    handler: async (args) => await client.get(`/tasks/${args.task_gid}/stories`)
  },
  {
    name: 'add_task_comment',
    description: 'Add a comment to a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string' },
        text: { type: 'string', description: 'Comment text' }
      },
      required: ['task_gid', 'text']
    },
    handler: async (args) => {
      const { task_gid, text } = args;
      return await client.post(`/tasks/${task_gid}/stories`, { text });
    }
  },
  {
    name: 'get_story',
    description: 'Get a specific story/comment',
    inputSchema: {
      type: 'object',
      properties: { story_gid: { type: 'string' } },
      required: ['story_gid']
    },
    handler: async (args) => await client.get(`/stories/${args.story_gid}`)
  },
  {
    name: 'update_story',
    description: 'Update a story/comment',
    inputSchema: {
      type: 'object',
      properties: {
        story_gid: { type: 'string' },
        text: { type: 'string' }
      },
      required: ['story_gid', 'text']
    },
    handler: async (args) => {
      const { story_gid, text } = args;
      return await client.put(`/stories/${story_gid}`, { text });
    }
  },
  {
    name: 'delete_story',
    description: 'Delete a story/comment',
    inputSchema: {
      type: 'object',
      properties: { story_gid: { type: 'string' } },
      required: ['story_gid']
    },
    handler: async (args) => await client.delete(`/stories/${args.story_gid}`)
  }
];
