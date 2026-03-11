/**
 * Time Period Tools - Fiscal Periods for Goal Alignment
 *
 * Time periods represent fiscal calendar periods (FY, H1/H2, Q1-Q4, custom) configured
 * by workspace admins. They are used to align goals with organizational planning cadences.
 * Time periods are read-only via API — they are configured in the Asana UI.
 *
 * Plan requirements: Business+ (time periods are part of the Goals feature)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - Time periods are READ-ONLY via API (cannot create, update, or delete)
 * - Fiscal year configuration in Asana UI affects period boundaries
 * - Cadences: FY (fiscal year), H1/H2 (half-year), Q1-Q4 (quarterly), custom
 * - Time periods have parent relationships (Q1 parent is H1, H1 parent is FY)
 *
 * NOT possible via API (use Asana UI instead):
 * - Creating or modifying time periods
 * - Configuring fiscal year start month
 * - Creating custom cadences
 *
 * @module time-periods
 */
module.exports = (client) => [
  {
    name: 'get_time_period',
    description: 'Get details of a time period by its GID (Business+ plan required). Time periods represent fiscal calendar periods configured in the Asana UI (e.g., FY2025, H1 2025, Q1 2025). Returns display_name, start_on, end_on, period type, and parent period. Cadences: FY (fiscal year), H1/H2 (half-year), Q1-Q4 (quarterly). Time periods form a hierarchy — quarters belong to halves, halves belong to fiscal years. Time periods are READ-ONLY via API; they cannot be created or modified. Related: list_workspace_time_periods to find available periods, create_goal with time_period to assign a goal to a period.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        time_period_gid: { type: 'string', description: 'Time period GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "display_name,start_on,end_on,period,parent"' }
      },
      required: ['time_period_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/time_periods/${args.time_period_gid}`, params);
    }
  },
  {
    name: 'list_workspace_time_periods',
    description: 'List time periods for a workspace (Business+ plan required). Time periods are fiscal calendar periods configured by workspace admins in the Asana UI. Cadences: FY (fiscal year), H1/H2 (half-year), Q1-Q4 (quarterly), custom. Filter by start_on and end_on to find periods overlapping a specific timeframe. Fiscal year configuration (e.g., starting in January vs April) affects period boundaries. Time periods are READ-ONLY — use this to discover available periods for goal alignment. Returns paginated results (default 20, max 100). Related: get_time_period for details, create_goal with time_period, list_goals with time_periods filter.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID (required)' },
        start_on: { type: 'string', description: 'Filter periods starting on or after this date (YYYY-MM-DD)' },
        end_on: { type: 'string', description: 'Filter periods ending on or before this date (YYYY-MM-DD)' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "display_name,start_on,end_on,period,parent.display_name"' }
      },
      required: ['workspace_gid']
    },
    handler: async (args) => {
      const { workspace_gid, ...params } = args;
      params.workspace = workspace_gid;
      if (!params.limit) params.limit = 20;
      return await client.get('/time_periods', params);
    }
  }
];
