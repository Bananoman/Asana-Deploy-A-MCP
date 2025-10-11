/** Task Tools - Complete CRUD + Advanced Operations */
module.exports = (client) => [
  // Basic CRUD
  {
    name: 'list_tasks',
    description: 'List tasks in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string' },
        limit: { type: 'number', default: 20 }
      },
      required: ['project']
    },
    handler: async (args) => await client.get('/tasks', { project: args.project, limit: args.limit || 20 })
  },
  {
    name: 'get_task',
    description: 'Get task details',
    inputSchema: {
      type: 'object',
      properties: { task_gid: { type: 'string' } },
      required: ['task_gid']
    },
    handler: async (args) => await client.get(`/tasks/${args.task_gid}`)
  },
  {
    name: 'create_task',
    description: 'Create a new task',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string' },
        name: { type: 'string' },
        notes: { type: 'string' },
        projects: { type: 'array', items: { type: 'string' } }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => await client.post('/tasks', args)
  },
  {
    name: 'update_task',
    description: 'Update a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string' },
        name: { type: 'string' },
        notes: { type: 'string' },
        completed: { type: 'boolean' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, ...data } = args;
      return await client.put(`/tasks/${task_gid}`, data);
    }
  },
  {
    name: 'delete_task',
    description: 'Delete a task',
    inputSchema: {
      type: 'object',
      properties: { task_gid: { type: 'string' } },
      required: ['task_gid']
    },
    handler: async (args) => await client.delete(`/tasks/${args.task_gid}`)
  },

  // Subtasks
  {
    name: 'get_task_subtasks',
    description: 'Get subtasks of a task',
    inputSchema: {
      type: 'object',
      properties: { task_gid: { type: 'string' } },
      required: ['task_gid']
    },
    handler: async (args) => await client.get(`/tasks/${args.task_gid}/subtasks`)
  },
  {
    name: 'create_subtask',
    description: 'Create a subtask',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Parent task GID' },
        name: { type: 'string', description: 'Subtask name' }
      },
      required: ['task_gid', 'name']
    },
    handler: async (args) => {
      const { task_gid, name } = args;
      return await client.post(`/tasks/${task_gid}/subtasks`, { name });
    }
  },

  // Task-Project Relationships
  {
    name: 'add_task_to_project',
    description: 'Add a task to a project',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string' },
        project: { type: 'string' }
      },
      required: ['task_gid', 'project']
    },
    handler: async (args) => {
      const { task_gid, project } = args;
      return await client.post(`/tasks/${task_gid}/addProject`, { project });
    }
  },
  {
    name: 'remove_task_from_project',
    description: 'Remove a task from a project',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string' },
        project: { type: 'string' }
      },
      required: ['task_gid', 'project']
    },
    handler: async (args) => {
      const { task_gid, project } = args;
      return await client.post(`/tasks/${task_gid}/removeProject`, { project });
    }
  },

  // Dependencies
  {
    name: 'get_task_dependencies',
    description: 'Get task dependencies',
    inputSchema: {
      type: 'object',
      properties: { task_gid: { type: 'string' } },
      required: ['task_gid']
    },
    handler: async (args) => await client.get(`/tasks/${args.task_gid}/dependencies`)
  },
  {
    name: 'add_task_dependencies',
    description: 'Add dependencies to a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string' },
        dependencies: { type: 'array', items: { type: 'string' } }
      },
      required: ['task_gid', 'dependencies']
    },
    handler: async (args) => {
      const { task_gid, dependencies } = args;
      return await client.post(`/tasks/${task_gid}/addDependencies`, { dependencies });
    }
  },
  {
    name: 'remove_task_dependencies',
    description: 'Remove dependencies from a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string' },
        dependencies: { type: 'array', items: { type: 'string' } }
      },
      required: ['task_gid', 'dependencies']
    },
    handler: async (args) => {
      const { task_gid, dependencies } = args;
      return await client.post(`/tasks/${task_gid}/removeDependencies`, { dependencies });
    }
  },

  // Search
  {
    name: 'search_tasks',
    description: 'Search tasks in workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string' },
        text: { type: 'string', description: 'Search text' }
      },
      required: ['workspace']
    },
    handler: async (args) => {
      const params = { workspace: args.workspace };
      if (args.text) params.text = args.text;
      return await client.get('/tasks/search', params);
    }
  },

  // Duplicate
  {
    name: 'duplicate_task',
    description: 'Duplicate a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string' },
        name: { type: 'string', description: 'Name for duplicated task' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, name } = args;
      const data = name ? { name } : {};
      return await client.post(`/tasks/${task_gid}/duplicate`, data);
    }
  }
];
