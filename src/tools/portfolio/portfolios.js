/**
 * Portfolio Tools - Complete CRUD + Item & Member Management + Custom Field Settings
 *
 * Portfolios are collections of projects used for high-level tracking, reporting,
 * and resource management across multiple initiatives. Portfolios contain projects
 * (not tasks) and support custom field settings, members, and status updates.
 *
 * Plan requirements: Business+ (all portfolio features require Business or Enterprise plan)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - Portfolios contain projects only (not tasks or goals)
 * - start_on must be before due_on when both are set
 * - Members can view/edit; owners have full control including deletion
 * - Color uses standard Asana palette (dark-xx/light-xx variants + "none")
 * - A project can belong to multiple portfolios simultaneously
 *
 * CRITICAL - Portfolio Access Levels (SALS, enforced Feb 2026):
 * - DANGER: add_members_to_portfolio(self) when you are already a member/owner
 *   DOWNGRADES your access from admin to editor, causing 403 on delete and
 *   other admin-only operations. This is IRREVERSIBLE via API.
 * - Similarly, remove_members_from_portfolio(self) strips your membership entirely.
 * - Order of operations matters: perform delete_portfolio BEFORE any
 *   add_members_to_portfolio calls that include the authenticated user.
 * - To safely test member operations, use a DIFFERENT user GID (not the
 *   authenticated user/owner).
 *
 * NOT possible via API (use Asana UI instead):
 * - Portfolio dashboards and chart views
 * - Portfolio workload visualization
 *
 * @module portfolios
 */
