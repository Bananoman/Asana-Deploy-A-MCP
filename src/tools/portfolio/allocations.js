/**
 * Allocation Tools - Resource Allocation Management
 *
 * Allocations represent how much effort (as a percentage) a person is assigned to a
 * project over a specific date range. They are used for capacity planning and resource
 * management to ensure team members are not over-allocated across projects.
 *
 * Plan requirements: Business/Enterprise (resource management feature)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - effort (percent_effort) is a percentage from 0-100
 * - start_date and end_date define the allocation period (end_date >= start_date)
 * - Allocations link users to projects — cannot allocate to tasks or goals
 * - Cannot change assignee or project on existing allocation (delete and recreate)
 * - Date ranges should not overlap for the same assignee-project combination
 *
 * NOT possible via API (use Asana UI instead):
 * - Workload visualization and capacity charts
 * - Automatic over-allocation warnings
 *
 * @module allocations
 */
module.exports = (client) => [
  {
    name: 'list_allocations',
    description: 'List resource allocations (Business/Enterprise plan required). Allocations represent how much effort (0-100%) a person is assigned to a project over a date range. Used for capacity planning and resource management. Filter by assignee (user GID or "me"), workspace, project, parent (project or portfolio), or date range (start_on, end_on). Either parent OR (assignee + workspace) is required. Returns paginated results (default 20, max 100). Related: get_allocation for details, create_allocation to assign resources, list_projects to find project GIDs.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        assignee: { type: 'string', description: 'User GID to filter allocations by assignee. Use "me" for current user.' },
        parent: { type: 'string', description: 'Parent resource GID (project or portfolio). Required unless both assignee and workspace are provided.' },
        workspace: { type: 'string', description: 'Workspace GID to filter allocations. Required with assignee if parent is not provided.' },
        project: { type: 'string', description: 'Project GID to filter allocations for a specific project' },
        start_on: { type: 'string', description: 'Filter allocations starting on or after this date (YYYY-MM-DD)' },
        end_on: { type: 'string', description: 'Filter allocations ending on or before this date (YYYY-MM-DD)' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "assignee.name,project.name,start_on,end_on,effort.type,effort.value,parent,created_by.name"' }
      }
    },
    handler: async (args) => {
      const params = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) params[key] = value;
      }
      if (!params.limit) params.limit = 20;
      return await client.get('/allocations', params);
    }
  },
  {
    name: 'get_allocation',
    description: 'Get details of a single allocation by its GID (Business/Enterprise plan required). Returns the assignee, project, date range (start_on, end_on), effort percentage (0-100), parent resource, and creator. Allocations are part of Asana resource management for capacity planning. Use opt_fields to control response and reduce payload. Related: list_allocations to find allocation GIDs, update_allocation to modify, delete_allocation to remove.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        allocation_gid: { type: 'string', description: 'Allocation GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "assignee.name,project.name,start_on,end_on,effort.type,effort.value,parent,created_by.name,resource_subtype"' }
      },
      required: ['allocation_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/allocations/${args.allocation_gid}`, params);
    }
  },
  {
    name: 'create_allocation',
    description: 'Create a new resource allocation (Business/Enterprise plan required). Assigns a person to a project with a specific effort level (percent_effort 0-100%) over a date range. Effort represents the percentage of the person\'s time dedicated to this project. Requires assignee (user GID), project GID, start_date, and end_date (YYYY-MM-DD). end_date must be on or after start_date. Date ranges should not overlap with existing allocations for the same assignee-project combination. Useful for capacity planning and preventing over-allocation. Related: list_allocations to check existing allocations, update_allocation, delete_allocation.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        assignee: { type: 'string', description: 'User GID to allocate (required)' },
        parent: { type: 'string', description: 'Project GID to allocate the user to (required)' },
        start_date: { type: 'string', description: 'Allocation start date in YYYY-MM-DD format (required)' },
        end_date: { type: 'string', description: 'Allocation end date in YYYY-MM-DD format (required). Must be on or after start_date.' },
        effort: {
          type: 'object',
          description: 'Effort object. Example: { "type": "percent", "value": 50 }',
          properties: {
            type: { type: 'string', enum: ['percent'], description: 'Effort type (currently only "percent")' },
            value: { type: 'number', description: 'Effort value (0-100 for percent type)' }
          }
        },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['assignee', 'parent', 'start_date', 'end_date']
    },
    handler: async (args) => {
      const { opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/allocations', data, { params });
    }
  },
  {
    name: 'update_allocation',
    description: 'Update an existing resource allocation (Business/Enterprise plan required). Modify the date range (start_date, end_date) or effort percentage (percent_effort 0-100). Only provided fields are changed — omitted fields remain unchanged. IMPORTANT: Cannot change the assignee or project on an existing allocation — delete and recreate instead. end_date must be on or after start_date. Related: get_allocation to see current state, delete_allocation to remove.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        allocation_gid: { type: 'string', description: 'Allocation GID to update' },
        start_date: { type: 'string', description: 'New start date YYYY-MM-DD' },
        end_date: { type: 'string', description: 'New end date YYYY-MM-DD' },
        effort: {
          type: 'object',
          description: 'Effort object. Example: { "type": "percent", "value": 75 }',
          properties: {
            type: { type: 'string', enum: ['percent'] },
            value: { type: 'number', description: 'Effort value (0-100)' }
          }
        },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['allocation_gid']
    },
    handler: async (args) => {
      const { allocation_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/allocations/${allocation_gid}`, data, { params });
    }
  },
  {
    name: 'delete_allocation',
    description: 'Delete a resource allocation (Business/Enterprise plan required). DESTRUCTIVE: Permanently removes the effort assignment for a person on a project. This action cannot be undone. The user and project are not affected — only the allocation link is removed. If you need to change the assignee or project, delete and recreate the allocation. Related: update_allocation to modify dates/effort instead of deleting, list_allocations to find allocation GIDs.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        allocation_gid: { type: 'string', description: 'Allocation GID to permanently delete' }
      },
      required: ['allocation_gid']
    },
    handler: async (args) => await client.delete(`/allocations/${args.allocation_gid}`)
  }
];
