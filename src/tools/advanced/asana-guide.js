/**
 * Asana Guide — Single reference tool that replaces repeated context in tool descriptions
 *
 * Returns Asana data model, GID format, date formats, opt_fields guidance,
 * rate limits, plan requirements, and "what's NOT possible via API".
 *
 * @module asana-guide
 */

module.exports = function asanaGuideTools(client) {
  return [
    {
      name: 'get_asana_guide',
      description: 'Get Asana API reference guide: data model, GID format, date formats, opt_fields tips, rate limits, plan requirements, and known API limitations. Call this FIRST if you are unfamiliar with Asana API conventions. Saves you from trial-and-error on every tool call.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['all', 'data_model', 'formats', 'rate_limits', 'plan_requirements', 'api_limitations', 'opt_fields', 'ai_teammates'],
            description: 'Specific topic to retrieve. Default: all'
          }
        }
      },
      handler: async (args) => {
        const topic = args.topic || 'all';
        const sections = {};

        // ─── Data Model ───
        sections.data_model = {
          hierarchy: 'Organization/Workspace → Team → Project → Section → Task → Subtask',
          key_concepts: {
            workspace: 'Top-level container. All resources belong to a workspace. Use list_workspaces to get your workspace GID.',
            team: 'Groups users within an organization. Projects belong to teams.',
            project: 'Collection of tasks. Has a layout (list/board/timeline/calendar) that is IMMUTABLE after creation.',
            section: 'Groups tasks within a project. Tasks can be in multiple projects but only one section per project.',
            task: 'Unit of work. Can have subtasks, custom fields, attachments, stories (comments), tags, dependencies.',
            story: 'Comment or system activity on a task. Only user-created comments can be edited/deleted.',
            custom_field: 'Typed field (text/number/enum/multi_enum/date/people) attached to projects/portfolios/goals. Type is IMMUTABLE after creation.',
            goal: 'OKR-style objective. Requires Business+ plan. Supports metrics, time periods, and parent/child relationships.',
            portfolio: 'Collection of projects for tracking. Requires Business+ plan.',
            rule: 'Automation: 1 trigger + 1 action per rule. IMPORTANT: Rules only fire on UI changes, NOT on API changes.',
            webhook: 'Real-time event notifications. Requires HTTPS endpoint with handshake support.',
          }
        };

        // ─── Formats ───
        sections.formats = {
          gid: 'String of digits (e.g., "1234567890"). Always pass as string, never as number.',
          dates: {
            due_on: 'YYYY-MM-DD (date only, no time)',
            due_at: 'ISO 8601 with timezone (e.g., "2026-03-28T17:00:00.000Z"). Mutually exclusive with due_on.',
            created_at: 'ISO 8601, read-only',
            modified_at: 'ISO 8601, read-only'
          },
          html_notes: 'Supported tags: <body>, <h1>, <h2>, <strong>, <em>, <u>, <s>, <ol>, <ul>, <li>, <a href="...">, <code>. Must be wrapped in <body> tags.',
          colors: '18 options: dark-pink, dark-green, dark-blue, dark-red, dark-teal, dark-brown, dark-orange, dark-purple, dark-warm-gray, light-pink, light-green, light-blue, light-red, light-teal, light-brown, light-orange, light-purple, light-warm-gray, none'
        };

        // ─── Rate Limits ───
        sections.rate_limits = {
          standard: '1500 requests/minute (we use 1400 for safety margin)',
          search: '60 requests/minute for search_tasks — use list_tasks when possible',
          concurrent: '150 max concurrent requests',
          rate_limit_response: '429 status code with Retry-After header',
          bulk_operations: 'Each sub-operation counts individually (10 tasks = 10 API calls)',
          batch_api: 'Max 10 parallel actions per batch_api call'
        };

        // ─── Plan Requirements ───
        sections.plan_requirements = {
          free: 'workspaces, teams, projects, tasks, sections, stories, tags, attachments, webhooks, rules (basic)',
          premium: 'custom fields, project templates, task templates, task dependencies, timeline view, forms',
          business: 'goals, portfolios, allocations, time tracking, approvals, advanced rules',
          enterprise: 'audit logs, organization exports, custom objects, SCIM, SAML SSO, admin controls'
        };

        // ─── API Limitations ───
        sections.api_limitations = {
          rules: 'Rules created via API only fire on UI changes, NOT on API-triggered changes. Use trigger_rule tool to work around this.',
          forms: 'Cannot create or manage forms via API — UI only.',
          custom_views: 'Cannot create saved views, filters, or sorts via API.',
          dashboards: 'Cannot create or configure dashboard charts via API.',
          project_layout: 'Layout (list/board/timeline/calendar) is IMMUTABLE after project creation.',
          status_updates: 'IMMUTABLE after creation — cannot edit, only delete and recreate.',
          custom_field_type: 'Type is IMMUTABLE after creation — must delete and recreate to change type.',
          time_periods: 'READ-ONLY — fiscal periods are configured in Asana UI only.',
          formula_fields: 'Formula custom fields are READ-ONLY via API.',
          async_operations: 'duplicate_project, instantiate_project_template, create_organization_export return a Job GID — poll with get_job.',
          pagination: 'Default limit varies by endpoint (20-100). Use offset token from next_page for pagination. Results may be truncated at ~1000 items without pagination.',
          bulk_ops: 'Non-atomic: partial failures are possible. Earlier ops are NOT rolled back if later ones fail.'
        };

        // ─── Opt Fields ───
        sections.opt_fields = {
          purpose: 'Use opt_fields parameter to request only the fields you need. Reduces response size and improves performance.',
          common_task_fields: 'name, assignee.name, due_on, completed, notes, custom_fields, memberships.project.name, tags.name',
          common_project_fields: 'name, owner.name, due_on, current_status, members.name, custom_field_settings',
          common_user_fields: 'name, email, photo.image_60x60',
          tip: 'Without opt_fields, API returns a compact representation (GID + name only for nested resources). Add opt_fields to get full details.'
        };

        // ─── AI Teammates ───
        sections.ai_teammates = {
          what_they_are: 'Asana AI Teammates are AI agents that work inside Asana. Currently in beta (free during beta). They respond to task assignment, @mentions, or workflow triggers.',
          strong_use_cases: ['draft briefs', 'review specs/bug reports', 'summarize status and risks', 'create prep packs and checklists', 'synthesize recurring updates', 'produce closeout/debrief documents'],
          cannot_do: ['browse live web', 'call external APIs', 'read/write databases or CRMs', 'create custom fields or dependencies', 'bulk update tasks', 'create milestones or goals', 'send emails', 'generate images/PDFs', 'continuously monitor/poll'],
          access_model: 'New Teammates see domain-public work only. Must be explicitly added to private projects. File access uses the triggering user\'s tokens.',
          advisor_tools: 'Use analyze_workspace_overview, analyze_project_ai_readiness, detect_team_industry, validate_ai_capability, and generate_teammate_blueprint for AI automation planning.'
        };

        // Return requested topic or all
        if (topic !== 'all' && sections[topic]) {
          return { topic, guide: sections[topic] };
        }

        return {
          guide: sections,
          tip: 'Use topic parameter to get a specific section: data_model, formats, rate_limits, plan_requirements, api_limitations, opt_fields, ai_teammates'
        };
      }
    }
  ];
};
