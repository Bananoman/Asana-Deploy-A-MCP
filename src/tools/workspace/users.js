/** User Tools - Complete Operations */
module.exports = (client) => [
  {
    name: 'get_current_user',
    description: 'Get current user info',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => await client.get('/users/me')
  },
  {
    name: 'get_user',
    description: 'Get a user by GID',
    inputSchema: {
      type: 'object',
      properties: { user_gid: { type: 'string' } },
      required: ['user_gid']
    },
    handler: async (args) => await client.get(`/users/${args.user_gid}`)
  },
  {
    name: 'list_users_workspace',
    description: 'List users in workspace',
    inputSchema: {
      type: 'object',
      properties: { workspace: { type: 'string' } },
      required: ['workspace']
    },
    handler: async (args) => await client.get(`/workspaces/${args.workspace}/users`)
  },
  {
    name: 'list_users',
    description: 'List all users in organization',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace/Organization GID' },
        limit: { type: 'number', default: 20 }
      },
      required: ['workspace']
    },
    handler: async (args) => await client.get('/users', {
      workspace: args.workspace,
      limit: args.limit || 20
    })
  },
  {
    name: 'list_team_users',
    description: 'List users in a team',
    inputSchema: {
      type: 'object',
      properties: { team_gid: { type: 'string' } },
      required: ['team_gid']
    },
    handler: async (args) => await client.get(`/teams/${args.team_gid}/users`)
  }
];
