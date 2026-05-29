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

const { rulesApiUnsupported } = require('./_rules-api-support');

module.exports = (client) => [
  {
    name: 'bulk_create_rules',
    description: 'NOT SUPPORTED by the Asana API — creating rules has no public endpoint, so bulk creation always errors. Create rules in the Asana UI (Project ▸ Customize ▸ Rules) or script them with Script Actions (Enterprise+). The schema below documents the intended rule shape for UI reference only.',
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
    handler: async () => { throw rulesApiUnsupported('Bulk-creating rules'); }
  },

  {
    name: 'bulk_enable_rules',
    description: 'NOT SUPPORTED by the Asana API — bulk-enabling rules has no public endpoint, so this always errors. Enable multiple rules in the Asana UI (Project ▸ Customize ▸ Rules).',
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
    handler: async () => { throw rulesApiUnsupported('Bulk-enabling rules'); }
  },

  {
    name: 'bulk_disable_rules',
    description: 'NOT SUPPORTED by the Asana API — bulk-disabling rules has no public endpoint, so this always errors. Disable/pause multiple rules in the Asana UI (Project ▸ Customize ▸ Rules).',
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
    handler: async () => { throw rulesApiUnsupported('Bulk-disabling rules'); }
  },

  {
    name: 'bulk_delete_rules',
    description: 'NOT SUPPORTED by the Asana API — bulk-deleting rules has no public endpoint, so this always errors. Delete multiple rules in the Asana UI (Project ▸ Customize ▸ Rules).',
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
    handler: async () => { throw rulesApiUnsupported('Bulk-deleting rules'); }
  }
];
