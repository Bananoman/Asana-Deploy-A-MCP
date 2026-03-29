/**
 * Tool Registry - Central registry for all MCP tools with deferred loading and domain filtering
 *
 * Supports three loading modes via ASANA_TOOL_MODE env var:
 * - full: All tools loaded eagerly (backward compatible)
 * - efficient: Core tools eager + rest deferred (default)
 * - minimal: Only core tools loaded
 *
 * Supports domain filtering via ASANA_DOMAINS env var:
 * - all: Everything (default)
 * - Comma-separated: workspace,projects,tasks,portfolio,goals,automation,reporting,collaboration,advanced,advisor
 *
 * @module tools
 */

// ─── Module imports by category ───

const CATEGORY_MODULES = {
  workspace: [
    { id: 'workspaces', load: () => require('./workspace/workspaces') },
    { id: 'users', load: () => require('./workspace/users') },
    { id: 'teams', load: () => require('./workspace/teams') },
    { id: 'memberships', load: () => require('./workspace/memberships') },
  ],
  projects: [
    { id: 'projects', load: () => require('./projects/projects') },
    { id: 'project-operations', load: () => require('./projects/project-operations') },
    { id: 'project-statuses', load: () => require('./projects/project-statuses') },
    { id: 'project-briefs', load: () => require('./projects/project-briefs') },
    { id: 'project-templates', load: () => require('./projects/project-templates') },
    { id: 'sections', load: () => require('./projects/sections') },
  ],
  tasks: [
    { id: 'tasks', load: () => require('./tasks/tasks') },
    { id: 'task-operations', load: () => require('./tasks/task-operations') },
    { id: 'task-templates', load: () => require('./tasks/task-templates') },
    { id: 'user-task-lists', load: () => require('./tasks/user-task-lists') },
    { id: 'stories', load: () => require('./tasks/stories') },
    { id: 'attachments', load: () => require('./tasks/attachments') },
  ],
  portfolio: [
    { id: 'portfolios', load: () => require('./portfolio/portfolios') },
    { id: 'allocations', load: () => require('./portfolio/allocations') },
  ],
  goals: [
    { id: 'goals', load: () => require('./goals/goals') },
    { id: 'goal-relationships', load: () => require('./goals/goal-relationships') },
    { id: 'time-periods', load: () => require('./goals/time-periods') },
  ],
  automation: [
    { id: 'rules', load: () => require('./automation/rules') },
    { id: 'rules-bulk', load: () => require('./automation/rules-bulk') },
    { id: 'rules-workflows', load: () => require('./automation/rules-workflows') },
    { id: 'webhooks', load: () => require('./automation/webhooks') },
    { id: 'jobs', load: () => require('./automation/jobs') },
  ],
  reporting: [
    { id: 'organization-exports', load: () => require('./reporting/organization-exports') },
    { id: 'audit-log', load: () => require('./reporting/audit-log') },
  ],
  collaboration: [
    { id: 'status-updates', load: () => require('./collaboration/status-updates') },
    { id: 'reactions', load: () => require('./collaboration/reactions') },
    { id: 'tags', load: () => require('./collaboration/tags') },
  ],
  advanced: [
    { id: 'batch', load: () => require('./advanced/batch') },
    { id: 'bulk-operations', load: () => require('./advanced/bulk-operations') },
    { id: 'composite-operations', load: () => require('./advanced/composite-operations') },
    { id: 'custom-fields', load: () => require('./advanced/custom-fields') },
    { id: 'custom-field-settings', load: () => require('./advanced/custom-field-settings') },
    { id: 'custom-objects', load: () => require('./advanced/custom-objects') },
    { id: 'typeahead', load: () => require('./advanced/typeahead') },
    { id: 'events', load: () => require('./advanced/events') },
    { id: 'external-data', load: () => require('./advanced/external-data') },
    { id: 'time-tracking', load: () => require('./advanced/time-tracking') },
    { id: 'access-requests', load: () => require('./advanced/access-requests') },
    { id: 'generic-memberships', load: () => require('./advanced/generic-memberships') },
  ],
  advisor: [
    { id: 'workspace-advisor', load: () => require('./advanced/workspace-advisor') },
    { id: 'asana-guide', load: () => require('./advanced/asana-guide') },
    { id: 'methodology-tools', load: () => require('./advanced/methodology-tools') },
  ],
};

// ─── Core tools: always loaded eagerly in efficient mode ───

const CORE_TOOL_NAMES = new Set([
  // Workspace essentials
  'list_workspaces', 'get_current_user',
  // Project essentials
  'list_projects', 'get_project', 'create_project',
  // Task essentials
  'list_tasks', 'get_task', 'create_task', 'update_task', 'search_tasks',
  // Collaboration essentials
  'add_task_comment', 'create_status_update',
  // Navigation
  'list_sections', 'workspace_typeahead',
  // Guide & advisor
  'get_asana_guide',
  'analyze_workspace_overview', 'analyze_project_ai_readiness',
  // Methodology
  'assess_asana_maturity', 'generate_implementation_template',
]);

/**
 * Get tools filtered by mode and domain
 * @param {AsanaClient} client - Asana API client
 * @returns {Object} { eagerTools, deferredTools, allTools }
 */
function getToolsByMode(client) {
  const mode = (process.env.ASANA_TOOL_MODE || 'efficient').toLowerCase();
  const domainsRaw = (process.env.ASANA_DOMAINS || 'all').toLowerCase();
  const readOnly = process.env.ASANA_READ_ONLY === 'true';
  const activeDomains = domainsRaw === 'all'
    ? Object.keys(CATEGORY_MODULES)
    : domainsRaw.split(',').map(d => d.trim());

  // Load tools from active domains only
  let allTools = [];
  for (const domain of activeDomains) {
    const modules = CATEGORY_MODULES[domain];
    if (!modules) continue;
    for (const mod of modules) {
      const toolFn = mod.load();
      allTools.push(...toolFn(client));
    }
  }

  // Apply read-only filter
  if (readOnly) {
    allTools = allTools.filter(t => t.annotations?.readOnlyHint === true);
  }

  if (mode === 'full') {
    return { eagerTools: allTools, deferredTools: [], allTools };
  }

  if (mode === 'minimal') {
    const core = allTools.filter(t => CORE_TOOL_NAMES.has(t.name));
    return { eagerTools: core, deferredTools: [], allTools: core };
  }

  // efficient mode (default): core eager, rest deferred
  const eagerTools = [];
  const deferredTools = [];
  for (const tool of allTools) {
    if (CORE_TOOL_NAMES.has(tool.name)) {
      eagerTools.push(tool);
    } else {
      deferredTools.push(tool);
    }
  }

  return { eagerTools, deferredTools, allTools };
}

/**
 * Get all tools (backward compatible — returns flat array)
 * @param {AsanaClient} client - Asana API client
 * @returns {Array} All tool definitions
 */
function getAllTools(client) {
  const { allTools } = getToolsByMode(client);
  return allTools;
}

module.exports = { getAllTools, getToolsByMode, CORE_TOOL_NAMES, CATEGORY_MODULES };
