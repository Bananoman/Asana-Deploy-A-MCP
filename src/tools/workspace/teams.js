/**
 * Team Tools - Organization Team Management & Membership
 *
 * Teams exist only within organizations (not personal workspaces). They group users together
 * and can own projects — every project in an organization must belong to a team. Team visibility
 * controls who can see and join: public (anyone in org), request_to_join (requires approval),
 * or secret (invite only).
 *
 * Plan requirements: Free (basic teams), Premium (advanced team features)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - Teams ONLY exist in organizations (is_organization=true), not basic workspaces
 * - create_team requires an organization GID (not a workspace GID)
 * - Visibility options: "public", "request_to_join", "secret"
 * - Users must already be organization members before being added to teams
 * - The creator is automatically added as a team member
 *
 * NOT possible via API (use Asana UI instead):
 * - Deleting teams (only possible in Asana UI)
 * - Setting team-level notification preferences
 * - Managing team conversation threads
 *
 * @module tools/teams
 */

module.exports = (client) => [
  {
    name: 'list_teams',
    description: 'List teams in an organization. Teams only exist in organizations (not personal workspaces) — this will fail if given a basic workspace GID. Returns paginated results (default 20, max 100) with team names and GIDs. Use opt_fields to include description, visibility, and permalink_url. Related: get_team for full details on a specific team, create_team to add a new team, list_team_users for team members.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        organization: {
          type: 'string',
          description: 'Organization GID (must be an organization, not a personal workspace)'
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
          description: 'Comma-separated fields to include. Example: "name,description,visibility,permalink_url"'
        }
      },
      required: ['organization']
    },
    handler: async (args) => {
      const { organization, ...params } = args;
      return await client.get(`/organizations/${organization}/teams`, params);
    }
  },

  {
    name: 'get_team',
    description: 'Get full details of a specific team by its GID. Returns name, description, visibility setting (public/request_to_join/secret), organization, and permalink. Visibility determines who can see and join: "public" means anyone in the org can join, "request_to_join" requires admin approval, "secret" is invite-only. Related: list_teams to find team GIDs, get_team_users for members, list_team_memberships for membership details with roles.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        team_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the team'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "name,description,visibility,organization,permalink_url"'
        }
      },
      required: ['team_gid']
    },
    handler: async (args) => {
      const { team_gid, ...params } = args;
      return await client.get(`/teams/${team_gid}`, params);
    }
  },

  {
    name: 'get_team_users',
    description: 'Get all users who are members of a specific team. Returns paginated user records (default 20, max 100). Teams exist only in organizations. For detailed membership info including roles (admin, member, limited access), use list_team_memberships instead. Related: get_team for team details, add_user_to_team to add members, list_team_memberships for role information.',
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
          description: 'Comma-separated fields to include. Example: "name,email,photo"'
        }
      },
      required: ['team_gid']
    },
    handler: async (args) => {
      const { team_gid, ...params } = args;
      return await client.get(`/teams/${team_gid}/users`, params);
    }
  },

  {
    name: 'add_user_to_team',
    description: 'Add an existing org user to a team — use for "add Ricardo to the Implementations team", department/squad assignment, granting team-scoped access. Direct action — pass team by GID and user by email OR GID; do NOT call list_teams, list_team_users, or get_team first. User must already be in the organization (use add_user_to_workspace first for external invites). Behavior by team visibility: public (immediate), request_to_join (admin approval), secret (caller must be team admin). Related: remove_user_from_team, list_team_users, add_user_to_workspace (org-level invite first).',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        team_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the team'
        },
        user: {
          type: 'string',
          description: 'User GID or email address to add to the team'
        }
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
    description: 'Remove a user from a team, revoking their access to team-visible projects and resources. The user remains in the organization but loses team membership and access to all projects owned by that team (unless they have direct project access). This action cannot be undone. Requires appropriate permissions (team admin or org admin). Related: add_user_to_team to grant membership, get_team_users to see current members.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        team_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the team'
        },
        user: {
          type: 'string',
          description: 'User GID to remove from the team'
        }
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
    description: 'Create a team within an organization — use for "create a new team for the implementations group", spinning up a department/squad/working group. Direct action — pass organization by GID; do NOT call list_workspaces or get_workspace first. Teams require an organization workspace (is_organization=true) — personal workspaces are NOT supported and the call will error. The caller is auto-added as member. Visibility: public (anyone in org can join), request_to_join (admin approval), secret (invite only). Default depends on org settings. Related: list_teams, add_user_to_team (members), create_project (with team).',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        organization: {
          type: 'string',
          description: 'Organization GID where the team will be created'
        },
        name: {
          type: 'string',
          description: 'Name for the new team'
        },
        description: {
          type: 'string',
          description: 'Description of the team purpose (optional)'
        },
        visibility: {
          type: 'string',
          description: 'Team visibility: "public" (anyone can join), "request_to_join" (requires approval), or "secret" (invite only). Default varies by organization settings.'
        }
      },
      required: ['organization', 'name']
    },
    handler: async (args) => {
      const { organization, name, description, visibility } = args;
      const data = { organization, name };
      if (description) data.description = description;
      if (visibility) data.visibility = visibility;
      return await client.post('/teams', data);
    }
  }
];
