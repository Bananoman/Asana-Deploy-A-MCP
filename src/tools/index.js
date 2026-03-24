/**
 * Tool Registry - Central registry for all 236 MCP tools organized by 9 categories
 *
 * Categories and plan requirements:
 * - WORKSPACE (4 modules): Free+ (workspaces, users, teams, memberships)
 * - PROJECTS (6 modules): Free+ (Premium for custom fields, templates)
 * - TASKS (6 modules): Free+ (Premium for templates, task dependencies)
 * - PORTFOLIO (2 modules): Business+ (portfolios, allocations)
 * - GOALS (3 modules): Business+ (goals, relationships, time periods)
 * - AUTOMATION (5 modules): Free+ (rules, webhooks, jobs, bulk/workflow ops)
 * - REPORTING (2 modules): Enterprise only + Service Account (audit log, org exports)
 * - COLLABORATION (3 modules): Free+ (status updates, reactions, tags)
 * - ADVANCED (12 modules): Mixed (Premium for custom fields, Business for time tracking, Enterprise for custom objects)
 *
 * All tools include comprehensive descriptions with API limitations, constraints,
 * plan requirements, and MCP annotations (readOnlyHint, destructiveHint, idempotentHint).
 *
 * @module tools
 */

// WORKSPACE - User, team, and organization management (Free+)
const workspaceTools = require('./workspace/workspaces');
const userTools = require('./workspace/users');
const teamTools = require('./workspace/teams');
const membershipTools = require('./workspace/memberships');

// PROJECTS - Project management and configuration (Free+, Premium for templates/custom fields)
const projectTools = require('./projects/projects');
const projectOperationTools = require('./projects/project-operations');
const projectStatusTools = require('./projects/project-statuses');
const projectBriefTools = require('./projects/project-briefs');
const projectTemplateTools = require('./projects/project-templates');
const sectionTools = require('./projects/sections');

// TASKS - Task management and operations (Free+, Premium for templates)
const taskTools = require('./tasks/tasks');
const taskOperationTools = require('./tasks/task-operations');
const taskTemplateTools = require('./tasks/task-templates');
const userTaskListTools = require('./tasks/user-task-lists');
const storyTools = require('./tasks/stories');
const attachmentTools = require('./tasks/attachments');

// PORTFOLIO - Portfolio and resource management (Business+)
const portfolioTools = require('./portfolio/portfolios');
const allocationTools = require('./portfolio/allocations');

// GOALS - Goals and OKR management (Business+)
const goalTools = require('./goals/goals');
const goalRelationshipTools = require('./goals/goal-relationships');
const timePeriodTools = require('./goals/time-periods');

// AUTOMATION - Rules, webhooks, and automation (Free+, rules have API limitations)
const ruleTools = require('./automation/rules');
const ruleBulkTools = require('./automation/rules-bulk');
const ruleWorkflowTools = require('./automation/rules-workflows');
const webhookTools = require('./automation/webhooks');
const jobTools = require('./automation/jobs');

// REPORTING - Exports and audit logs (Enterprise only, Service Account required)
const organizationExportTools = require('./reporting/organization-exports');
const auditLogTools = require('./reporting/audit-log');

// COLLABORATION - Communication and collaboration (Free+)
const statusUpdateTools = require('./collaboration/status-updates');
const reactionTools = require('./collaboration/reactions');
const tagTools = require('./collaboration/tags');

// ADVANCED - Advanced features and integrations (Mixed: Premium/Business/Enterprise)
const batchTools = require('./advanced/batch');
const bulkOperationTools = require('./advanced/bulk-operations');
const compositeOperationTools = require('./advanced/composite-operations');
const customFieldTools = require('./advanced/custom-fields');
const customFieldSettingTools = require('./advanced/custom-field-settings');
const customObjectTools = require('./advanced/custom-objects');
const typeaheadTools = require('./advanced/typeahead');
const eventTools = require('./advanced/events');
const externalDataTools = require('./advanced/external-data');
const timeTrackingTools = require('./advanced/time-tracking');
const accessRequestTools = require('./advanced/access-requests');
const genericMembershipTools = require('./advanced/generic-memberships');
const workspaceAdvisorTools = require('./advanced/workspace-advisor');

/**
 * Get all tools organized by category
 * @param {AsanaClient} client - Asana API client
 * @returns {Array} All tool definitions
 */
function getAllTools(client) {
  return [
    // WORKSPACE (4 modules)
    ...workspaceTools(client),
    ...userTools(client),
    ...teamTools(client),
    ...membershipTools(client),

    // PROJECTS (6 modules)
    ...projectTools(client),
    ...projectOperationTools(client),
    ...projectStatusTools(client),
    ...projectBriefTools(client),
    ...projectTemplateTools(client),
    ...sectionTools(client),

    // TASKS (6 modules)
    ...taskTools(client),
    ...taskOperationTools(client),
    ...taskTemplateTools(client),
    ...userTaskListTools(client),
    ...storyTools(client),
    ...attachmentTools(client),

    // PORTFOLIO (2 modules)
    ...portfolioTools(client),
    ...allocationTools(client),

    // GOALS (3 modules)
    ...goalTools(client),
    ...goalRelationshipTools(client),
    ...timePeriodTools(client),

    // AUTOMATION (5 modules)
    ...ruleTools(client),
    ...ruleBulkTools(client),
    ...ruleWorkflowTools(client),
    ...webhookTools(client),
    ...jobTools(client),

    // REPORTING (2 modules)
    ...organizationExportTools(client),
    ...auditLogTools(client),

    // COLLABORATION (3 modules)
    ...statusUpdateTools(client),
    ...reactionTools(client),
    ...tagTools(client),

    // ADVANCED (12 modules)
    ...batchTools(client),
    ...bulkOperationTools(client),
    ...compositeOperationTools(client),
    ...customFieldTools(client),
    ...customFieldSettingTools(client),
    ...customObjectTools(client),
    ...typeaheadTools(client),
    ...eventTools(client),
    ...externalDataTools(client),
    ...timeTrackingTools(client),
    ...accessRequestTools(client),
    ...genericMembershipTools(client),

    // ADVISOR (1 module)
    ...workspaceAdvisorTools(client)
  ];
}

module.exports = { getAllTools };
