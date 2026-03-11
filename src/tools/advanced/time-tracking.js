/**
 * Time Tracking Tools - Log and manage time entries on tasks
 *
 * Time tracking allows users to log hours worked on tasks with optional notes and dates.
 *
 * Plan requirements: Business or Enterprise (not available on Free or Premium)
 * Requires scope: time_tracking_entries:read for viewing
 *
 * Key constraints:
 * - duration_minutes is the standard unit (integer, minutes)
 * - entered_on defaults to today if not specified (format: YYYY-MM-DD)
 * - Each entry is associated with a single task and a single user (created_by)
 * - Time entries cannot be bulk-created — use individual calls
 *
 * @module time-tracking
 */
module.exports = (client) => [
  {
    name: 'get_time_tracking_entry',
    description: 'Get details of a time tracking entry by GID. Returns duration (in minutes), date worked, notes, task, and creator. Business/Enterprise feature — returns error on lower plans. Related: list_task_time_tracking_entries, update_time_tracking_entry.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        time_tracking_entry_gid: { type: 'string', description: 'Time tracking entry GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "duration_minutes,entered_on,notes,task.name,created_by.name"' }
      },
      required: ['time_tracking_entry_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/time_tracking_entries/${args.time_tracking_entry_gid}`, params);
    }
  },
  {
    name: 'update_time_tracking_entry',
    description: 'Update a time tracking entry (duration, notes, date). Only the entry creator or an admin can update entries. Business/Enterprise feature. Related: get_time_tracking_entry, delete_time_tracking_entry.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        time_tracking_entry_gid: { type: 'string', description: 'Entry GID to update' },
        duration_minutes: { type: 'number', description: 'New duration in minutes' },
        notes: { type: 'string', description: 'Updated notes' },
        entered_on: { type: 'string', description: 'Date the time was worked (YYYY-MM-DD)' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['time_tracking_entry_gid']
    },
    handler: async (args) => {
      const { time_tracking_entry_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/time_tracking_entries/${time_tracking_entry_gid}`, data, { params });
    }
  },
  {
    name: 'delete_time_tracking_entry',
    description: 'Delete a time tracking entry. DESTRUCTIVE: Cannot be undone. Only the entry creator or an admin can delete entries. Business/Enterprise feature. Related: get_time_tracking_entry.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: { time_tracking_entry_gid: { type: 'string', description: 'Entry GID to delete' } },
      required: ['time_tracking_entry_gid']
    },
    handler: async (args) => await client.delete(`/time_tracking_entries/${args.time_tracking_entry_gid}`)
  },
  {
    name: 'list_task_time_tracking_entries',
    description: 'List all time tracking entries for a task. Shows who logged time, duration in minutes, dates, and notes. Returns max 100 per page. Business/Enterprise feature. Related: create_time_tracking_entry to log time, get_time_tracking_entry for details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Example: "duration_minutes,entered_on,notes,created_by.name"' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, ...params } = args;
      return await client.get(`/tasks/${task_gid}/time_tracking_entries`, params);
    }
  },
  {
    name: 'create_time_tracking_entry',
    description: 'Log time on a task. Specify duration_minutes (required) and optionally entered_on date (YYYY-MM-DD, defaults to today) and notes. The entry is attributed to the authenticated user. Business/Enterprise feature. Related: list_task_time_tracking_entries, update_time_tracking_entry.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to log time on' },
        duration_minutes: { type: 'number', description: 'Time spent in minutes' },
        notes: { type: 'string', description: 'Description of work done' },
        entered_on: { type: 'string', description: 'Date worked (YYYY-MM-DD, defaults to today)' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['task_gid', 'duration_minutes']
    },
    handler: async (args) => {
      const { task_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/tasks/${task_gid}/time_tracking_entries`, data, { params });
    }
  },
  {
    name: 'create_standalone_time_tracking_entry',
    description: 'Create a time tracking entry by specifying the task GID. Functionally equivalent to create_time_tracking_entry but accepts the task as a parameter rather than requiring it in context. Business/Enterprise feature. Related: create_time_tracking_entry (task-scoped version).',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to log time on' },
        duration_minutes: { type: 'number', description: 'Time in minutes' },
        notes: { type: 'string', description: 'Description of work' },
        entered_on: { type: 'string', description: 'Date worked (YYYY-MM-DD)' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['task_gid', 'duration_minutes']
    },
    handler: async (args) => {
      const { task_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/tasks/${task_gid}/time_tracking_entries`, data, { params });
    }
  }
];
