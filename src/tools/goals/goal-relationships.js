/**
 * Goal Relationship Tools - Linking Goals to Supporting Resources
 *
 * Goal relationships define the hierarchical links between a parent goal and its
 * supporting resources. Supporting resources can be sub-goals, projects, or portfolios.
 * Each relationship has a contribution_weight (0-1) controlling progress impact.
 *
 * Plan requirements: Business+ (all goal relationship features)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - Relationship types: subgoal (another goal), project, portfolio
 * - Contribution weights should ideally sum to 1 across all supporting resources
 * - contribution_weight requires BOTH parent and child to have compatible metrics,
 *   AND parent must use subgoal-based progress (progress_source="subgoal_progress")
 * - Removing a relationship does NOT delete the supporting resource
 *
 * SALS (Goal Access Levels, enforced Feb 2026):
 * - Creating/modifying relationships requires Editor or Admin access on the goal
 * - remove_goal_followers(self) strips membership → 403 on all relationship ops
 * - Always perform relationship operations BEFORE removing yourself as follower
 *
 * NOT possible via API (use Asana UI instead):
 * - Automatic roll-up metric formulas from sub-goals
 *
 * @module goal-relationships
 */
module.exports = (client) => [
  {
    name: 'get_goal_relationship',
    description: 'Get details of a goal relationship by its GID (Business+ plan required). Goal relationships link a parent goal to supporting resources (sub-goals, projects, or portfolios). Returns the relationship type (resource_subtype: subgoal, project, portfolio), the supporting resource, contribution_weight (0-1), and the supported (parent) goal. Contribution weight controls how much the supporting resource affects parent goal progress. Related: list_goal_relationships to find relationship GIDs, update_goal_relationship to change contribution weight.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_relationship_gid: { type: 'string', description: 'Goal relationship GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "resource_subtype,supporting_resource.name,contribution_weight,supported_goal.name,supported_goal.owner.name"' }
      },
      required: ['goal_relationship_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/goal_relationships/${args.goal_relationship_gid}`, params);
    }
  },
  {
    name: 'update_goal_relationship',
    description: 'Update a goal relationship (Business+ plan required). Currently the main updatable field is contribution_weight, which controls how much the supporting resource contributes to the parent goal progress (0 = no contribution, 1 = full contribution). Weights across all supporting resources for a goal should ideally sum to 1.0. IMPORTANT: contribution_weight requires BOTH the parent and child goals to have compatible metrics, AND the parent goal must use subgoal-based progress tracking (progress_source="subgoal_progress", set via create_goal_metric without manual values). If the parent has a manual metric (with initial/current/target values), contribution_weight returns 400 "child_goal_cannot_contribute_progress_to_parent_goal". Related: get_goal_relationship to see current weight, list_goal_relationships.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_relationship_gid: { type: 'string', description: 'Goal relationship GID to update' },
        contribution_weight: { type: 'number', description: 'Contribution weight (0-1). Controls how much this supporting resource affects the parent goal progress. Example: 0.5 means 50% contribution.' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['goal_relationship_gid']
    },
    handler: async (args) => {
      const { goal_relationship_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/goal_relationships/${goal_relationship_gid}`, data, { params });
    }
  },
  {
    name: 'list_goal_relationships',
    description: 'List all relationships for a goal (Business+ plan required). Returns supporting resources (sub-goals, projects, portfolios) that contribute to this goal, along with their contribution weights and relationship types. Use this to understand what drives progress toward a goal. Filter by resource_subtype: "subgoal" (supporting goals), "project" (supporting projects), "portfolio" (supporting portfolios). Each relationship includes contribution_weight (0-1) showing relative impact on parent goal. Returns paginated results (default 20, max 100). Related: create_goal_relationship, get_goal_relationship for details, add_supporting_goal_relationship.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID to list relationships for' },
        resource_subtype: { type: 'string', enum: ['subgoal', 'project', 'portfolio'], description: 'Filter by relationship type. subgoal = supporting goals, project = supporting projects, portfolio = supporting portfolios.' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "resource_subtype,supporting_resource.name,contribution_weight,supported_goal.name"' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => {
      const { goal_gid, ...params } = args;
      params.supported_goal = goal_gid;
      if (!params.limit) params.limit = 20;
      return await client.get('/goal_relationships', params);
    }
  },
  {
    name: 'create_goal_relationship',
    description: 'Create a goal relationship linking a supporting resource to a goal (Business+ plan required). The supporting resource can be another goal (subgoal), a project (supporting_work), or a portfolio (supporting_work). Optionally set contribution_weight (0-1) to control how much this resource affects parent goal progress. Use insertion_before/insertion_after to control ordering among sibling relationships. IMPORTANT (SALS): Requires Editor or Admin access on the goal. If you previously called remove_goal_followers on yourself, you will get 403. NOTE: contribution_weight requires parent goal to have subgoal-based progress tracking (progress_source="subgoal_progress") and compatible metrics on both goals. Related: list_goal_relationships, update_goal_relationship to change weight, add_supporting_goal_relationship for a simpler alternative.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Parent goal GID to create the relationship on' },
        supporting_resource: { type: 'string', description: 'GID of the supporting resource (goal, project, or portfolio) to link' },
        contribution_weight: { type: 'number', description: 'Contribution weight (0-1). Controls how much this resource affects parent goal progress. Example: 0.25 means 25% contribution.' },
        insertion_before: { type: 'string', description: 'Goal relationship GID to insert before (for ordering)' },
        insertion_after: { type: 'string', description: 'Goal relationship GID to insert after (for ordering)' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['goal_gid', 'supporting_resource']
    },
    handler: async (args) => {
      const { goal_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/goals/${goal_gid}/addSupportingRelationship`, data, { params });
    }
  }
];
