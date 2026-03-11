/**
 * Workspace Tools - Core Container Management for Workspaces & Organizations
 *
 * Workspaces are top-level containers in Asana. Organizations are a special type of workspace
 * tied to a company email domain (identified by the is_organization flag). All projects, tasks,
 * teams, and users belong to a workspace. Some features (teams, organization exports) only work
 * in organizations, not basic workspaces.
 *
 * Plan requirements: Free (basic), Premium (custom fields), Enterprise (audit log, org exports)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - update_workspace only supports name changes (no other fields)
 * - add_user adds EXISTING Asana users or sends an invite; cannot create new accounts
 * - remove_user revokes workspace access but does NOT delete the user's Asana account
 * - Workspace GID and is_organization status cannot be changed
 *
 * NOT possible via API (use Asana UI instead):
 * - Converting a workspace to an organization
 * - Changing workspace email domains
 * - Managing workspace billing or plan settings
 *
 * @module tools/workspaces
 */

module.exports = (client) => [
  {
    name: 'list_workspaces',
    description: 'List all workspaces and organizations the authenticated user has access to. Returns both personal workspaces and organization workspaces with paginated results (default 20, max 100). Each result includes the is_organization flag to distinguish workspace types — true means it is an organization (supports teams, org-level features). Use this as a starting point to discover available workspaces before performing other operations. Use opt_fields to request additional fields like email_domains. Related: get_workspace for full details on a specific workspace, get_current_user for the authenticated user profile.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
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
          description: 'Comma-separated fields to include. Example: "name,is_organization,email_domains"'
        }
      },
      required: []
    },
    handler: async (args) => {
      const params = {};
      if (args.limit) params.limit = args.limit;
      if (args.offset) params.offset = args.offset;
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get('/workspaces', params);
    }
  },

  {
    name: 'get_workspace',
    description: 'Get full details of a specific workspace or organization by its GID. Returns name, is_organization flag, and email_domains (for organizations). Use is_organization to confirm whether this is an organization before performing org-only operations like creating teams or running org exports. Organizations are tied to company email domains; basic workspaces are not. Related: list_workspaces to find workspace GIDs, list_teams for organization teams, update_workspace to rename.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the workspace'
        },
        opt_fields: {
          type: 'string',
          description: 'Comma-separated fields to include. Example: "name,is_organization,email_domains"'
        }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      const { workspace_gid, ...params } = args;
      return await client.get(`/workspaces/${workspace_gid}`, params);
    }
  },

  {
    name: 'update_workspace',
    description: 'Update a workspace\'s properties. Currently only the workspace name can be changed via the API — no other fields are updatable. Requires admin permissions on the workspace. The workspace GID and is_organization status cannot be modified. Idempotent: setting the same name again has no additional effect. Related: get_workspace to see current name, list_workspaces to find workspace GIDs.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the workspace to update'
        },
        name: {
          type: 'string',
          description: 'New name for the workspace'
        }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      const { workspace_gid, ...data } = args;
      return await client.put(`/workspaces/${workspace_gid}`, data);
    }
  },

  {
    name: 'add_user_to_workspace',
    description: 'Add an existing Asana user to a workspace or organization, or invite a new user by email. Specify the user by GID (existing user) or email address (sends invitation if not yet on Asana). This does NOT create a new Asana account — the user must accept the invitation and create their own. Requires admin permissions on the workspace. For organizations, the user gains access to org-level features. Related: remove_user_from_workspace to revoke access, list_users_workspace to see current members, add_user_to_team for team-level access.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the workspace'
        },
        user: {
          type: 'string',
          description: 'User GID or email address to add/invite'
        }
      },
      required: ['workspace_gid', 'user']
    },
    handler: async (args) => {
      const { workspace_gid, user } = args;
      return await client.post(`/workspaces/${workspace_gid}/addUser`, { user });
    }
  },

  {
    name: 'remove_user_from_workspace',
    description: 'Remove a user from a workspace or organization, revoking their access to all projects, tasks, and teams within it. This action cannot be undone — the user loses access immediately but their Asana account is NOT deleted. Tasks assigned to the removed user remain assigned but become inaccessible to them. Requires admin permissions. Related: add_user_to_workspace to grant access, list_users_workspace to see current members, remove_user_from_team for team-level removal only.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: {
          type: 'string',
          description: 'The globally unique identifier (GID) of the workspace'
        },
        user: {
          type: 'string',
          description: 'User GID to remove from the workspace'
        }
      },
      required: ['workspace_gid', 'user']
    },
    handler: async (args) => {
      const { workspace_gid, user } = args;
      return await client.post(`/workspaces/${workspace_gid}/removeUser`, { user });
    }
  }
];
