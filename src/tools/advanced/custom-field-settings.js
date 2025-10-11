/** Custom Field Settings Tools */
module.exports = (client) => [
  {
    name: 'get_custom_field_setting',
    description: 'Get a custom field setting',
    inputSchema: {
      type: 'object',
      properties: {
        custom_field_setting_gid: { type: 'string', description: 'Custom field setting GID' }
      },
      required: ['custom_field_setting_gid']
    },
    handler: async (args) => await client.get(`/custom_field_settings/${args.custom_field_setting_gid}`)
  },
  {
    name: 'list_project_custom_field_settings',
    description: 'Get custom field settings for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' }
      },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}/custom_field_settings`)
  },
  {
    name: 'list_portfolio_custom_field_settings',
    description: 'Get custom field settings for a portfolio',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => await client.get(`/portfolios/${args.portfolio_gid}/custom_field_settings`)
  }
];
