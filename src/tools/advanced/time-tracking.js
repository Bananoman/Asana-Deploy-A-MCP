/** Time Tracking Tools */
module.exports = (client) => [
  {
    name: 'get_time_tracking_entry',
    description: 'Get a time tracking entry',
    inputSchema: {
      type: 'object',
      properties: {
        time_tracking_entry_gid: { type: 'string', description: 'Time tracking entry GID' }
      },
      required: ['time_tracking_entry_gid']
    },
    handler: async (args) => await client.get(`/time_tracking_entries/${args.time_tracking_entry_gid}`)
  },
  {
    name: 'update_time_tracking_entry',
    description: 'Update a time tracking entry',
    inputSchema: {
      type: 'object',
      properties: {
        time_tracking_entry_gid: { type: 'string', description: 'Time tracking entry GID' },
        duration_minutes: { type: 'number', description: 'Duration in minutes' },
        notes: { type: 'string', description: 'Notes for the entry' }
      },
      required: ['time_tracking_entry_gid']
    },
    handler: async (args) => {
      const { time_tracking_entry_gid, ...data } = args;
      return await client.put(`/time_tracking_entries/${time_tracking_entry_gid}`, data);
    }
  },
  {
    name: 'delete_time_tracking_entry',
    description: 'Delete a time tracking entry',
    inputSchema: {
      type: 'object',
      properties: {
        time_tracking_entry_gid: { type: 'string', description: 'Time tracking entry GID' }
      },
      required: ['time_tracking_entry_gid']
    },
    handler: async (args) => await client.delete(`/time_tracking_entries/${args.time_tracking_entry_gid}`)
  },
  {
    name: 'list_task_time_tracking_entries',
    description: 'Get time tracking entries for a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' }
      },
      required: ['task_gid']
    },
    handler: async (args) => await client.get(`/tasks/${args.task_gid}/time_tracking_entries`)
  },
  {
    name: 'create_time_tracking_entry',
    description: 'Create a time tracking entry for a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        duration_minutes: { type: 'number', description: 'Duration in minutes' },
        notes: { type: 'string', description: 'Notes for the entry' },
        started_on: { type: 'string', description: 'Date started (YYYY-MM-DD)' }
      },
      required: ['task_gid', 'duration_minutes']
    },
    handler: async (args) => {
      const { task_gid, ...data } = args;
      return await client.post(`/tasks/${task_gid}/time_tracking_entries`, data);
    }
  },
  {
    name: 'create_standalone_time_tracking_entry',
    description: 'Create a standalone time tracking entry',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task GID' },
        duration_minutes: { type: 'number', description: 'Duration in minutes' },
        notes: { type: 'string', description: 'Notes for the entry' },
        started_on: { type: 'string', description: 'Date started (YYYY-MM-DD)' }
      },
      required: ['task', 'duration_minutes']
    },
    handler: async (args) => await client.post('/time_tracking_entries', args)
  }
];
