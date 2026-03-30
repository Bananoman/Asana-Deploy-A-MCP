/**
 * External Data Tools - Link external system references to Asana tasks
 *
 * Each task supports a single `external` field containing an ID (gid) and data string.
 * Used for integrating external systems (CRMs, issue trackers, databases) with Asana.
 *
 * Key constraints:
 * - Each task can have only ONE external reference — setting a new one replaces the old
 * - external.gid must be unique across all tasks in the workspace
 * - external.data max length: 16384 characters (use JSON.stringify for structured data)
 * - Requires OAuth authentication (not available with Personal Access Tokens in all cases)
 *
 * @module external-data
 */
module.exports = (client) => [
  {
    name: 'attach_external_data',
    description: 'Attach external system data to an Asana task. Sets the task external field with an ID and optional data string. CONSTRAINTS: Each task can have only ONE external reference — this overwrites any existing one. The external_gid must be unique across all tasks in the workspace. Max data length: 16384 characters (use JSON.stringify for structured data). Related: get_external_data, update_external_data, delete_external_data.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to attach external data to' },
        external_gid: { type: 'string', description: 'Unique ID in the external system (must be unique across workspace)' },
        external_data: { type: 'string', description: 'String data from the external system (max 16384 characters). Use JSON.stringify for structured data.' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['task_gid', 'external_gid']
    },
    handler: async (args) => {
      const { task_gid, external_gid, external_data, opt_fields } = args;
      const external = { gid: external_gid };
      if (external_data !== undefined) external.data = external_data;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/tasks/${task_gid}`, { external }, { params });
    }
  },
  {
    name: 'get_external_data',
    description: 'Get external data attached to an Asana task. Returns the external field containing gid and data. Returns null if no external data is set. Related: attach_external_data, delete_external_data.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to read external data from' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      return await client.get(`/tasks/${args.task_gid}`, { opt_fields: 'external,external.data' });
    }
  },
  {
    name: 'update_external_data',
    description: 'Update external data on an Asana task. Replaces the external field gid and/or data. The external_gid must remain unique across all workspace tasks. Related: get_external_data, attach_external_data.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to update external data on' },
        external_gid: { type: 'string', description: 'External ID (must match existing or be new unique ID)' },
        external_data: { type: 'string', description: 'New data string (max 16384 characters)' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, external_gid, external_data, opt_fields } = args;
      const external = {};
      if (external_gid !== undefined) external.gid = external_gid;
      if (external_data !== undefined) external.data = external_data;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/tasks/${task_gid}`, { external }, { params });
    }
  },
  {
    name: 'delete_external_data',
    description: 'Remove external data from an Asana task by setting the external field to null. The task itself is not affected. Related: get_external_data, attach_external_data.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to remove external data from' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      // Clear external data by setting external to null
      return await client.put(`/tasks/${args.task_gid}`, { external: null });
    }
  },
  {
    name: 'list_external_data_for_resource',
    description: 'Get external data for a task. Returns the external field containing gid and data string. Functionally identical to get_external_data — use either one. Related: attach_external_data.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to read external data from' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      return await client.get(`/tasks/${args.task_gid}`, { opt_fields: 'external,external.data' });
    }
  },
  {
    name: 'sync_external_data',
    description: 'Read the current external data on a task. Since Asana stores external data passively, "sync" means reading the current state. To update, use attach_external_data or update_external_data. Functionally identical to get_external_data. Related: get_external_data, attach_external_data.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to read external data from' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      return await client.get(`/tasks/${args.task_gid}`, { opt_fields: 'external,external.data' });
    }
  }
];
