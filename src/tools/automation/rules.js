/**
 * Automation Tools - Rules CRUD & Manual Trigger
 *
 * Rules automate actions in projects when specific trigger conditions are met.
 * Each rule has ONE trigger and ONE action via the API (the Asana UI allows multiple
 * actions per rule, but the API is limited to one trigger + one action).
 *
 * Plan requirements: Business+ (rules are a premium feature)
 * Rate limits: Standard (1500 req/min paid, 150 req/min free)
 *
 * Key constraints:
 * - Rules do NOT fire on changes made via the API — only UI-initiated changes trigger them
 * - Cannot change trigger or action type on an existing rule — must delete and recreate
 * - Rules are NOT included when duplicating projects or instantiating templates via API
 * - Limited trigger/action types compared to the Asana UI
 *
 * NOT possible via API (use Asana UI instead):
 * - Creating AI-powered or AI Studio rules
 * - Creating conditional/branching logic in rules
 * - Creating rules with multiple actions
 *
 * @module rules
 */

module.exports = (client) => [
  {
    name: 'get_rule',
    description: 'Get a rule by GID. Returns the rule definition including trigger configuration, action configuration, enabled status, and metadata. Use this to inspect what a rule does before updating or cloning it. Each rule has exactly one trigger and one action (API limitation). Rules do NOT fire on API-initiated changes, only UI changes. Related: list_project_rules to find rule GIDs, update_rule to modify, trigger_rule to run manually.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'The globally unique identifier for the rule' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "name,enabled,trigger,action,created_at,modified_at"' }
      },
      required: ['rule_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/rules/${args.rule_gid}`, params);
    }
  },

  {
    name: 'list_project_rules',
    description: 'List all automation rules configured in a project. Returns each rule with its trigger type, action type, and enabled status. Use this to audit existing automation, find rules to clone, or check for conflicts before adding new rules. Note: rules do NOT fire on API-initiated changes and are NOT copied when duplicating projects via API. Related: get_rule for full details, create_rule to add new automation, audit_project_rules for a summary report.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID whose rules to list' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from a previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "name,enabled,trigger,action,created_at"' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, ...params } = args;
      if (!params.limit) params.limit = 20;
      return await client.get(`/projects/${project_gid}/rules`, params);
    }
  },

  {
    name: 'create_rule',
    description: 'Create an automation rule in a project — use for "when a task is moved to Done auto-assign the QA lead", "auto-tag when added to project", due-date alerts. Direct action — pass project by GID; do NOT call list_project_rules or get_project first. ONE trigger + ONE action per rule (API limitation). Rules fire only on UI-initiated changes, NOT API changes. Cannot create AI-powered or branching/conditional rules via API. Triggers: task_added_to_project, task_moved_to_section (needs section GID), task_completed, task_uncompleted, custom_field_changed (needs field GID), due_date_approaching, assignee_changed, attachment_added. Actions: assign_task, add_follower, set_custom_field, add_tag, move_to_section, add_comment, complete_task, uncomplete_task, set_due_date, clear_due_date. Related: list_project_rules, trigger_rule (manual fire), setup_kanban_workflow / setup_sprint_workflow (pre-built templates), audit_project_rules.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID to add the rule to' },
        name: { type: 'string', description: 'Human-readable rule name (e.g., "Auto-assign new tasks to PM")' },
        trigger_type: {
          type: 'string',
          description: 'The event that fires this rule. task_moved_to_section requires trigger_section_gid. custom_field_changed requires trigger_custom_field_gid.',
          enum: [
            'task_added_to_project',
            'task_moved_to_section',
            'task_completed',
            'task_uncompleted',
            'custom_field_changed',
            'due_date_approaching',
            'assignee_changed',
            'attachment_added'
          ]
        },
        trigger_section_gid: { type: 'string', description: 'Section GID - required when trigger_type is task_moved_to_section' },
        trigger_custom_field_gid: { type: 'string', description: 'Custom field GID - required when trigger_type is custom_field_changed' },
        action_type: {
          type: 'string',
          description: 'The action to perform when trigger fires. Each action type requires specific action_* parameters (see parameter descriptions).',
          enum: [
            'assign_task',
            'add_follower',
            'set_custom_field',
            'add_tag',
            'move_to_section',
            'add_comment',
            'complete_task',
            'uncomplete_task',
            'set_due_date',
            'clear_due_date'
          ]
        },
        action_assignee_gid: { type: 'string', description: 'User GID to assign - required for assign_task action' },
        action_follower_gid: { type: 'string', description: 'User GID to add as follower - required for add_follower action' },
        action_section_gid: { type: 'string', description: 'Section GID to move task to - required for move_to_section action' },
        action_comment_text: { type: 'string', description: 'Comment text to add to task - required for add_comment action' },
        action_tag_gid: { type: 'string', description: 'Tag GID to add to task - required for add_tag action' },
        action_custom_field_gid: { type: 'string', description: 'Custom field GID - required for set_custom_field action (also requires action_custom_field_value)' },
        action_custom_field_value: { type: 'string', description: 'Value to set on custom field - required for set_custom_field action (also requires action_custom_field_gid)' }
      },
      required: ['project_gid', 'name', 'trigger_type', 'action_type']
    },
    handler: async (args) => {
      const trigger = { type: args.trigger_type };
      if (args.trigger_section_gid) trigger.section = args.trigger_section_gid;
      if (args.trigger_custom_field_gid) trigger.custom_field = args.trigger_custom_field_gid;

      const action = { type: args.action_type };
      if (args.action_assignee_gid) action.assignee = args.action_assignee_gid;
      if (args.action_follower_gid) action.follower = args.action_follower_gid;
      if (args.action_section_gid) action.section = args.action_section_gid;
      if (args.action_comment_text) action.text = args.action_comment_text;
      if (args.action_tag_gid) action.tag = args.action_tag_gid;
      if (args.action_custom_field_gid && args.action_custom_field_value) {
        action.custom_field = args.action_custom_field_gid;
        action.value = args.action_custom_field_value;
      }

      return await client.post(`/projects/${args.project_gid}/rules`, {
        name: args.name,
        trigger,
        action
      });
    }
  },

  {
    name: 'update_rule',
    description: 'Update an existing rule name or enabled status. Disabling a rule keeps its configuration but stops it from firing. IMPORTANT: you cannot change trigger or action types on an existing rule — you must delete and recreate the rule instead. Only name and enabled fields can be modified. Related: get_rule to see current config, delete_rule to remove, bulk_enable_rules or bulk_disable_rules for batch changes.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'The globally unique identifier for the rule to update' },
        name: { type: 'string', description: 'New human-readable name for the rule' },
        enabled: { type: 'boolean', description: 'Set true to enable or false to disable the rule without deleting it' }
      },
      required: ['rule_gid']
    },
    handler: async (args) => {
      const { rule_gid, ...data } = args;
      return await client.put(`/rules/${rule_gid}`, data);
    }
  },

  {
    name: 'delete_rule',
    description: 'Permanently delete a rule from a project. This action cannot be undone. The rule stops firing immediately. Consider using update_rule with enabled=false to disable without deleting if you may need the rule again. Related: update_rule with enabled=false to disable without deleting, bulk_delete_rules for batch deletion.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'The globally unique identifier for the rule to delete' }
      },
      required: ['rule_gid']
    },
    handler: async (args) => await client.delete(`/rules/${args.rule_gid}`)
  },

  {
    name: 'trigger_rule',
    description: 'Manually fire a rule against a task or resource — use for "fire rule 9090 manually for testing", retroactive rule application to existing tasks, one-off automation runs. Direct action — pass rule and resource by GID; do NOT call get_rule first. Executes the action immediately whether or not the trigger condition is met. Resource must be in the same project as the rule. This is the ONLY way to fire a rule from the API, since rules do not auto-fire on API-initiated changes. Related: get_rule (inspect action), create_rule, audit_project_rules.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'The rule GID to trigger' },
        resource: { type: 'string', description: 'The resource GID (usually a task GID) to run the rule action against' }
      },
      required: ['rule_gid', 'resource']
    },
    handler: async (args) => {
      const { rule_gid, resource } = args;
      return await client.post(`/rules/${rule_gid}/trigger`, { resource });
    }
  }
];
