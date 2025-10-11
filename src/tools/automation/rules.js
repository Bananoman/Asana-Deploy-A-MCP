/**
 * Asana Rules Tools - Complete Automation & Workflow Management
 *
 * Features:
 * - CRUD operations for rules
 * - Bulk rule operations
 * - Rule cloning between projects
 * - Workflow templates (Kanban, Sprint, etc.)
 * - Rule auditing and reporting
 *
 * @module rules
 */

module.exports = (client) => [
  // ==================== BASIC CRUD ====================

  {
    name: 'get_rule',
    description: 'Get a rule by GID',
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'Rule GID' }
      },
      required: ['rule_gid']
    },
    handler: async (args) => await client.get(`/rules/${args.rule_gid}`)
  },

  {
    name: 'list_project_rules',
    description: 'List all rules in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' }
      },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}/rules`)
  },

  {
    name: 'create_rule',
    description: 'Create a new automation rule in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        name: { type: 'string', description: 'Rule name' },
        trigger_type: {
          type: 'string',
          description: 'Trigger type',
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
        trigger_section_gid: { type: 'string', description: 'Section GID for section triggers' },
        trigger_custom_field_gid: { type: 'string', description: 'Custom field GID for field triggers' },
        action_type: {
          type: 'string',
          description: 'Action type',
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
        action_assignee_gid: { type: 'string', description: 'User GID to assign' },
        action_follower_gid: { type: 'string', description: 'User GID to add as follower' },
        action_section_gid: { type: 'string', description: 'Section GID to move to' },
        action_comment_text: { type: 'string', description: 'Comment text to add' },
        action_tag_gid: { type: 'string', description: 'Tag GID to add' },
        action_custom_field_gid: { type: 'string', description: 'Custom field GID' },
        action_custom_field_value: { type: 'string', description: 'Value for custom field' }
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
    description: 'Update an existing rule',
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'Rule GID' },
        name: { type: 'string', description: 'New name' },
        enabled: { type: 'boolean', description: 'Enable/disable rule' }
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
    description: 'Delete a rule',
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'Rule GID' }
      },
      required: ['rule_gid']
    },
    handler: async (args) => await client.delete(`/rules/${args.rule_gid}`)
  },

  {
    name: 'trigger_rule',
    description: 'Manually trigger a rule',
    inputSchema: {
      type: 'object',
      properties: {
        rule_gid: { type: 'string', description: 'Rule GID' },
        resource: { type: 'string', description: 'Resource GID' }
      },
      required: ['rule_gid', 'resource']
    },
    handler: async (args) => {
      const { rule_gid, resource } = args;
      return await client.post(`/rules/${rule_gid}/trigger`, { resource });
    }
  },

  // ==================== BULK OPERATIONS ====================

  {
    name: 'bulk_create_rules',
    description: 'Create multiple rules at once',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        rules: {
          type: 'array',
          description: 'Array of rule definitions',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              trigger: { type: 'object' },
              action: { type: 'object' }
            }
          }
        },
        stop_on_error: { type: 'boolean', description: 'Stop if error occurs (default: false)' }
      },
      required: ['project_gid', 'rules']
    },
    handler: async (args) => {
      const results = { created: [], errors: [], total: args.rules.length };

      for (const rule of args.rules) {
        try {
          const created = await client.post(`/projects/${args.project_gid}/rules`, rule);
          results.created.push(created);
        } catch (error) {
          results.errors.push({ rule_name: rule.name, error: error.message });
          if (args.stop_on_error) break;
        }
      }

      results.summary = `${results.created.length}/${results.total} rules created successfully`;
      if (results.errors.length > 0) {
        results.summary += `, ${results.errors.length} failed`;
      }

      return results;
    }
  },

  {
    name: 'bulk_enable_rules',
    description: 'Enable multiple rules at once',
    inputSchema: {
      type: 'object',
      properties: {
        rule_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of rule GIDs'
        }
      },
      required: ['rule_gids']
    },
    handler: async (args) => {
      const results = { enabled: [], errors: [] };

      for (const rule_gid of args.rule_gids) {
        try {
          await client.put(`/rules/${rule_gid}`, { enabled: true });
          results.enabled.push(rule_gid);
        } catch (error) {
          results.errors.push({ rule_gid, error: error.message });
        }
      }

      return {
        ...results,
        summary: `${results.enabled.length}/${args.rule_gids.length} rules enabled`
      };
    }
  },

  {
    name: 'bulk_disable_rules',
    description: 'Disable multiple rules at once',
    inputSchema: {
      type: 'object',
      properties: {
        rule_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of rule GIDs'
        }
      },
      required: ['rule_gids']
    },
    handler: async (args) => {
      const results = { disabled: [], errors: [] };

      for (const rule_gid of args.rule_gids) {
        try {
          await client.put(`/rules/${rule_gid}`, { enabled: false });
          results.disabled.push(rule_gid);
        } catch (error) {
          results.errors.push({ rule_gid, error: error.message });
        }
      }

      return {
        ...results,
        summary: `${results.disabled.length}/${args.rule_gids.length} rules disabled`
      };
    }
  },

  {
    name: 'bulk_delete_rules',
    description: 'Delete multiple rules at once',
    inputSchema: {
      type: 'object',
      properties: {
        rule_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of rule GIDs'
        },
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm deletion',
          const: true
        }
      },
      required: ['rule_gids', 'confirm']
    },
    handler: async (args) => {
      const results = { deleted: [], errors: [] };

      for (const rule_gid of args.rule_gids) {
        try {
          await client.delete(`/rules/${rule_gid}`);
          results.deleted.push(rule_gid);
        } catch (error) {
          results.errors.push({ rule_gid, error: error.message });
        }
      }

      return {
        ...results,
        summary: `${results.deleted.length}/${args.rule_gids.length} rules deleted`
      };
    }
  },

  // ==================== RULE CLONING ====================

  {
    name: 'clone_project_rules',
    description: 'Clone all rules from one project to another',
    inputSchema: {
      type: 'object',
      properties: {
        source_project_gid: { type: 'string', description: 'Source project GID' },
        target_project_gid: { type: 'string', description: 'Target project GID' },
        section_mapping: {
          type: 'object',
          description: 'Map old section GIDs to new: {"old_gid": "new_gid"}'
        },
        user_mapping: {
          type: 'object',
          description: 'Map old user GIDs to new: {"old_gid": "new_gid"}'
        },
        custom_field_mapping: {
          type: 'object',
          description: 'Map old custom field GIDs to new'
        },
        tag_mapping: {
          type: 'object',
          description: 'Map old tag GIDs to new'
        },
        add_prefix: {
          type: 'string',
          description: 'Prefix to add to rule names (e.g., "[Cloned] ")'
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
    description: 'Create a complete Kanban workflow with predefined rules',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        todo_section_gid: { type: 'string', description: 'To Do section GID' },
        doing_section_gid: { type: 'string', description: 'In Progress section GID' },
        done_section_gid: { type: 'string', description: 'Done section GID' },
        developer_gid: { type: 'string', description: 'Developer user GID (optional)' },
        qa_gid: { type: 'string', description: 'QA user GID (optional)' }
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
    description: 'Create a complete Sprint/Agile workflow with predefined rules',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        backlog_section_gid: { type: 'string', description: 'Backlog section GID' },
        sprint_section_gid: { type: 'string', description: 'Sprint section GID' },
        in_progress_section_gid: { type: 'string', description: 'In Progress section GID' },
        review_section_gid: { type: 'string', description: 'Review section GID' },
        done_section_gid: { type: 'string', description: 'Done section GID' },
        sprint_tag_gid: { type: 'string', description: 'Sprint tag GID (optional)' },
        dev_lead_gid: { type: 'string', description: 'Dev lead user GID (optional)' },
        qa_lead_gid: { type: 'string', description: 'QA lead user GID (optional)' }
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
    description: 'Generate comprehensive audit report of project rules',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID to audit' }
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
    description: 'Disable all rules in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        confirm: { type: 'boolean', description: 'Must be true to confirm', const: true }
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
    description: 'Enable all rules in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        confirm: { type: 'boolean', description: 'Must be true to confirm', const: true }
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
