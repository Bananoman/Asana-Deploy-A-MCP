/**
 * Automation Tools - Bulk Rule Operations
 *
 * Batch operations for creating, enabling, disabling, and deleting multiple rules
 * in a single call. Operations are processed sequentially (not atomically).
 *
 * Plan requirements: Business+ (rules are a premium feature)
 * Rate limits: Standard — each individual operation counts toward rate limits separately
 *
 * Key constraints:
 * - Sequential processing, not atomic — partial failures are possible
 * - Each rule operation is an individual API call (counts toward rate limits)
 * - If a batch has many rules, watch for rate limit exhaustion
 * - Bulk delete is irreversible — consider bulk disable first
 *
 * NOT possible via API (use Asana UI instead):
 * - Creating AI-powered or conditional/branching rules in bulk
 * - Creating rules with multiple actions per rule
 *
 * @module rules-bulk
 */

module.exports = (client) => [
  {
    name: 'bulk_create_rules',
    description: 'Create multiple automation rules in a project in one call. Each rule object needs name, trigger (object with type and optional config), and action (object with type and optional config). Rules are created sequentially — each counts as a separate API call toward rate limits. Partial failures are possible: use stop_on_error to halt on first failure or let remaining rules continue. Returns a summary with created rules and any errors. Each rule has ONE trigger + ONE action (API limitation). Related: create_rule for single rule creation with guided parameters, setup_kanban_workflow or setup_sprint_workflow for pre-built templates.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'The project GID to create rules in' },
        rules: {
          type: 'array',
          description: 'Array of rule definitions. Each must have: name (string), trigger (object with type), action (object with type). Example: [{"name": "Auto-complete", "trigger": {"type": "task_moved_to_section", "section": "SECTION_GID"}, "action": {"type": "complete_task"}}]',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              trigger: { type: 'object' },
              action: { type: 'object' }
            }
          }
        },
        stop_on_error: { type: 'boolean', description: 'If true, stop creating rules after the first error. Default: false (continue creating remaining rules)' }
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
    description: 'Enable multiple rules at once by providing an array of rule GIDs. Enabled rules will start firing when their trigger conditions are met (UI-initiated changes only, not API changes). Rules are processed sequentially — each counts toward rate limits. Partial failures possible: failures do not stop remaining rules. Related: bulk_disable_rules to disable, enable_all_project_rules to enable every rule in a project.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        rule_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of rule GIDs to enable'
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
    description: 'Disable multiple rules at once by providing an array of rule GIDs. Disabled rules retain their configuration but stop firing. Rules are processed sequentially — each counts toward rate limits. Partial failures possible: failures do not stop remaining rules. Prefer this over bulk_delete_rules when you may need to re-enable later. Related: bulk_enable_rules to re-enable, disable_all_project_rules to disable every rule in a project.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        rule_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of rule GIDs to disable'
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
    description: 'Permanently delete multiple rules at once. This action cannot be undone. Requires confirm=true as a safety check. Rules are deleted sequentially — each counts toward rate limits. Partial failures possible: failures do not stop remaining deletions. Consider using bulk_disable_rules first if you may need to restore rules later, since deletion is irreversible. Related: bulk_disable_rules to disable without deleting, audit_project_rules to review rules before deleting.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        rule_gids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of rule GIDs to permanently delete'
        },
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm deletion. This is a safety check since deletion is irreversible.',
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
  }
];
