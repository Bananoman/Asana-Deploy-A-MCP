/**
 * Custom Objects Tools - Define and manage custom record types
 *
 * Custom objects allow creating entirely new data types beyond tasks and projects,
 * with their own fields and records. Enterprise-only beta feature.
 *
 * Plan requirements: Enterprise only (beta feature — availability may vary)
 *
 * Key constraints:
 * - Enterprise plan required — returns error on lower plans
 * - Beta feature: API surface may change
 * - Deleting a custom object type deletes ALL its records
 * - Records are workspace-scoped
 *
 * @module custom-objects
 */
module.exports = (client) => [
  {
    name: 'list_custom_objects',
    description: 'List custom object type definitions in a workspace. Custom objects are user-defined data types beyond tasks/projects with their own fields and records. Enterprise only (beta). Returns max 100 per page. Related: get_custom_object, create_custom_object.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Fields to include' }
      },
      required: ['workspace']
    },
    handler: async (args) => {
      const { workspace, ...params } = args;
      params.workspace = workspace;
      return await client.get('/custom_objects', params);
    }
  },
  {
    name: 'get_custom_object',
    description: 'Get a custom object type definition by GID. Returns name, description, and field configuration. Enterprise only (beta). Related: list_custom_objects, list_custom_object_records to see records of this type.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        custom_object_gid: { type: 'string', description: 'Custom object GID' },
        opt_fields: { type: 'string', description: 'Fields to include' }
      },
      required: ['custom_object_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/custom_objects/${args.custom_object_gid}`, params);
    }
  },
  {
    name: 'create_custom_object',
    description: 'Create a new custom object type in a workspace. Defines a new record type with its own name and field configuration. Enterprise only (beta). Related: list_custom_objects, create_custom_object_record to add records.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        name: { type: 'string', description: 'Object type name' },
        description: { type: 'string', description: 'Object type description' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => {
      const { opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/custom_objects', data, { params });
    }
  },
  {
    name: 'update_custom_object',
    description: 'Update a custom object type definition (name, description). Enterprise only (beta). Related: get_custom_object, delete_custom_object.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        custom_object_gid: { type: 'string', description: 'Custom object GID' },
        name: { type: 'string', description: 'New name' },
        description: { type: 'string', description: 'New description' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['custom_object_gid']
    },
    handler: async (args) => {
      const { custom_object_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/custom_objects/${custom_object_gid}`, data, { params });
    }
  },
  {
    name: 'delete_custom_object',
    description: 'Permanently delete a custom object type and ALL its records. DESTRUCTIVE: Cannot be undone — all records of this type are permanently lost. Enterprise only (beta). Related: get_custom_object.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: { custom_object_gid: { type: 'string', description: 'Custom object GID to delete' } },
      required: ['custom_object_gid']
    },
    handler: async (args) => await client.delete(`/custom_objects/${args.custom_object_gid}`)
  },
  {
    name: 'list_custom_object_records',
    description: 'List all records of a custom object type. Returns record names and field values. Enterprise only (beta). Returns max 100 per page. Related: create_custom_object_record, get_custom_object_record.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        custom_object_gid: { type: 'string', description: 'Custom object GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Fields to include' }
      },
      required: ['custom_object_gid']
    },
    handler: async (args) => {
      const { custom_object_gid, ...params } = args;
      return await client.get(`/custom_objects/${custom_object_gid}/records`, params);
    }
  },
  {
    name: 'create_custom_object_record',
    description: 'Create a new record for a custom object type. Provide field values through custom_fields map (GID → value). Enterprise only (beta). Related: list_custom_object_records, get_custom_object_record.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        custom_object_gid: { type: 'string', description: 'Custom object GID' },
        name: { type: 'string', description: 'Record name' },
        custom_fields: { type: 'object', description: 'Map of field GID to value' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['custom_object_gid', 'name']
    },
    handler: async (args) => {
      const { custom_object_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/custom_objects/${custom_object_gid}/records`, data, { params });
    }
  },
  {
    name: 'get_custom_object_record',
    description: 'Get a single custom object record by GID. Returns record name and field values. Enterprise only (beta). Related: list_custom_object_records.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        record_gid: { type: 'string', description: 'Record GID' },
        opt_fields: { type: 'string', description: 'Fields to include' }
      },
      required: ['record_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/custom_object_records/${args.record_gid}`, params);
    }
  }
];
