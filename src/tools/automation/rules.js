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

const { rulesApiUnsupported } = require('./_rules-api-support');

module.exports = (client) => [
  {
    name: 'get_rule',
    description: 'NOT SUPPORTED by the Asana API — reading a rule by GID has no public endpoint and always errors. Rules can only be inspected in the Asana UI (Project ▸ Customize ▸ Rules). The only rule operation the API supports is trigger_rule (fires a rule with an incoming-web-request trigger). Do NOT call this to "check rules before X"; there is no programmatic rule visibility.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'The globally unique identifier for the rule' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "name,enabled,trigger,action,created_at,modified_at"' }
      },
      required: ['rule_gid']
    },
    handler: async () => { throw rulesApiUnsupported('Reading a rule by GID'); }
  },

  {
    name: 'list_project_rules',
    description: 'NOT SUPPORTED by the Asana API — there is no public endpoint to list a project\'s rules, so this always errors. Rules are visible only in the Asana UI (Project ▸ Customize ▸ Rules). Because of this, the API cannot confirm whether a project has automation; do NOT rely on it to audit rules or to check "0 rules". The only rule operation available is trigger_rule.',
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
    handler: async () => { throw rulesApiUnsupported('Listing project rules'); }
  },

  {
    name: 'create_rule',
    description: 'NOT SUPPORTED by the Asana API — creating rules has no public endpoint and always errors. Create rules in the Asana UI (Project ▸ Customize ▸ Rules) or script them with Script Actions (Enterprise+). The schema below documents the intended rule shape for UI reference only. Original intent: create an automation rule in a project — e.g. "when a task is moved to Done auto-assign the QA lead", "auto-tag when added to project", due-date alerts. Direct action — pass project by GID; do NOT call list_project_rules or get_project first. ONE trigger + ONE action per rule (API limitation). Rules fire only on UI-initiated changes, NOT API changes. Cannot create AI-powered or branching/conditional rules via API. Triggers: task_added_to_project, task_moved_to_section (needs section GID), task_completed, task_uncompleted, custom_field_changed (needs field GID), due_date_approaching, assignee_changed, attachment_added. Actions: assign_task, add_follower, set_custom_field, add_tag, move_to_section, add_comment, complete_task, uncomplete_task, set_due_date, clear_due_date. Related: list_project_rules, trigger_rule (manual fire), setup_kanban_workflow / setup_sprint_workflow (pre-built templates), audit_project_rules.',
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
    handler: async () => { throw rulesApiUnsupported('Creating a rule'); }
  },

  {
    name: 'update_rule',
    description: 'NOT SUPPORTED by the Asana API — editing or enabling/disabling a rule has no public endpoint and always errors. Change rules in the Asana UI (Project ▸ Customize ▸ Rules). The only rule operation the API supports is trigger_rule.',
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
    handler: async () => { throw rulesApiUnsupported('Updating a rule'); }
  },

  {
    name: 'delete_rule',
    description: 'NOT SUPPORTED by the Asana API — deleting a rule has no public endpoint and always errors. Delete rules in the Asana UI (Project ▸ Customize ▸ Rules). The only rule operation the API supports is trigger_rule.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'The globally unique identifier for the rule to delete' }
      },
      required: ['rule_gid']
    },
    handler: async () => { throw rulesApiUnsupported('Deleting a rule'); }
  },

  {
    name: 'trigger_rule',
    description: 'Fire a rule that has an "incoming web request" (API) trigger — the ONLY rules operation the Asana API supports. Use for "run my incoming-request rule 9090 against task X", webhook-style automation, one-off runs. The rule MUST already be configured in the UI with an incoming-web-request trigger; you pass that trigger\'s GID (the rule_trigger_gid shown in the rule\'s trigger setup), NOT a generic rule GID. Rules with other trigger types (task added, moved, completed, etc.) cannot be fired via API. Asana exposes no list/get for rules, so the rule_trigger_gid comes from the UI. Endpoint: POST /rule_triggers/{rule_trigger_gid}/run.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        rule_trigger_gid: { type: 'string', description: 'The GID of the rule\'s "incoming web request" trigger (from the rule\'s trigger configuration in the Asana UI). NOT a generic rule GID.' },
        data: { type: 'object', description: 'Optional JSON payload passed to the rule\'s action variables (key/value pairs the rule can reference)' },
        resource: { type: 'string', description: 'Optional task/resource GID to run the rule against, sent as data.resource if no explicit data object is provided' }
      },
      required: ['rule_trigger_gid']
    },
    handler: async (args) => {
      const { rule_trigger_gid, data, resource } = args;
      const payload = data || (resource ? { resource } : {});
      return await client.post(`/rule_triggers/${rule_trigger_gid}/run`, { data: payload });
    }
  }
];
