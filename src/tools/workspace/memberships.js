/** Memberships Tools - Project, Portfolio, Team, Workspace */
module.exports = (client) => [
  // Project Memberships
  {
    name: 'list_project_memberships',
    description: 'Get memberships for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' }
      },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}/project_memberships`)
  },
  {
    name: 'get_project_membership',
    description: 'Get a project membership',
    inputSchema: {
      type: 'object',
      properties: {
        project_membership_gid: { type: 'string', description: 'Project membership GID' }
      },
      required: ['project_membership_gid']
    },
    handler: async (args) => await client.get(`/project_memberships/${args.project_membership_gid}`)
  },

  // Portfolio Memberships
  {
    name: 'list_portfolio_memberships',
    description: 'Get memberships for a portfolio',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => await client.get(`/portfolios/${args.portfolio_gid}/portfolio_memberships`)
  },
  {
    name: 'get_portfolio_membership',
    description: 'Get a portfolio membership',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_membership_gid: { type: 'string', description: 'Portfolio membership GID' }
      },
      required: ['portfolio_membership_gid']
    },
    handler: async (args) => await client.get(`/portfolio_memberships/${args.portfolio_membership_gid}`)
  },

  // Team Memberships
  {
    name: 'list_team_memberships',
    description: 'Get memberships for a team',
    inputSchema: {
      type: 'object',
      properties: {
        team_gid: { type: 'string', description: 'Team GID' }
      },
      required: ['team_gid']
    },
    handler: async (args) => await client.get(`/teams/${args.team_gid}/team_memberships`)
  },
  {
    name: 'get_team_membership',
    description: 'Get a team membership',
    inputSchema: {
      type: 'object',
      properties: {
        team_membership_gid: { type: 'string', description: 'Team membership GID' }
      },
      required: ['team_membership_gid']
    },
    handler: async (args) => await client.get(`/team_memberships/${args.team_membership_gid}`)
  },
  {
    name: 'list_user_team_memberships',
    description: 'Get team memberships for a user',
    inputSchema: {
      type: 'object',
      properties: {
        user_gid: { type: 'string', description: 'User GID' }
      },
      required: ['user_gid']
    },
    handler: async (args) => await client.get(`/users/${args.user_gid}/team_memberships`)
  },

  // Workspace Memberships
  {
    name: 'list_workspace_memberships',
    description: 'Get memberships for a workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID' }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => await client.get(`/workspaces/${args.workspace_gid}/workspace_memberships`)
  },
  {
    name: 'get_workspace_membership',
    description: 'Get a workspace membership',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_membership_gid: { type: 'string', description: 'Workspace membership GID' }
      },
      required: ['workspace_membership_gid']
    },
    handler: async (args) => await client.get(`/workspace_memberships/${args.workspace_membership_gid}`)
  }
];
