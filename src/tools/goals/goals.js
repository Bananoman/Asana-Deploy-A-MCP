/**
 * Goal Tools - Complete CRUD + Followers + Relationships + Metrics
 *
 * Goals represent high-level strategic objectives that organizations track over time.
 * Each goal can have metrics (number, percentage, currency) for measurable progress,
 * time periods for fiscal alignment, and supporting resources (projects, portfolios, sub-goals).
 *
 * Plan requirements: Business+ (all goal features require Business or Enterprise plan)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - Open goal statuses: green (on_track), yellow (at_risk), red (off_track)
 * - Closed goal statuses: achieved, partial, missed, dropped
 * - Goals belong to time periods (FY, H1, H2, Q1-Q4) configured in Asana UI
 * - Goals can be workspace-level or team-level (set team for team-level)
 * - Metrics use current_number_value and target_number_value for progress
 *
 * CRITICAL - Goal Access Levels (SALS, enforced Feb 2026):
 * - Goals have per-goal membership with access levels: admin, editor, commenter, viewer
 * - Workspace super admin does NOT automatically get admin access on individual goals
 * - DANGER: remove_goal_followers(self) strips your goal membership entirely,
 *   causing 403 on ALL subsequent write operations (including delete)
 * - Order of operations matters: do ALL write operations (metrics, relationships,
 *   delete) BEFORE calling remove_goal_followers
 * - Setting a metric (setMetric) switches progress to manual mode, which prevents
 *   sub-goals from contributing progress via contribution_weight
 * - For sub-goal progress: set progress_source="subgoal_progress" on parent metric
 *   (without initial/current/target values)
 *
 * NOT possible via API (use Asana UI instead):
 * - Creating goal metric formulas (roll-up calculations)
 * - Configuring time period cadences (fiscal year setup)
 *
 * @module goals
 */
