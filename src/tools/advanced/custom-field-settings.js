/**
 * Custom Field Settings - Manage field-to-resource bindings
 *
 * A custom field setting represents the binding between a custom field and a
 * project, portfolio, or goal. It controls whether the field appears on that
 * resource and whether it's marked as "important" (prominently displayed).
 *
 * Premium feature required for custom fields.
 *
 * @module custom-field-settings
 */
module.exports = (client) => [
  {
    name: 'get_custom_field_setting',
    description: 'Get details of a custom field setting by GID. A setting represents the binding between a custom field and a project/portfolio/goal, including the is_important flag (controls prominent display). Premium feature. Related: list_project_custom_field_settings, add_project_custom_field_setting.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        custom_field_setting_gid: { type: 'string', description: 'Custom field setting GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "custom_field.name,custom_field.resource_subtype,is_important,project.name"' }
      },
      required: ['custom_field_setting_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/custom_field_settings/${args.custom_field_setting_gid}`, params);
    }
  },
  {
    name: 'list_project_custom_field_settings',
    description: 'List all custom field settings on a project. Shows which custom fields are configured, their types, and importance flags. Use this to discover available fields before setting values on tasks. Tip: include opt_fields="custom_field.name,custom_field.resource_subtype,custom_field.enum_options,is_important" for useful defaults. Premium feature. Related: add_project_custom_field_setting, set_custom_field_value.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Example: "custom_field.name,custom_field.resource_subtype,custom_field.enum_options,is_important"' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, ...params } = args;
      return await client.get(`/projects/${project_gid}/custom_field_settings`, params);
    }
  },
  {
    name: 'list_portfolio_custom_field_settings',
    description: 'List custom field settings on a portfolio. Shows which fields track portfolio item data. Business+ feature (portfolios require Business plan). Related: add_portfolio_custom_field_setting, get_portfolio.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Example: "custom_field.name,custom_field.resource_subtype,is_important"' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => {
      const { portfolio_gid, ...params } = args;
      return await client.get(`/portfolios/${portfolio_gid}/custom_field_settings`, params);
    }
  },
  {
    name: 'add_portfolio_custom_field_setting',
    description: 'Add a custom field to a portfolio for tracking across portfolio items. Set is_important=true for prominent display. The field must already exist in the workspace. Business+ feature. Related: remove_portfolio_custom_field_setting, list_portfolio_custom_field_settings.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        custom_field: { type: 'string', description: 'Custom field GID to add' },
        is_important: { type: 'boolean', description: 'Show field prominently (default: false)' }
      },
      required: ['portfolio_gid', 'custom_field']
    },
    handler: async (args) => {
      const { portfolio_gid, ...data } = args;
      return await client.post(`/portfolios/${portfolio_gid}/addCustomFieldSetting`, data);
    }
  },
  {
    name: 'remove_portfolio_custom_field_setting',
    description: 'Remove a custom field from a portfolio. The field values are retained on items but no longer visible in portfolio view. Re-adding restores visibility. Business+ feature. Related: add_portfolio_custom_field_setting.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        custom_field: { type: 'string', description: 'Custom field GID to remove' }
      },
      required: ['portfolio_gid', 'custom_field']
    },
    handler: async (args) => {
      const { portfolio_gid, custom_field } = args;
      return await client.post(`/portfolios/${portfolio_gid}/removeCustomFieldSetting`, { custom_field });
    }
  },
  {
    name: 'get_goal_custom_field_settings',
    description: 'List custom field settings on a goal. Shows which fields are configured for goal tracking. Business+ feature (goals require Business plan). Related: get_goal, create_goal.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Example: "custom_field.name,custom_field.resource_subtype,is_important"' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => {
      const { goal_gid, ...params } = args;
      return await client.get(`/goals/${goal_gid}/custom_field_settings`, params);
    }
  }
];
