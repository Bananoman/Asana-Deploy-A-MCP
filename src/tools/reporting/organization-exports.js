/** Organization Exports Tools */
module.exports = (client) => [
  {
    name: 'get_organization_export',
    description: 'Get an organization export',
    inputSchema: {
      type: 'object',
      properties: {
        organization_export_gid: { type: 'string', description: 'Organization export GID' }
      },
      required: ['organization_export_gid']
    },
    handler: async (args) => await client.get(`/organization_exports/${args.organization_export_gid}`)
  },
  {
    name: 'create_organization_export',
    description: 'Create an organization export',
    inputSchema: {
      type: 'object',
      properties: {
        organization: { type: 'string', description: 'Organization/Workspace GID' }
      },
      required: ['organization']
    },
    handler: async (args) => await client.post('/organization_exports', args)
  }
];
