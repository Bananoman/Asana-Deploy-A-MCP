/**
 * Generic Memberships Tools - Unified API for all membership types
 *
 * The unified memberships API works across project, portfolio, goal, and custom field
 * memberships. For team and workspace memberships, use the dedicated endpoints instead.
 *
 * Key constraints:
 * - Works for: projects, portfolios, goals, custom fields
 * - Does NOT work for: teams, workspaces (use dedicated team/workspace membership tools)
 * - Member must have workspace access to be added to a resource
 *
 * @module generic-memberships
 */
module.exports = (client) => [
  {
    name: 'get_membership',
    description: 'Get a membership by GID. Works for project, portfolio, goal, and custom field memberships. Returns member, parent resource, role, and access level. For team/workspace memberships, use dedicated tools instead. Related: list_memberships, create_membership.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        membership_gid: { type: 'string', description: 'Membership GID' },
        opt_fields: { type: 'string', description: 'Fields to include. Example: "member.name,parent.name,role,access_level"' }
      },
      required: ['membership_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/memberships/${args.membership_gid}`, params);
    }
  },
  {
    name: 'create_membership',
    description: 'Create a membership linking a user to a resource (project, portfolio, goal). The unified API works across all resource types except teams/workspaces. The user must have workspace access. Related: list_memberships, delete_membership, add_project_members (project-specific shortcut).',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent resource GID (project, portfolio, goal, etc.)' },
        member: { type: 'string', description: 'User GID to add as member' },
        role: { type: 'string', description: 'Role for the member (if applicable)' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['parent', 'member']
    },
    handler: async (args) => {
      const { opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/memberships', data, { params });
    }
  },
  {
    name: 'delete_membership',
    description: 'Delete a membership, removing a user from a resource. DESTRUCTIVE: The user loses access immediately. Related: get_membership, create_membership.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: { membership_gid: { type: 'string', description: 'Membership GID to delete' } },
      required: ['membership_gid']
    },
    handler: async (args) => await client.delete(`/memberships/${args.membership_gid}`)
  },
  {
    name: 'list_memberships',
    description: 'List all memberships for a resource. Shows members of a project, portfolio, goal, etc. Use member parameter to check if a specific user is a member. Returns max 100 per page. Related: create_membership, get_membership.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent resource GID' },
        member: { type: 'string', description: 'Filter by member user GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Fields to include. Example: "member.name,role,access_level"' }
      },
      required: ['parent']
    },
    handler: async (args) => {
      const params = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) params[key] = value;
      }
      return await client.get('/memberships', params);
    }
  },
  {
    name: 'update_membership',
    description: 'Update a membership role or access level. Related: get_membership, delete_membership.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        membership_gid: { type: 'string', description: 'Membership GID' },
        role: { type: 'string', description: 'New role for the member' },
        opt_fields: { type: 'string', description: 'Fields to include in response' }
      },
      required: ['membership_gid']
    },
    handler: async (args) => {
      const { membership_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/memberships/${membership_gid}`, data, { params });
    }
  }
];
