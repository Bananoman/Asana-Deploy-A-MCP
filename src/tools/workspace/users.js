/**
 * User Tools - Profile Lookup, Listing & Favorites
 *
 * Users in Asana can be regular members, guests (limited external collaborators), or service
 * accounts. Each user has a unique GID and belongs to one or more workspaces. Use "me" as a
 * special user_gid shortcut for the currently authenticated user.
 *
 * Plan requirements: Free (basic), Premium (custom fields on users)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - "me" is a valid user_gid shortcut that returns the authenticated user
 * - Photo sizes available: 21x21, 27x27, 36x36, 60x60, 128x128
 * - View-only (limited access) license users have restricted API capabilities
 * - list_users requires a workspace parameter (mandatory since Feb 2025)
 * - Users cannot be created or deleted via API — only added/removed from workspaces
 *
 * NOT possible via API (use Asana UI instead):
 * - Creating or deleting user accounts
 * - Changing user email addresses or passwords
 * - Managing user license types
 *
 * @module tools/users
 */

module.exports = (client) => [
  {
    name: 'get_current_user',
    description: 'Get profile of the currently authenticated user. Returns name, email, workspaces, photo URLs. Use ONLY when the user explicitly asks "who am I", needs the current user GID/email, or you must report identity. Do NOT call before create/update/search/bulk tools — those resolve identity server-side automatically. Shortcut for get_user with user_gid="me". Related: get_user (other profiles), list_workspaces (workspace catalog).',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "name,email,workspaces,photo"'
        }
      },
      required: []
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get('/users/me', params);
    }
  },

  {
    name: 'get_user',
    description: 'Get detailed profile information for a specific user by their GID. You can also pass "me" as the user_gid to get the authenticated user. Returns name, email, workspaces, and photo URLs (available in sizes: 21x21, 27x27, 36x36, 60x60, 128x128). Users can be regular members, guests (external collaborators with limited access), view-only license users (restricted API capabilities), or service accounts. Related: get_current_user as a shortcut for "me", list_users to find user GIDs in a workspace.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        user_gid: {
          type: 'string',
          description: 'User GID, or "me" for the authenticated user'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "name,email,workspaces,photo"'
        }
      },
      required: ['user_gid']
    },
    handler: async (args) => {
      const { user_gid, ...params } = args;
      return await client.get(`/users/${user_gid}`, params);
    }
  },

  {
    name: 'list_users_workspace',
    description: 'List all users in a specific workspace. Returns paginated results (default 20, max 100). Includes regular members, guests, service accounts, and view-only license users. For large organizations, use limit and offset for pagination — results may include thousands of users. Use opt_fields to reduce payload size. Related: list_users for the same data with a different endpoint, get_user for individual user details, list_team_users for team-specific members.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace or organization GID'
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
      required: ['workspace']
    },
    handler: async (args) => {
      const { workspace, ...params } = args;
      return await client.get(`/workspaces/${workspace}/users`, params);
    }
  },

  {
    name: 'list_users',
    description: 'List users in a workspace or organization with filtering and pagination. Returns paginated results (default 20, max 100). A workspace GID is required as a filter parameter (mandatory since Feb 2025 — calls without workspace will fail). Functionally similar to list_users_workspace but uses the /users endpoint. Use opt_fields to control returned fields and reduce payload. Related: list_users_workspace for workspace-scoped endpoint, get_user for individual user details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace or organization GID (required filter)'
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
          description: 'Comma-separated fields to include. Example: "name,email,photo,workspaces"'
        }
      },
      required: ['workspace']
    },
    handler: async (args) => {
      const { workspace, ...params } = args;
      return await client.get('/users', { workspace, ...params });
    }
  },

  {
    name: 'list_team_users',
    description: 'List all users who are members of a specific team. Returns paginated results (default 20, max 100). Teams only exist in organizations (not personal workspaces), so this will fail if given a team from a basic workspace. Includes regular members and guests. Related: get_team for team details, add_user_to_team to add members, list_team_memberships for membership details with roles (admin, member, limited access).',
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
    name: 'get_user_favorites',
    description: 'Get a user\'s favorited (starred/bookmarked) items in a specific workspace. Returns projects, portfolios, tags, tasks, and other resources the user has marked as favorites. Requires both user_gid and workspace. The resource_type filter is required — use "project", "portfolio", "tag", "task", "user", "project_template", or "search". Use "me" as user_gid for the authenticated user\'s favorites. Related: get_user for user details, list_projects for all projects in a workspace.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        user_gid: {
          type: 'string',
          description: 'User GID, or "me" for the authenticated user'
        },
        workspace: {
          type: 'string',
          description: 'Workspace GID to get favorites from'
        },
        resource_type: {
          type: 'string',
          description: 'Filter by resource type: "project", "portfolio", "tag", "task", "user", "project_template", or "search"'
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
          description: 'Comma-separated fields to include. Example: "name,resource_type"'
        }
      },
      required: ['user_gid', 'workspace', 'resource_type']
    },
    handler: async (args) => {
      const { user_gid, ...params } = args;
      return await client.get(`/users/${user_gid}/favorites`, params);
    }
  }
];
