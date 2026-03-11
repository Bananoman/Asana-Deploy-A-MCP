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

module.exports = (client) => [
  // ==================== RULE CLONING ====================

  {
    name: 'clone_project_rules',
    description: 'Clone all automation rules from one project to another with GID remapping. Since rules reference project-specific GIDs (sections, users, custom fields, tags), provide mapping objects to translate source GIDs to target GIDs. Unmapped GIDs are kept as-is (which may cause errors if they do not exist in the target project). Rules are cloned sequentially — partial failures possible. This is needed because rules are NOT copied when duplicating projects via API. Use add_prefix to distinguish cloned rules. Related: list_project_rules to inspect source rules, get_project_sections to get section GIDs for mapping, audit_project_rules to verify results.',
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
    handler: async (args) => {
      const sourceRules = await client.get(`/projects/${args.source_project_gid}/rules`);

      const clonedRules = [];
      const errors = [];

      for (const rule of sourceRules.data || []) {
        try {
          const trigger = { ...rule.trigger };
          if (args.section_mapping && trigger.section) {
            trigger.section = args.section_mapping[trigger.section] || trigger.section;
          }
          if (args.custom_field_mapping && trigger.custom_field) {
            trigger.custom_field = args.custom_field_mapping[trigger.custom_field] || trigger.custom_field;
          }

          const action = { ...rule.action };
          if (args.user_mapping && action.assignee) {
            action.assignee = args.user_mapping[action.assignee] || action.assignee;
          }
          if (args.user_mapping && action.follower) {
            action.follower = args.user_mapping[action.follower] || action.follower;
          }
          if (args.section_mapping && action.section) {
            action.section = args.section_mapping[action.section] || action.section;
          }
          if (args.tag_mapping && action.tag) {
            action.tag = args.tag_mapping[action.tag] || action.tag;
          }
          if (args.custom_field_mapping && action.custom_field) {
            action.custom_field = args.custom_field_mapping[action.custom_field] || action.custom_field;
          }

          const ruleName = args.add_prefix ? `${args.add_prefix}${rule.name}` : rule.name;

          const cloned = await client.post(`/projects/${args.target_project_gid}/rules`, {
            name: ruleName,
            trigger,
            action
          });

          clonedRules.push(cloned);
        } catch (error) {
          errors.push({ rule_name: rule.name, error: error.message });
        }
      }

      return {
        cloned: clonedRules,
        errors,
        summary: `${clonedRules.length}/${(sourceRules.data || []).length} rules cloned successfully`
      };
    }
  },

  // ==================== WORKFLOW TEMPLATES ====================

  {
    name: 'setup_kanban_workflow',
    description: 'Create a complete Kanban workflow with predefined automation rules in a project. Automatically creates rules for: (1) new tasks go to To Do section, (2) tasks moved to In Progress get assigned (if developer_gid provided), (3) tasks moved to Done get completed, (4) completed tasks get a celebration comment. Optionally adds QA follower when tasks reach Done. Rules are created sequentially — partial failures possible. Requires section GIDs — use get_project_sections to find them first. Rules only fire on UI-initiated changes, not API changes. Related: setup_sprint_workflow for agile workflows, list_project_rules to verify created rules, clone_project_rules to copy to other projects.',
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
    handler: async (args) => {
      const rules = [
        {
          name: '🆕 New tasks → To Do',
          trigger: { type: 'task_added_to_project' },
          action: { type: 'move_to_section', section: args.todo_section_gid }
        },
        {
          name: '🔄 In Progress → Assign Developer',
          trigger: { type: 'task_moved_to_section', section: args.doing_section_gid },
          action: args.developer_gid
            ? { type: 'assign_task', assignee: args.developer_gid }
            : { type: 'add_comment', text: '⚠️ Task moved to In Progress - please assign' }
        },
        {
          name: '✅ Done → Complete Task',
          trigger: { type: 'task_moved_to_section', section: args.done_section_gid },
          action: { type: 'complete_task' }
        },
        {
          name: '🎉 Completed → Celebration',
          trigger: { type: 'task_completed' },
          action: { type: 'add_comment', text: '🎉 Great job! Task completed!' }
        }
      ];

      if (args.qa_gid) {
        rules.push({
          name: '👀 Done → Add QA Follower',
          trigger: { type: 'task_moved_to_section', section: args.done_section_gid },
          action: { type: 'add_follower', follower: args.qa_gid }
        });
      }

      const results = { created: [], errors: [] };

      for (const rule of rules) {
        try {
          const created = await client.post(`/projects/${args.project_gid}/rules`, rule);
          results.created.push(created);
        } catch (error) {
          results.errors.push({ rule_name: rule.name, error: error.message });
        }
      }

      return {
        ...results,
        summary: `Kanban workflow created: ${results.created.length}/${rules.length} rules`
      };
    }
  },

  {
    name: 'setup_sprint_workflow',
    description: 'Create a complete Sprint/Agile workflow with predefined automation rules. Creates rules for: (1) new tasks go to Backlog, (2) tasks in progress get a sprint comment, (3) tasks in Review add QA follower (if qa_lead_gid provided), (4) tasks moved to Done get completed. Optionally adds sprint tag and dev lead notifications. Rules are created sequentially — partial failures possible. Requires section GIDs for all 5 stages — use get_project_sections to find them. Rules only fire on UI-initiated changes, not API changes. Related: setup_kanban_workflow for simpler workflows, list_project_rules to verify, clone_project_rules to replicate.',
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
    handler: async (args) => {
      const rules = [
        {
          name: '📋 New tasks → Backlog',
          trigger: { type: 'task_added_to_project' },
          action: { type: 'move_to_section', section: args.backlog_section_gid }
        },
        {
          name: '🏃 Sprint → In Progress',
          trigger: { type: 'task_moved_to_section', section: args.in_progress_section_gid },
          action: { type: 'add_comment', text: '🏃 Sprint started - let\'s do this!' }
        },
        {
          name: '👀 Review → Add QA',
          trigger: { type: 'task_moved_to_section', section: args.review_section_gid },
          action: args.qa_lead_gid
            ? { type: 'add_follower', follower: args.qa_lead_gid }
            : { type: 'add_comment', text: '👀 Ready for QA review' }
        },
        {
          name: '✅ Done → Complete',
          trigger: { type: 'task_moved_to_section', section: args.done_section_gid },
          action: { type: 'complete_task' }
        }
      ];

      if (args.sprint_tag_gid) {
        rules.push({
          name: '🏷️ Sprint → Add Tag',
          trigger: { type: 'task_moved_to_section', section: args.sprint_section_gid },
          action: { type: 'add_tag', tag: args.sprint_tag_gid }
        });
      }

      if (args.dev_lead_gid) {
        rules.push({
          name: '🔔 In Progress → Notify Dev Lead',
          trigger: { type: 'task_moved_to_section', section: args.in_progress_section_gid },
          action: { type: 'add_follower', follower: args.dev_lead_gid }
        });
      }

      const results = { created: [], errors: [] };

      for (const rule of rules) {
        try {
          const created = await client.post(`/projects/${args.project_gid}/rules`, rule);
          results.created.push(created);
        } catch (error) {
          results.errors.push({ rule_name: rule.name, error: error.message });
        }
      }

      return {
        ...results,
        summary: `Sprint workflow created: ${results.created.length}/${rules.length} rules`
      };
    }
  },

  // ==================== AUDIT & MANAGEMENT ====================

  {
    name: 'audit_project_rules',
    description: 'Generate a comprehensive audit report of all automation rules in a project. Returns total count, enabled vs disabled breakdown, trigger types distribution, action types distribution, and detailed info for each rule. Use this to understand existing automation before making changes, identify redundant or conflicting rules, or document project workflows. Recommended before clone_project_rules or bulk operations. Related: list_project_rules for raw rule data, disable_all_project_rules to pause all automation.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID to audit automation rules for' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const rules = await client.get(`/projects/${args.project_gid}/rules`);
      const rulesList = rules.data || [];

      const audit = {
        total_rules: rulesList.length,
        enabled_rules: rulesList.filter(r => r.enabled !== false).length,
        disabled_rules: rulesList.filter(r => r.enabled === false).length,
        triggers_by_type: {},
        actions_by_type: {},
        rules_detail: []
      };

      for (const rule of rulesList) {
        const triggerType = rule.trigger?.type || 'unknown';
        const actionType = rule.action?.type || 'unknown';

        audit.triggers_by_type[triggerType] = (audit.triggers_by_type[triggerType] || 0) + 1;
        audit.actions_by_type[actionType] = (audit.actions_by_type[actionType] || 0) + 1;

        audit.rules_detail.push({
          gid: rule.gid,
          name: rule.name,
          enabled: rule.enabled !== false,
          trigger_type: triggerType,
          action_type: actionType,
          created_at: rule.created_at
        });
      }

      return audit;
    }
  },

  {
    name: 'disable_all_project_rules',
    description: 'Disable all automation rules in a project at once. Useful for temporarily pausing all automation during bulk data imports, migrations, or troubleshooting. Rules retain their configuration and can be re-enabled later. Processed sequentially — partial failures possible. Requires confirm=true as a safety check. Related: enable_all_project_rules to re-enable all, bulk_disable_rules to disable specific rules, audit_project_rules to review before disabling.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID whose rules to disable' },
        confirm: { type: 'boolean', description: 'Must be true to confirm disabling all rules', const: true }
      },
      required: ['project_gid', 'confirm']
    },
    handler: async (args) => {
      const rules = await client.get(`/projects/${args.project_gid}/rules`);
      const rulesList = rules.data || [];

      const results = { disabled: [], errors: [] };

      for (const rule of rulesList) {
        try {
          await client.put(`/rules/${rule.gid}`, { enabled: false });
          results.disabled.push(rule.gid);
        } catch (error) {
          results.errors.push({ rule_gid: rule.gid, error: error.message });
        }
      }

      return {
        ...results,
        summary: `${results.disabled.length}/${rulesList.length} rules disabled`
      };
    }
  },

  {
    name: 'enable_all_project_rules',
    description: 'Enable all automation rules in a project at once. Restores all rules to active status after a bulk disable. Processed sequentially — partial failures possible. Rules only fire on UI-initiated changes, not API changes. Requires confirm=true as a safety check. Related: disable_all_project_rules to disable all, bulk_enable_rules to enable specific rules, audit_project_rules to review before enabling.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID whose rules to enable' },
        confirm: { type: 'boolean', description: 'Must be true to confirm enabling all rules', const: true }
      },
      required: ['project_gid', 'confirm']
    },
    handler: async (args) => {
      const rules = await client.get(`/projects/${args.project_gid}/rules`);
      const rulesList = rules.data || [];

      const results = { enabled: [], errors: [] };

      for (const rule of rulesList) {
        try {
          await client.put(`/rules/${rule.gid}`, { enabled: true });
          results.enabled.push(rule.gid);
        } catch (error) {
          results.errors.push({ rule_gid: rule.gid, error: error.message });
        }
      }

      return {
        ...results,
        summary: `${results.enabled.length}/${rulesList.length} rules enabled`
      };
    }
  }
];
