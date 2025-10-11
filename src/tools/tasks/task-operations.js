/** Additional Task Operations - Tags, Dependents, Parent, Followers */
module.exports = (client) => [
  {
    name: 'get_task_dependents',
    description: 'Get tasks that depend on this task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' }
      },
      required: ['task_gid']
    },
    handler: async (args) => await client.get(`/tasks/${args.task_gid}/dependents`)
  },
  {
    name: 'add_task_dependents',
    description: 'Add tasks as dependents (tasks that depend on this task)',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        dependents: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs that will depend on this task'
        }
      },
      required: ['task_gid', 'dependents']
    },
    handler: async (args) => {
      const { task_gid, dependents } = args;
      return await client.post(`/tasks/${task_gid}/addDependents`, { dependents });
    }
  },
  {
    name: 'remove_task_dependents',
    description: 'Remove dependent tasks',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        dependents: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs to remove as dependents'
        }
      },
      required: ['task_gid', 'dependents']
    },
    handler: async (args) => {
      const { task_gid, dependents } = args;
      return await client.post(`/tasks/${task_gid}/removeDependents`, { dependents });
    }
  },
  {
    name: 'set_task_parent',
    description: 'Set parent task (make this task a subtask)',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        parent: { type: 'string', description: 'Parent task GID (null to remove parent)' }
      },
      required: ['task_gid', 'parent']
    },
    handler: async (args) => {
      const { task_gid, parent } = args;
      return await client.post(`/tasks/${task_gid}/setParent`, { parent });
    }
  },
  {
    name: 'add_task_tag',
    description: 'Add a tag to a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        tag: { type: 'string', description: 'Tag GID' }
      },
      required: ['task_gid', 'tag']
    },
    handler: async (args) => {
      const { task_gid, tag } = args;
      return await client.post(`/tasks/${task_gid}/addTag`, { tag });
    }
  },
  {
    name: 'remove_task_tag',
    description: 'Remove a tag from a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        tag: { type: 'string', description: 'Tag GID' }
      },
      required: ['task_gid', 'tag']
    },
    handler: async (args) => {
      const { task_gid, tag } = args;
      return await client.post(`/tasks/${task_gid}/removeTag`, { tag });
    }
  },
  {
    name: 'add_task_followers',
    description: 'Add followers to a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to add as followers'
        }
      },
      required: ['task_gid', 'followers']
    },
    handler: async (args) => {
      const { task_gid, followers } = args;
      return await client.post(`/tasks/${task_gid}/addFollowers`, { followers });
    }
  },
  {
    name: 'remove_task_followers',
    description: 'Remove followers from a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to remove as followers'
        }
      },
      required: ['task_gid', 'followers']
    },
    handler: async (args) => {
      const { task_gid, followers } = args;
      return await client.post(`/tasks/${task_gid}/removeFollowers`, { followers });
    }
  }
];