module.exports = (client) => [
  {
    name: 'list_goals',
    description: 'List goals in a workspace (Business+ plan required). Goals are strategic objectives with status tracking, metrics, and time period alignment. Filter by workspace (required), team, project, portfolio, time_periods array, or is_workspace_level flag. Open goal statuses: green (on_track), yellow (at_risk), red (off_track). Closed statuses: achieved, partial, missed, dropped. Goals can have metrics (number/percentage/currency) to measure progress. Returns paginated results (default 20, max 100). Use opt_fields to control response size. Related: get_goal for full details, create_goal to make new goals, list_goal_relationships to see supporting resources.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID (required)' },
        team: { type: 'string', description: 'Team GID to filter goals by team ownership' },
        project: { type: 'string', description: 'Project GID to filter goals supported by this project' },
        portfolio: { type: 'string', description: 'Portfolio GID to filter goals supported by this portfolio' },
        time_periods: { type: 'array', items: { type: 'string' }, description: 'Array of time period GIDs to filter goals by fiscal period (FY, H1, H2, Q1-Q4)' },
        is_workspace_level: { type: 'boolean', description: 'Filter for workspace-level goals (true) or team-level goals (false)' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,owner.name,notes,status,current_status_update,time_period.display_name,metric,team.name,followers,num_likes,liked"' }
      },
      required: ['workspace']
    },
    handler: async (args) => {
      const params = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) params[key] = value;
      }
      if (!params.limit) params.limit = 20;
      return await client.get('/goals', params);
    }
  },
  {
    name: 'get_goal',
    description: 'Get complete details of a goal by its GID (Business+ plan required). Returns name, owner, notes, status, metric (current_number_value/target_number_value), time period, team, followers, and supporting resources. Open statuses: green (on_track), yellow (at_risk), red (off_track). Closed statuses: achieved, partial, missed, dropped. Metrics can be number, percentage, or currency type. Use opt_fields to control response and reduce payload. Related: list_goals to find GIDs, update_goal to modify, list_goal_relationships for supporting goals/projects, get_parent_goals for hierarchy.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,owner.name,notes,html_notes,status,current_status_update,time_period.display_name,metric,team.name,followers.name,workspace,num_likes,liked"' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/goals/${args.goal_gid}`, params);
    }
  },
  {
    name: 'create_goal',
    description: 'Create an OKR / strategic goal / objective — use for "create the OKR Reach 50 paying customers by Q4", quarterly planning, fiscal targets. Direct action — pass workspace by GID; do NOT call list_workspaces or get_current_user first. Set is_workspace_level=true for org-wide goals OR team GID for team-level. Optional: time_period (FY/H1/H2/Q1-Q4 fiscal alignment). Status values: on_track, at_risk, off_track, achieved, partial, missed, dropped. After creation, use create_goal_metric for numeric progress (number/percentage/currency). Business+ plan. Related: update_goal, create_goal_metric (tracking), add_goal_followers, add_supporting_goal_relationship (parent/child).',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID (required)' },
        name: { type: 'string', description: 'Goal name (required)' },
        notes: { type: 'string', description: 'Plain text goal description' },
        html_notes: { type: 'string', description: 'Rich HTML description. Wrap in <body> tags. Overrides notes.' },
        owner: { type: 'string', description: 'User GID for goal owner' },
        time_period: { type: 'string', description: 'Time period GID for fiscal alignment (FY, H1, H2, Q1-Q4). Use list_workspace_time_periods to find available periods.' },
        team: { type: 'string', description: 'Team GID. If set, this becomes a team-level goal. Omit for workspace-level goal.' },
        is_workspace_level: { type: 'boolean', description: 'Whether this is a workspace-level goal (true) or team-level (false). Set team for team-level goals.' },
        due_on: { type: 'string', description: 'Goal due date YYYY-MM-DD' },
        start_on: { type: 'string', description: 'Goal start date YYYY-MM-DD' },
        status: { type: 'string', enum: ['on_track', 'at_risk', 'off_track', 'achieved', 'partial', 'missed', 'dropped'], description: 'Current goal status' },
        liked: { type: 'boolean', description: 'Whether the current user likes this goal' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => {
      const { opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/goals', data, { params });
    }
  },
  {
    name: 'update_goal',
    description: 'Update an existing goal (Business+ plan required). Modify name, notes, status, owner, time period, team, dates, and more. Only provided fields are changed — omitted fields remain unchanged. Open statuses: on_track (green), at_risk (yellow), off_track (red). Closed statuses: achieved, partial, missed, dropped. To update metric progress, use update_goal_metric instead. To change the time period, provide a new time_period GID (use list_workspace_time_periods to find available periods). Related: get_goal to see current state, update_goal_metric to change progress values, create_status_update for detailed status updates.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID to update' },
        name: { type: 'string', description: 'New goal name' },
        notes: { type: 'string', description: 'New plain text description' },
        html_notes: { type: 'string', description: 'New rich HTML description' },
        owner: { type: 'string', description: 'New owner user GID' },
        status: { type: 'string', enum: ['on_track', 'at_risk', 'off_track', 'achieved', 'partial', 'missed', 'dropped'], description: 'New goal status' },
        time_period: { type: 'string', description: 'New time period GID' },
        team: { type: 'string', description: 'New team GID' },
        due_on: { type: 'string', description: 'New due date YYYY-MM-DD or null to clear' },
        start_on: { type: 'string', description: 'New start date YYYY-MM-DD or null to clear' },
        liked: { type: 'boolean', description: 'Whether the current user likes this goal' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => {
      const { goal_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/goals/${goal_gid}`, data, { params });
    }
  },
  {
    name: 'delete_goal',
    description: 'Permanently delete a goal (Business+ plan required). DESTRUCTIVE: This action cannot be undone. All goal relationships, metrics, and status updates associated with this goal are also removed. Sub-goals and supporting resources are NOT deleted — only the links are broken. Consider updating the goal status to "dropped" or "missed" instead of deleting to preserve history. IMPORTANT (SALS): You must have Admin access on the goal to delete it. If you previously called remove_goal_followers on yourself, you will get 403 — delete the goal BEFORE removing yourself as follower. Related: update_goal to modify instead of deleting.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID to permanently delete' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => await client.delete(`/goals/${args.goal_gid}`)
  },
  {
    name: 'add_goal_followers',
    description: 'Subscribe people to notifications on an OKR / goal — use for "subscribe me to updates on the company OKR 1234", "follow this goal for status changes", stakeholder visibility on strategic objectives. Direct action — pass goal and users by GID; do NOT call get_goal or get_current_user first. Followers get notifications on status updates, metric changes, comments. Idempotent — re-adding is no-op. Business+ plan. Related: remove_goal_followers, get_goal (current followers), add_supporting_goal_relationship (link sub-goals).',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to add as goal followers'
        }
      },
      required: ['goal_gid', 'followers']
    },
    handler: async (args) => {
      const { goal_gid, followers } = args;
      return await client.post(`/goals/${goal_gid}/addFollowers`, { followers });
    }
  },
  {
    name: 'remove_goal_followers',
    description: 'Remove followers from a goal (Business+ plan required). Removed followers stop receiving notifications about this goal. Pass an array of user GIDs. Removing a user who is not a follower is a no-op. CRITICAL WARNING (SALS): Removing yourself as follower strips your goal membership entirely, causing 403 "goal_write_access_failure" on ALL subsequent write operations (addSupportingRelationship, delete, update, setMetric). This is IRREVERSIBLE via API — even workspace super admins cannot regain access. Always perform all write operations BEFORE removing yourself as follower. Related: add_goal_followers, get_goal to see current followers.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to remove from goal followers'
        }
      },
      required: ['goal_gid', 'followers']
    },
    handler: async (args) => {
      const { goal_gid, followers } = args;
      return await client.post(`/goals/${goal_gid}/removeFollowers`, { followers });
    }
  },
  {
    name: 'create_goal_metric',
    description: 'Set a metric on a goal for measurable progress tracking (Business+ plan required). Metrics define how goal completion is measured — as a number, percentage, or currency value with initial, current, and target values. Unit types: "none" (plain number), "percentage" (0-100%), "currency" (requires currency_code like "USD"). This calls POST /goals/{goal_gid}/setMetric. Once set, use update_goal_metric to report progress. IMPORTANT: Setting a metric switches the goal to manual progress tracking — sub-goals can no longer contribute progress via contribution_weight. For sub-goal-based progress, set progress_source="subgoal_progress" without initial/current/target values. NOTE: Metric formulas (roll-up calculations) cannot be created via API — use Asana UI. Related: update_goal_metric to change current value, get_goal to see current metric.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID to set the metric on' },
        metric: {
          type: 'object',
          description: 'Metric definition object',
          properties: {
            resource_subtype: { type: 'string', enum: ['number'], description: 'Metric type. Currently only "number" is supported.' },
            precision: { type: 'number', description: 'Number of decimal places (0-6, default 0)' },
            unit: { type: 'string', enum: ['none', 'currency', 'percentage'], description: 'Unit type for the metric display' },
            currency_code: { type: 'string', description: 'ISO 4217 currency code (e.g., "USD", "EUR"). Required when unit is "currency".' },
            initial_number_value: { type: 'number', description: 'Starting value of the metric (baseline)' },
            target_number_value: { type: 'number', description: 'Target value the metric aims to reach' },
            current_number_value: { type: 'number', description: 'Current progress value of the metric' }
          }
        },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['goal_gid', 'metric']
    },
    handler: async (args) => {
      const { goal_gid, opt_fields, metric } = args;
      // Ensure precision has a default value as Asana API requires it
      if (metric && metric.precision === undefined) {
        metric.precision = 0;
      }
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      // Asana expects metric fields at top level, not wrapped in {metric}
      return await client.post(`/goals/${goal_gid}/setMetric`, metric, { params });
    }
  },
  {
    name: 'update_goal_metric',
    description: 'Update the current progress value of a goal metric (Business+ plan required). Sets current_number_value on an existing metric. The goal must already have a metric configured via create_goal_metric. This calls POST /goals/{goal_gid}/setMetricCurrentValue. Use this to report incremental progress — for example, updating revenue from 50000 to 75000 toward a 100000 target. The metric type (number/percentage/currency) is defined when the metric is created. Related: create_goal_metric to set up the metric initially, get_goal to see current metric values.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID to update the metric value on' },
        current_number_value: { type: 'number', description: 'New current value of the metric (required)' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['goal_gid', 'current_number_value']
    },
    handler: async (args) => {
      const { goal_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/goals/${goal_gid}/setMetricCurrentValue`, data, { params });
    }
  },
  {
    name: 'add_supporting_goal_relationship',
    description: 'Link a sub-goal, project, or portfolio as a contributor to a parent OKR / goal — use for "make goal Hit Series A the parent of goal Reach 50 customers", building OKR hierarchies, cascading objectives, parent/child goal trees. Direct action — pass goals/resource by GID; do NOT call get_goal or list_goal_relationships first. Relationship types: subgoal (another goal), supporting_work (project or portfolio). Optional contribution_weight (0-1) controls parent-progress impact. Requires Editor/Admin access on the goal — add relationships BEFORE removing yourself as follower (or you get 403). contribution_weight needs compatible parent/child metrics + subgoal-based tracking. Business+ plan. Related: remove_supporting_goal_relationship, list_goal_relationships, create_goal_relationship (more options).',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Parent goal GID to add the supporting relationship to' },
        supporting_resource: { type: 'string', description: 'GID of the supporting resource (goal, project, or portfolio)' },
        contribution_weight: { type: 'number', description: 'Weight of this resources contribution (0-1). Controls how much this resource contributes to the parent goal progress.' },
        insertion_before: { type: 'string', description: 'Goal relationship GID to insert before (for ordering)' },
        insertion_after: { type: 'string', description: 'Goal relationship GID to insert after (for ordering)' }
      },
      required: ['goal_gid', 'supporting_resource']
    },
    handler: async (args) => {
      const { goal_gid, ...data } = args;
      return await client.post(`/goals/${goal_gid}/addSupportingRelationship`, data);
    }
  },
  {
    name: 'remove_supporting_goal_relationship',
    description: 'Remove a supporting resource relationship from a goal (Business+ plan required). The supporting resource itself (goal, project, or portfolio) is NOT deleted — only the hierarchical link to the parent goal is removed. The resource continues to exist independently. Related: add_supporting_goal_relationship, list_goal_relationships.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Parent goal GID to remove the relationship from' },
        supporting_resource: { type: 'string', description: 'GID of the supporting resource (goal, project, or portfolio) to unlink' }
      },
      required: ['goal_gid', 'supporting_resource']
    },
    handler: async (args) => {
      const { goal_gid, supporting_resource } = args;
      return await client.post(`/goals/${goal_gid}/removeSupportingRelationship`, {
        supporting_resource
      });
    }
  },
  {
    name: 'get_parent_goals',
    description: 'Get the parent goals of a goal (Business+ plan required). Returns goals that this goal supports or contributes to in the goal hierarchy. A goal can support multiple parent goals simultaneously, forming a many-to-many hierarchy. Use this to navigate upward in the goal tree. Related: list_goal_relationships for all relationships including projects/portfolios, add_supporting_goal_relationship to create links.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID to get parent goals for' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,owner.name,status,time_period.display_name"' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/goals/${args.goal_gid}/parentGoals`, params);
    }
  },
];
