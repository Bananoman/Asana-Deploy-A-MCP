/**
 * Automation Tools - Workflow Templates, Rule Cloning & Audit
 *
 * Pre-built workflow templates (Kanban, Sprint), rule cloning between projects
 * with GID mapping, and project rule auditing/management utilities.
 *
 * Plan requirements: Business+ (rules are a premium feature)
 * Rate limits: Standard — each rule creation counts as a separate API call
 *
 * Key constraints:
 * - Workflow templates create rules sequentially (not atomically)
 * - Cloning requires manual GID mapping for sections, users, custom fields, and tags
 * - Rules are NOT automatically copied when duplicating projects or instantiating templates via API
 * - Each created rule has ONE trigger + ONE action (API limitation)
 *
 * NOT possible via API (use Asana UI instead):
 * - Creating AI-powered or conditional/branching rules
 * - Creating rules with multiple actions per rule
 *
 * @module rules-workflows
 */

const { rulesApiUnsupported } = require('./_rules-api-support');

module.exports = (client) => [
  // ==================== RULE CLONING ====================

  {
    name: 'clone_project_rules',
    description: 'NOT SUPPORTED by the Asana API — there is no endpoint to read or create rules, so rules cannot be cloned programmatically and this always errors. Recreate rules in the target project via the Asana UI (Project ▸ Customize ▸ Rules), or copy them by duplicating the project in the UI (which does carry rules over, unlike the API).',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        source_project_gid: { type: 'string', description: 'Project GID to copy rules from' },
        target_project_gid: { type: 'string', description: 'Project GID to copy rules into' },
        section_mapping: {
          type: 'object',
          description: 'Map source section GIDs to target section GIDs: {"old_section_gid": "new_section_gid"}. Required if rules use section-based triggers or actions.'
        },
        user_mapping: {
          type: 'object',
          description: 'Map source user GIDs to target user GIDs: {"old_user_gid": "new_user_gid"}. Required if rules assign tasks or add followers.'
        },
        custom_field_mapping: {
          type: 'object',
          description: 'Map source custom field GIDs to target custom field GIDs: {"old_field_gid": "new_field_gid"}. Required if rules use custom field triggers or actions.'
        },
        tag_mapping: {
          type: 'object',
          description: 'Map source tag GIDs to target tag GIDs: {"old_tag_gid": "new_tag_gid"}. Required if rules add tags.'
        },
        add_prefix: {
          type: 'string',
          description: 'Prefix to prepend to cloned rule names (e.g., "[Cloned] " or "[Q2] ") for easy identification'
        }
      },
      required: ['source_project_gid', 'target_project_gid']
    },
    handler: async () => { throw rulesApiUnsupported('Cloning project rules'); }
  },

  // ==================== WORKFLOW TEMPLATES ====================

  {
    name: 'setup_kanban_workflow',
    description: 'NOT SUPPORTED by the Asana API — this would create rules, but rule creation has no public endpoint, so it always errors. Build the Kanban automation (new→To Do, →In Progress assign, →Done complete, celebration comment, QA follower) in the Asana UI (Project ▸ Customize ▸ Rules), where these are available as rule presets. The schema documents the intended setup for reference.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID to set up the Kanban workflow in' },
        todo_section_gid: { type: 'string', description: 'GID of the "To Do" / "Backlog" section' },
        doing_section_gid: { type: 'string', description: 'GID of the "In Progress" / "Doing" section' },
        done_section_gid: { type: 'string', description: 'GID of the "Done" / "Complete" section' },
        developer_gid: { type: 'string', description: 'Optional: User GID to auto-assign when tasks move to In Progress. If omitted, a comment is added instead.' },
        qa_gid: { type: 'string', description: 'Optional: User GID to add as follower when tasks move to Done for QA review' }
      },
      required: ['project_gid', 'todo_section_gid', 'doing_section_gid', 'done_section_gid']
    },
    handler: async () => { throw rulesApiUnsupported('Setting up a Kanban workflow (rule creation)'); }
  },

  {
    name: 'setup_sprint_workflow',
    description: 'NOT SUPPORTED by the Asana API — this would create rules, but rule creation has no public endpoint, so it always errors. Build the Sprint automation (new→Backlog, sprint comment, →Review QA follower, →Done complete, sprint tag, dev-lead notify) in the Asana UI (Project ▸ Customize ▸ Rules). The schema documents the intended setup for reference.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID to set up the Sprint workflow in' },
        backlog_section_gid: { type: 'string', description: 'GID of the "Backlog" section for unplanned work' },
        sprint_section_gid: { type: 'string', description: 'GID of the "Sprint" / "Planned" section for current sprint items' },
        in_progress_section_gid: { type: 'string', description: 'GID of the "In Progress" section for active work' },
        review_section_gid: { type: 'string', description: 'GID of the "Review" / "QA" section for items awaiting review' },
        done_section_gid: { type: 'string', description: 'GID of the "Done" section for completed items' },
        sprint_tag_gid: { type: 'string', description: 'Optional: Tag GID to apply when tasks enter the Sprint section (e.g., "Sprint-42")' },
        dev_lead_gid: { type: 'string', description: 'Optional: Dev lead user GID to add as follower on in-progress tasks' },
        qa_lead_gid: { type: 'string', description: 'Optional: QA lead user GID to add as follower on review tasks' }
      },
      required: ['project_gid', 'backlog_section_gid', 'sprint_section_gid', 'in_progress_section_gid', 'review_section_gid', 'done_section_gid']
    },
    handler: async () => { throw rulesApiUnsupported('Setting up a Sprint workflow (rule creation)'); }
  },

  // ==================== AUDIT & MANAGEMENT ====================

  {
    name: 'audit_project_rules',
    description: 'NOT SUPPORTED by the Asana API — auditing rules requires listing them, which has no public endpoint, so this always errors. There is no way to read a project\'s rules programmatically; review automation in the Asana UI (Project ▸ Customize ▸ Rules). NOTE: maturity/readiness tools therefore cannot measure automation and will report it as "not measurable via API", never as a confirmed 0.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID to audit automation rules for' }
      },
      required: ['project_gid']
    },
    handler: async () => { throw rulesApiUnsupported('Auditing project rules'); }
  },

  {
    name: 'disable_all_project_rules',
    description: 'NOT SUPPORTED by the Asana API — disabling rules has no public endpoint (and rules cannot even be listed), so this always errors. Pause automation in the Asana UI (Project ▸ Customize ▸ Rules).',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID whose rules to disable' },
        confirm: { type: 'boolean', description: 'Must be true to confirm disabling all rules', const: true }
      },
      required: ['project_gid', 'confirm']
    },
    handler: async () => { throw rulesApiUnsupported('Disabling all project rules'); }
  },

  {
    name: 'enable_all_project_rules',
    description: 'NOT SUPPORTED by the Asana API — enabling rules has no public endpoint (and rules cannot even be listed), so this always errors. Re-enable automation in the Asana UI (Project ▸ Customize ▸ Rules).',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID whose rules to enable' },
        confirm: { type: 'boolean', description: 'Must be true to confirm enabling all rules', const: true }
      },
      required: ['project_gid', 'confirm']
    },
    handler: async () => { throw rulesApiUnsupported('Enabling all project rules'); }
  }
];
