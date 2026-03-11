/**
 * Membership Tools - Access Auditing for Projects, Portfolios, Teams & Workspaces
 *
 * Memberships represent the relationship between a user and a resource (project, portfolio,
 * team, or workspace). They contain role information (e.g., editor, commenter, viewer for
 * projects; admin, member for teams) and access level details. Different membership types
 * have different available fields and role structures.
 *
 * Plan requirements: Free (basic memberships), Premium (portfolio memberships)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - Membership endpoints are read-only — use add/remove member tools to change access
 * - Project memberships include write_access field (editor vs. commenter)
 * - Team memberships include is_admin, is_guest, is_limited_access fields
 * - Workspace memberships include is_admin, is_active, is_guest fields
 * - Portfolio memberships show user-portfolio associations
 *
 * NOT possible via API (use Asana UI instead):
 * - Changing membership roles directly (use project/team admin settings)
 * - Viewing membership invitation status
 *
 * @module tools/memberships
 */

module.exports = (client) => [
  // Project Memberships
  {
    name: 'list_project_memberships',
    description: 'List all memberships for a project, showing which users have access and their roles (editor, commenter, viewer). Returns paginated results (default 20, max 100). The write_access field indicates editing permissions. Use this to audit project access, find collaborators, or verify permissions before making changes. Related: get_project_membership for details on a specific membership, add_project_members to grant access, remove_project_members to revoke.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the project'
        },
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default 20)'
        },
        offset: {
          type: 'string',
          description: 'Pagination token from previous response next_page.offset'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "user,user.name,user.email,write_access"'
        }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, ...params } = args;
      return await client.get(`/projects/${project_gid}/project_memberships`, params);
    }
  },

  {
    name: 'get_project_membership',
    description: 'Get details of a specific project membership by its GID. Returns the user, their access level (write_access field indicates editor vs. commenter), and the project. Use this to check a specific user\'s role and permissions in a project. Related: list_project_memberships to find membership GIDs, add_project_members to change access.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_membership_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the project membership'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "user,user.name,write_access,project"'
        }
      },
      required: ['project_membership_gid']
    },
    handler: async (args) => {
      const { project_membership_gid, ...params } = args;
      return await client.get(`/project_memberships/${project_membership_gid}`, params);
    }
  },

  // Portfolio Memberships
  {
    name: 'list_portfolio_memberships',
    description: 'List all memberships for a portfolio, showing which users have access. Portfolios group projects together and memberships control who can view and edit the portfolio. Returns paginated results (default 20, max 100). Related: get_portfolio_membership for details on a specific membership, get_portfolio for portfolio info, add_members_to_portfolio to grant access.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the portfolio'
        },
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default 20)'
        },
        offset: {
          type: 'string',
          description: 'Pagination token from previous response next_page.offset'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "user,user.name,portfolio"'
        }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => {
      const { portfolio_gid, ...params } = args;
      return await client.get(`/portfolios/${portfolio_gid}/portfolio_memberships`, params);
    }
  },

  {
    name: 'get_portfolio_membership',
    description: 'Get details of a specific portfolio membership by its GID. Returns the user and portfolio information associated with this membership. Related: list_portfolio_memberships to find membership GIDs, get_portfolio for portfolio details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_membership_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the portfolio membership'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "user,user.name,portfolio"'
        }
      },
      required: ['portfolio_membership_gid']
    },
    handler: async (args) => {
      const { portfolio_membership_gid, ...params } = args;
      return await client.get(`/portfolio_memberships/${portfolio_membership_gid}`, params);
    }
  },

  // Team Memberships
  {
    name: 'list_team_memberships',
    description: 'List all memberships for a team, showing which users belong to the team and their roles. Teams exist only in organizations (not personal workspaces). Returns paginated results (default 20, max 100). Includes role fields: is_admin (team admin), is_guest (external collaborator), is_limited_access (view-only). Related: get_team_membership for details, get_team_users for a simpler user list, add_user_to_team to add members.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        team_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the team'
        },
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default 20)'
        },
        offset: {
          type: 'string',
          description: 'Pagination token from previous response next_page.offset'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "user,user.name,user.email,is_admin,is_guest,is_limited_access"'
        }
      },
      required: ['team_gid']
    },
    handler: async (args) => {
      const { team_gid, ...params } = args;
      return await client.get(`/teams/${team_gid}/team_memberships`, params);
    }
  },

  {
    name: 'get_team_membership',
    description: 'Get details of a specific team membership by its GID. Returns user, team, and role information including is_admin (team admin), is_guest (external collaborator), and is_limited_access (view-only). Use this to verify a user\'s role within a team. Related: list_team_memberships to find membership GIDs, get_team for team details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        team_membership_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the team membership'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "user,user.name,team,is_admin,is_guest"'
        }
      },
      required: ['team_membership_gid']
    },
    handler: async (args) => {
      const { team_membership_gid, ...params } = args;
      return await client.get(`/team_memberships/${team_membership_gid}`, params);
    }
  },

  {
    name: 'list_user_team_memberships',
    description: 'List all team memberships for a specific user, showing which teams they belong to and their roles in each. Useful for understanding a user\'s team affiliations across an organization, auditing access, or finding which teams a user administers. Optionally filter by workspace. Returns paginated results (default 20, max 100). Related: list_team_memberships for team-scoped view, get_team_membership for details on a specific membership.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        user_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the user'
        },
        workspace: {
          type: 'string',
          description: 'Workspace GID to filter team memberships by (optional)'
        },
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default 20)'
        },
        offset: {
          type: 'string',
          description: 'Pagination token from previous response next_page.offset'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "user,user.name,team,team.name,is_admin"'
        }
      },
      required: ['user_gid']
    },
    handler: async (args) => {
      const { user_gid, ...params } = args;
      return await client.get(`/users/${user_gid}/team_memberships`, params);
    }
  },

  // Workspace Memberships
  {
    name: 'list_workspace_memberships',
    description: 'List all memberships for a workspace, showing which users have access and their workspace-level roles. Workspace memberships differ from team/project memberships — they represent top-level access to the workspace itself. Includes is_admin, is_active, and is_guest fields. Returns paginated results (default 20, max 100). Related: get_workspace_membership for details, list_users_workspace for a simpler user list, add_user_to_workspace to grant access.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the workspace'
        },
        limit: {
          type: 'number',
          description: 'Results per page (1-100, default 20)'
        },
        offset: {
          type: 'string',
          description: 'Pagination token from previous response next_page.offset'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "user,user.name,user.email,is_admin,is_active"'
        }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      const { workspace_gid, ...params } = args;
      return await client.get(`/workspaces/${workspace_gid}/workspace_memberships`, params);
    }
  },

  {
    name: 'get_workspace_membership',
    description: 'Get details of a specific workspace membership by its GID. Returns user, workspace, admin status (is_admin), active status (is_active), and guest status (is_guest). An inactive membership means the user has been deactivated but not removed. Related: list_workspace_memberships to find membership GIDs, get_workspace for workspace details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_membership_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the workspace membership'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "user,user.name,workspace,is_admin,is_active,is_guest"'
        }
      },
      required: ['workspace_membership_gid']
    },
    handler: async (args) => {
      const { workspace_membership_gid, ...params } = args;
      return await client.get(`/workspace_memberships/${workspace_membership_gid}`, params);
    }
  }
];
