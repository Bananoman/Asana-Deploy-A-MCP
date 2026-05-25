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
    description: 'Set up many automation rules in a project at once — use for "seed the standard rule pack on this project", scaffolding kanban/sprint automation, replicating rule sets across projects. Direct action — pass project and rules array; do NOT call list_project_rules or get_project first. Each rule: {name, trigger:{type,...}, action:{type,...}}. ONE trigger + ONE action per rule (API limitation). Sequential; stop_on_error=true to halt on first failure (default: continue). Related: create_rule (single rule, guided params), setup_kanban_workflow / setup_sprint_workflow (pre-built templates), audit_project_rules.',
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
    description: 'Re-enable / turn on many rules at once by passing rule GIDs — use for "re-enable the rules we paused last sprint", post-freeze restoration, restarting automations after maintenance. Direct action — pass rule_gids array; do NOT call list_project_rules first. Enabled rules start firing on UI-initiated changes (not API). Sequential; failures do NOT stop remaining. Related: bulk_disable_rules (pause), enable_all_project_rules (entire project at once), create_rule.',
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
    description: 'Pause / turn off many rules at once by passing rule GIDs — use for "freeze automation while we debug", pre-migration pause, temporarily silencing rules. Direct action — pass rule_gids array; do NOT call list_project_rules first. Disabled rules retain config but stop firing. Sequential; failures do NOT stop remaining. Prefer this over bulk_delete_rules when you may need to re-enable later. Related: bulk_enable_rules (resume), disable_all_project_rules (entire project at once — use that for "disable every rule in project X"), bulk_delete_rules (permanent).',
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
    description: 'Permanently delete many rules at once — use for "clean up the old test rules", removing obsolete automation. DESTRUCTIVE: cannot be undone. Consider bulk_disable_rules first if you may need to restore later. Direct action — pass rule_gids array; requires confirm=true safety check. Sequential; failures do NOT stop remaining. Related: bulk_disable_rules (reversible), audit_project_rules (review before deleting), delete_rule (single).',
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
