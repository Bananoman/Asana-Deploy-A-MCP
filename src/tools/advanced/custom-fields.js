/**
 * Custom Field Tools - CRUD + Enum Options + Value Setting
 *
 * Custom fields extend tasks with structured data beyond the built-in fields.
 * Types: text, enum, multi_enum, number, date, people, formula (read-only), custom_id (read-only).
 *
 * Plan requirements: Premium or higher
 *
 * Key constraints:
 * - Formula and custom_id fields are READ-ONLY — cannot be set or created via API
 * - Cannot change a field's type (resource_subtype) after creation
 * - Max 500 enum options per field
 * - Text field values: max 1024 characters
 * - For enum fields, use the enum_option GID (not name) when setting values
 * - Number format options: none, currency (requires currency_code), percentage
 * - Number precision: 0-6 decimal places
 * - Fields must be added to projects separately via add_project_custom_field_setting
 * - Locked fields (locked by admins) are read-only for non-admin users
 *
 * @module custom-fields
 */
module.exports = (client) => [
  {
    name: 'list_custom_fields',
    description: 'List all custom fields in a workspace. Returns field definitions with types, enum options, and settings. Types: text, enum, multi_enum, number, date, people, formula (read-only), custom_id (read-only). Use this to discover available fields before setting values on tasks. Premium feature. Returns max 100 per page. Related: get_custom_field for full details, create_custom_field, list_project_custom_field_settings for project-specific fields.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,resource_subtype,enum_options,enum_options.name,enum_options.color,description"' }
      },
      required: ['workspace']
    },
    handler: async (args) => {
      const { workspace, ...params } = args;
      return await client.get(`/workspaces/${workspace}/custom_fields`, params);
    }
  },
  {
    name: 'get_custom_field',
    description: 'Get a custom field definition by GID. Returns full config including type, enum options (with GIDs needed for setting values), number precision, currency code, and description. IMPORTANT: For enum fields, use the enum_option GID (not the option name) when setting values via set_custom_field_value or update_task. Premium feature. Related: list_custom_fields, set_custom_field_value.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        custom_field_gid: { type: 'string', description: 'Custom field GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,resource_subtype,enum_options,enum_options.name,enum_options.enabled,description,precision,currency_code"' }
      },
      required: ['custom_field_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/custom_fields/${args.custom_field_gid}`, params);
    }
  },
  {
    name: 'create_custom_field',
    description: 'Create a custom field (text, number, date, single-select dropdown, multi-select, people picker) at workspace level — use for "create a custom field Effort points", "add a Priority dropdown". Direct action — pass workspace by GID; do NOT call list_workspaces or list_custom_fields first. Types: text, enum (single dropdown), multi_enum (multi-select), number, date, people. Cannot create formula or custom_id fields via API (UI only). Field type CANNOT be changed after creation. For enum/multi_enum pass enum_options array. For number set precision (0-6), currency_code (ISO 4217), format (none/currency/percentage). Field must be attached to projects separately via add_project_custom_field_setting. Premium feature. Related: create_enum_custom_field (shortcut for enum), add_project_custom_field_setting (attach to project), set_custom_field_value (set on task).',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        name: { type: 'string', description: 'Field name' },
        resource_subtype: { type: 'string', enum: ['text', 'enum', 'multi_enum', 'number', 'date', 'people'], description: 'Field type' },
        description: { type: 'string', description: 'Field description' },
        precision: { type: 'number', description: 'Decimal places for number fields (0-6)' },
        currency_code: { type: 'string', description: 'ISO 4217 currency code (e.g., USD, EUR)' },
        format: { type: 'string', enum: ['none', 'currency', 'percentage'], description: 'Display format for number fields' },
        enum_options: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, color: { type: 'string' } } }, description: 'Options for enum/multi_enum fields' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['workspace', 'name', 'resource_subtype']
    },
    handler: async (args) => {
      const { opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/custom_fields', data, { params });
    }
  },
  {
    name: 'update_custom_field',
    description: 'Update a custom field definition (name, description, number settings). CONSTRAINT: Cannot change the field type (resource_subtype) after creation. For enum field options, use create_enum_option/update_enum_option instead. Premium feature. Related: get_custom_field, delete_custom_field.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        custom_field_gid: { type: 'string', description: 'Custom field GID' },
        name: { type: 'string', description: 'New field name' },
        description: { type: 'string', description: 'New description' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['custom_field_gid']
    },
    handler: async (args) => {
      const { custom_field_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/custom_fields/${custom_field_gid}`, data, { params });
    }
  },
  {
    name: 'delete_custom_field',
    description: 'Permanently delete a custom field from the workspace. DESTRUCTIVE: Cannot be undone. ALL values set on tasks for this field are permanently lost. The field is removed from all projects. Premium feature. Related: update_custom_field.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: { custom_field_gid: { type: 'string', description: 'Custom field GID to delete' } },
      required: ['custom_field_gid']
    },
    handler: async (args) => await client.delete(`/custom_fields/${args.custom_field_gid}`)
  },
  {
    name: 'create_enum_custom_field',
    description: 'Create a dropdown / single-select custom field with named options — use for "create a Priority field with Low/Medium/High/Critical options", status pickers, category fields, severity scales. Direct action — pass workspace by GID; do NOT call list_workspaces or list_custom_fields first. Each option has a name and optional color. Max 500 options per field. Shortcut for create_custom_field with type=enum. Premium feature. Related: create_enum_option (add options later), create_custom_field (other types: text/number/date/people/multi-select), add_project_custom_field_setting (attach to project), set_custom_field_value (set on a task).',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        name: { type: 'string', description: 'Field name' },
        description: { type: 'string', description: 'Field description' },
        enum_options: {
          type: 'array',
          items: { type: 'object', properties: { name: { type: 'string' }, color: { type: 'string' } } },
          description: 'Array of options with name and optional color'
        },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['workspace', 'name', 'enum_options']
    },
    handler: async (args) => {
      const { opt_fields, ...rest } = args;
      // Ensure enum_options are objects with name property (not plain strings)
      if (rest.enum_options && Array.isArray(rest.enum_options)) {
        rest.enum_options = rest.enum_options.map(opt =>
          typeof opt === 'string' ? { name: opt } : opt
        );
      }
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/custom_fields', { ...rest, resource_subtype: 'enum' }, { params });
    }
  },
  {
    name: 'set_custom_field_value',
    description: 'Set a custom field value on a task — use for "set the Priority field on task 9999 to Critical", "mark task as In Review status", "tag task with effort=5". Direct action — pass task and field by GID; do NOT call get_task or get_custom_field first if you have the IDs. Value type matches field type: enum → enum_option GID, multi_enum → array of enum_option GIDs, text → string (max 1024), number, date → "YYYY-MM-DD", people → array of user GIDs. Formula and custom_id fields are read-only. Pass value=null to clear. For enum options, get_custom_field returns option GIDs (cache them). Premium feature. Related: get_custom_field, update_task (set many fields at once), list_custom_fields.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        custom_field_gid: { type: 'string', description: 'Custom field GID' },
        value: { description: 'Value to set (type depends on field type)' }
      },
      required: ['task_gid', 'custom_field_gid', 'value']
    },
    handler: async (args) => {
      const custom_fields = {};
      custom_fields[args.custom_field_gid] = args.value;
      return await client.put(`/tasks/${args.task_gid}`, { custom_fields });
    }
  },
  {
    name: 'create_enum_option',
    description: 'Add a new option to an enum/multi_enum custom field. Max 500 options per field. New options are added at the end of the dropdown — use insert_enum_option to control position. Premium feature. Related: update_enum_option, insert_enum_option to reorder, get_custom_field to see existing options.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        custom_field_gid: { type: 'string', description: 'Custom field GID (enum or multi_enum)' },
        name: { type: 'string', description: 'Option display name' },
        color: { type: 'string', description: 'Option color' },
        enabled: { type: 'boolean', description: 'Whether option is enabled (default: true)' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['custom_field_gid', 'name']
    },
    handler: async (args) => {
      const { custom_field_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/custom_fields/${custom_field_gid}/enum_options`, data, { params });
    }
  },
  {
    name: 'update_enum_option',
    description: 'Update an enum option name, color, or enabled status. Set enabled=false to hide the option from new selections — existing tasks keep their value but the option cannot be newly assigned. Premium feature. Related: create_enum_option, insert_enum_option.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        enum_option_gid: { type: 'string', description: 'Enum option GID' },
        name: { type: 'string', description: 'New name' },
        color: { type: 'string', description: 'New color' },
        enabled: { type: 'boolean', description: 'Enable or disable' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['enum_option_gid']
    },
    handler: async (args) => {
      const { enum_option_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/enum_options/${enum_option_gid}`, data, { params });
    }
  },
  {
    name: 'insert_enum_option',
    description: 'Reorder an enum option by placing it before or after another option. Use before_enum_option or after_enum_option (mutually exclusive). Controls the display order in the dropdown. Premium feature. Related: create_enum_option, update_enum_option.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        custom_field_gid: { type: 'string', description: 'Custom field GID' },
        enum_option: { type: 'string', description: 'Enum option GID to move' },
        before_enum_option: { type: 'string', description: 'Place before this option GID' },
        after_enum_option: { type: 'string', description: 'Place after this option GID' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['custom_field_gid', 'enum_option']
    },
    handler: async (args) => {
      const { custom_field_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/custom_fields/${custom_field_gid}/enum_options/insert`, data, { params });
    }
  }
];
