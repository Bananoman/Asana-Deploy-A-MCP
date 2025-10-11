/** Teams Tools - Complete Operations */
module.exports = (client) => [
  {
    name: 'list_teams',
    description: 'List teams in an organization/workspace',
    inputSchema: {
      type: 'object',
      properties: {
        organization: { type: 'string', description: 'Organization/Workspace GID' },
        limit: { type: 'number', default: 20 }
      },
      required: ['organization']
    },
    handler: async (args) => await client.get(`/organizations/${args.organization}/teams`, {
      limit: args.limit || 20
    })
  },
  {
    name: 'get_team',
    description: 'Get team details',
    inputSchema: {
      type: 'object',
      properties: { team_gid: { type: 'string' } },
      required: ['team_gid']
    },
    handler: async (args) => await client.get(`/teams/${args.team_gid}`)
  },
  {
    name: 'get_team_users',
    description: 'Get users in a team',
    inputSchema: {
      type: 'object',
      properties: { team_gid: { type: 'string' } },
      required: ['team_gid']
    },
    handler: async (args) => await client.get(`/teams/${args.team_gid}/users`)
  },
  {
    name: 'add_user_to_team',
    description: 'Add a user to a team',
    inputSchema: {
      type: 'object',
      properties: {
        team_gid: { type: 'string' },
        user: { type: 'string', description: 'User GID or email' }
      },
      required: ['team_gid', 'user']
    },
    handler: async (args) => {
      const { team_gid, user } = args;
      return await client.post(`/teams/${team_gid}/addUser`, { user });
    }
  },
  {
    name: 'remove_user_from_team',
    description: 'Remove a user from a team',
    inputSchema: {
      type: 'object',
      properties: {
        team_gid: { type: 'string' },
        user: { type: 'string', description: 'User GID' }
      },
      required: ['team_gid', 'user']
    },
    handler: async (args) => {
      const { team_gid, user } = args;
      return await client.post(`/teams/${team_gid}/removeUser`, { user });
    }
  },
  {
    name: 'create_team',
    description: 'Create a team in an organization',
    inputSchema: {
      type: 'object',
      properties: {
        organization: { type: 'string', description: 'Organization GID' },
        name: { type: 'string', description: 'Team name' }
      },
      required: ['organization', 'name']
    },
    handler: async (args) => {
      const { organization, name } = args;
      return await client.post('/teams', { organization, name });
    }
  }
];