module.exports = (client) => [
  {
    name: 'list_portfolios',
    description: 'List portfolios in a workspace (Business+ plan required). Portfolios are collections of projects used for high-level tracking and reporting across multiple initiatives. Requires both workspace and owner parameters — use "me" for owner to list your own portfolios. Returns paginated results (default 20, max 100). Portfolios contain projects (not tasks). Use opt_fields to control response size and include fields like color, members, dates, and status. Related: get_portfolio for full details, create_portfolio to make new portfolios, list_portfolio_items to see projects inside a portfolio.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID (required)' },
        owner: { type: 'string', description: 'User GID of portfolio owner. Use "me" for current user. Required by the API to scope results.' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,owner.name,color,members,created_at,due_on,start_on,current_status_update"' }
      },
      required: ['workspace', 'owner']
    },
    handler: async (args) => {
      const params = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) params[key] = value;
      }
      if (!params.limit) params.limit = 20;
      return await client.get('/portfolios', params);
    }
  },
  {
    name: 'get_portfolio',
    description: 'Get complete details of a portfolio by its GID (Business+ plan required). Returns name, owner, color, members, dates (start_on, due_on), custom field settings, workspace, and current status update. Use opt_fields to limit response and reduce payload size. Portfolios group projects for cross-initiative tracking and reporting. Related: list_portfolios to find GIDs, update_portfolio to modify, list_portfolio_items to see contained projects, list_portfolio_memberships for access details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,owner.name,color,members.name,due_on,start_on,custom_field_settings,current_status_update,workspace"' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/portfolios/${args.portfolio_gid}`, params);
    }
  },
  {
    name: 'create_portfolio',
    description: 'Create a portfolio to group projects for high-level / cross-initiative / program-level tracking — use for "create a LATAM Implementations 2026 portfolio to track all client projects", executive dashboards, multi-project reporting. Direct action — pass workspace by GID; do NOT call get_current_user or list_workspaces first. Optional: color (Asana palette dark-*/light-* + "none"), owner (defaults to caller), initial members, public visibility. start_on < due_on when both set. After creation, use add_item_to_portfolio to attach projects. Business+ plan. Related: update_portfolio, add_members_to_portfolio, add_item_to_portfolio, add_portfolio_custom_field_setting.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID (required)' },
        name: { type: 'string', description: 'Portfolio name (required)' },
        color: { type: 'string', enum: ['dark-pink', 'dark-green', 'dark-blue', 'dark-red', 'dark-teal', 'dark-brown', 'dark-orange', 'dark-purple', 'dark-warm-gray', 'light-pink', 'light-green', 'light-blue', 'light-red', 'light-teal', 'light-brown', 'light-orange', 'light-purple', 'light-warm-gray', 'none'], description: 'Portfolio color in Asana UI' },
        owner: { type: 'string', description: 'User GID for portfolio owner. Defaults to current user.' },
        members: { type: 'array', items: { type: 'string' }, description: 'Array of user GIDs to add as members' },
        public: { type: 'boolean', description: 'Whether portfolio is visible to workspace (default: true)' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => {
      const { opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/portfolios', data, { params });
    }
  },
  {
    name: 'update_portfolio',
    description: 'Update an existing portfolio (Business+ plan required). Modify name, color, owner, public visibility, and dates (start_on, due_on). Only provided fields are changed — omitted fields remain unchanged. start_on must be before due_on when both are set. Color uses standard Asana palette (dark-*/light-* variants + "none"). Related: get_portfolio to see current state, add_item_to_portfolio to manage projects, add_members_to_portfolio.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID to update' },
        name: { type: 'string', description: 'New portfolio name' },
        color: { type: 'string', enum: ['dark-pink', 'dark-green', 'dark-blue', 'dark-red', 'dark-teal', 'dark-brown', 'dark-orange', 'dark-purple', 'dark-warm-gray', 'light-pink', 'light-green', 'light-blue', 'light-red', 'light-teal', 'light-brown', 'light-orange', 'light-purple', 'light-warm-gray', 'none'], description: 'New portfolio color' },
        owner: { type: 'string', description: 'New owner user GID' },
        public: { type: 'boolean', description: 'Change portfolio visibility' },
        due_on: { type: 'string', description: 'Due date YYYY-MM-DD or null to clear' },
        start_on: { type: 'string', description: 'Start date YYYY-MM-DD or null to clear' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => {
      const { portfolio_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/portfolios/${portfolio_gid}`, data, { params });
    }
  },
  {
    name: 'delete_portfolio',
    description: 'Permanently delete a portfolio (Business+ plan required). DESTRUCTIVE: This action cannot be undone. The projects within the portfolio are NOT deleted — they simply lose the portfolio grouping and continue to exist independently. All portfolio memberships, custom field settings, and status updates associated with this portfolio are also removed. IMPORTANT (SALS): Requires Admin access. If you previously called add_members_to_portfolio with the authenticated user (self-add when already owner), your access is downgraded and delete will return 403. Always delete BEFORE modifying members. Related: update_portfolio to modify instead of deleting.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID to permanently delete' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => await client.delete(`/portfolios/${args.portfolio_gid}`)
  },
  {
    name: 'list_portfolio_items',
    description: 'List all items (projects) contained in a portfolio (Business+ plan required). Returns the projects that have been added to this portfolio. Portfolios contain projects only (not tasks or goals). Use this to understand what initiatives a portfolio tracks. Returns paginated results (default 20, max 100). Use opt_fields to include project details like owner, status, dates, and color. Related: add_item_to_portfolio, remove_item_from_portfolio, get_project for full project details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,owner.name,due_on,current_status_update,color,archived"' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => {
      const { portfolio_gid, ...params } = args;
      if (!params.limit) params.limit = 20;
      return await client.get(`/portfolios/${portfolio_gid}/items`, params);
    }
  },
  {
    name: 'add_item_to_portfolio',
    description: 'Attach an existing project to a portfolio for grouping / tracking — use for "add project Edenred Onboarding to LATAM Implementations portfolio", program-level rollup, exec dashboard composition. Direct action — pass portfolio and project by GID; do NOT call get_portfolio, list_portfolios, list_projects, or workspace_typeahead first. Portfolios contain projects only (not tasks/goals). A project can be in many portfolios simultaneously. Idempotent — re-adding is a no-op. Business+ plan. Related: remove_item_from_portfolio, list_portfolio_items, create_portfolio (make a new portfolio first).',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID to add the project to' },
        item: { type: 'string', description: 'Project GID to add to the portfolio' }
      },
      required: ['portfolio_gid', 'item']
    },
    handler: async (args) => {
      const { portfolio_gid, item } = args;
      return await client.post(`/portfolios/${portfolio_gid}/addItem`, { item });
    }
  },
  {
    name: 'remove_item_from_portfolio',
    description: 'Remove a project from a portfolio (Business+ plan required). The project itself is NOT deleted — it is only removed from this portfolio grouping and continues to exist independently. If the project belongs to other portfolios, those associations are unaffected. Related: add_item_to_portfolio, list_portfolio_items.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID to remove the project from' },
        item: { type: 'string', description: 'Project GID to remove from the portfolio' }
      },
      required: ['portfolio_gid', 'item']
    },
    handler: async (args) => {
      const { portfolio_gid, item } = args;
      return await client.post(`/portfolios/${portfolio_gid}/removeItem`, { item });
    }
  },
  {
    name: 'add_members_to_portfolio',
    description: 'Grant people view/edit access to a portfolio — use for "give Ximena view access to portfolio 5050", sharing program views with stakeholders, opening exec dashboards to leads. Direct action — pass portfolio and users by GID; do NOT call get_portfolio, list_users, or get_current_user first. Members can view/edit contents and settings; owner has full control (deletion etc). CRITICAL: Adding the authenticated user (yourself) when you ARE the owner DOWNGRADES your access from admin to editor — causes 403 on delete and other admin ops, IRREVERSIBLE via API. Only add OTHER users. Business+ plan. Related: remove_members_from_portfolio, get_portfolio (current members).',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        members: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to add as portfolio members'
        }
      },
      required: ['portfolio_gid', 'members']
    },
    handler: async (args) => {
      const { portfolio_gid, members } = args;
      return await client.post(`/portfolios/${portfolio_gid}/addMembers`, { members });
    }
  },
  {
    name: 'remove_members_from_portfolio',
    description: 'Remove members from a portfolio (Business+ plan required). Removed members lose direct portfolio access unless they have workspace-level visibility (public portfolios). Pass an array of user GIDs. CRITICAL WARNING (SALS): Removing yourself strips your portfolio membership entirely, causing 403 on ALL subsequent operations (including delete). This is IRREVERSIBLE via API — even workspace super admins cannot regain access. Always perform all portfolio operations BEFORE removing yourself. Related: add_members_to_portfolio, get_portfolio to see current members.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        members: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to remove from the portfolio'
        }
      },
      required: ['portfolio_gid', 'members']
    },
    handler: async (args) => {
      const { portfolio_gid, members } = args;
      return await client.post(`/portfolios/${portfolio_gid}/removeMembers`, { members });
    }
  },
];
