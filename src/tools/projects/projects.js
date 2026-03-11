/**
 * Project Tools - Complete CRUD + Duplication + Task Counts
 *
 * Projects are collections of tasks organized into sections. They can use different
 * layouts (list, board, timeline, calendar) and belong to a team within an organization.
 * A task can exist in multiple projects simultaneously (multi-homing).
 *
 * Plan requirements: Free (basic projects), Premium (custom fields, timeline), Business (portfolios, goals)
 * Rate limits: Standard (1500 req/min paid, 150 req/min free)
 *
 * Key constraints:
 * - start_on and due_on cannot be the same date
 * - due_on or due_at must be present when setting start_on
 * - Layout (list/board/timeline/calendar) cannot be changed after project creation
 * - Project duplication returns async Job — poll with get_job
 * - Rules are NOT duplicated when copying projects via API
 * - Max ~50,000 tasks per active project
 * - 18 predefined color options + 'none'
 *
 * NOT possible via API:
 * - Creating forms or intake workflows for projects
 * - Creating/modifying dashboard charts or custom views
 * - Setting up approval workflows beyond task-level approvals
 * - Creating Timeline/Gantt configurations
 *
 * @module projects
 */
module.exports = (client) => [
  {
    name: 'list_projects',
    description: 'List projects in a workspace or team. Returns paginated results (max 100/page). Filter by workspace, team, or archived status. As of Feb 2025, workspace parameter is required for users in multiple workspaces. Without pagination, results truncate at ~1000 items. Related: get_project for details, create_project for new projects, search_tasks to find tasks across projects.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID to list projects from' },
        team: { type: 'string', description: 'Team GID to list projects from (more specific than workspace)' },
        archived: { type: 'boolean', description: 'Filter by archived status. true=archived only, false=active only (default)' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,owner.name,due_on,color,archived,current_status_update"' }
      },
      required: ['workspace']
    },
    handler: async (args) => {
      const params = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) params[key] = value;
      }
      if (!params.limit) params.limit = 20;
      return await client.get('/projects', params);
    }
  },
  {
    name: 'get_project',
    description: 'Get complete details of a project by its GID. Returns name, owner, dates, layout, members, custom field settings, privacy, and more. Use opt_fields to limit response — without it, response includes all fields which can be large for projects with many custom fields. Related: list_projects to find GIDs, update_project to modify, get_project_sections for section listing.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,owner.name,due_on,start_on,notes,members,custom_field_settings,color,layout,default_view"' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/projects/${args.project_gid}`, params);
    }
  },
  {
    name: 'create_project',
    description: 'Create a new project in a workspace or team. Either workspace or team is required — in organizations, team is recommended. CONSTRAINTS: Layout (list/board/timeline/calendar) is set at creation and CANNOT be changed afterward. start_on and due_on cannot be the same date. due_on must be set if setting start_on. Privacy options: public_to_workspace, private_to_team, private. 18 color options available (dark-pink through light-warm-gray, or none). html_notes must be wrapped in <body> tags. Cannot create forms, charts, or custom views via API — use Asana UI. Related: update_project, create_section to add sections, add_project_members to add team access.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID (for personal or workspace-level projects)' },
        team: { type: 'string', description: 'Team GID (recommended for organization projects)' },
        name: { type: 'string', description: 'Project name' },
        notes: { type: 'string', description: 'Plain text project description' },
        html_notes: { type: 'string', description: 'Rich HTML description. Wrap in <body> tags. Overrides notes.' },
        public: { type: 'boolean', description: 'Whether project is public to workspace (default: true)' },
        privacy_setting: { type: 'string', enum: ['public_to_workspace', 'private_to_team', 'private'], description: 'Privacy level for the project' },
        color: { type: 'string', enum: ['dark-pink', 'dark-green', 'dark-blue', 'dark-red', 'dark-teal', 'dark-brown', 'dark-orange', 'dark-purple', 'dark-warm-gray', 'light-pink', 'light-green', 'light-blue', 'light-red', 'light-teal', 'light-brown', 'light-orange', 'light-purple', 'light-warm-gray', 'none'], description: 'Project color in Asana UI' },
        layout: { type: 'string', enum: ['list', 'board', 'timeline', 'calendar'], description: 'Project layout type (default: list)' },
        default_view: { type: 'string', enum: ['list', 'board', 'timeline', 'calendar', 'overview'], description: 'Default view when opening the project' },
        due_on: { type: 'string', description: 'Project due date YYYY-MM-DD' },
        start_on: { type: 'string', description: 'Project start date YYYY-MM-DD' },
        owner: { type: 'string', description: 'User GID for project owner' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['name']
    },
    handler: async (args) => {
      if (!args.workspace && !args.team) {
        throw new Error('Either workspace or team parameter is required');
      }
      const { opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/projects', data, { params });
    }
  },
  {
    name: 'update_project',
    description: 'Update an existing project. Only provided fields are changed — omitted fields remain unchanged. CONSTRAINTS: Layout cannot be changed after creation. start_on cannot be set without due_on. start_on and due_on cannot be the same date. Set archived=true to archive (hides from default views but preserves all data). Set owner to null to remove owner. Related: get_project to see current state, delete_project for permanent removal.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID to update' },
        name: { type: 'string', description: 'New project name' },
        notes: { type: 'string', description: 'New plain text description' },
        html_notes: { type: 'string', description: 'New rich HTML description' },
        archived: { type: 'boolean', description: 'Archive (true) or unarchive (false) the project' },
        public: { type: 'boolean', description: 'Change project visibility' },
        color: { type: 'string', enum: ['dark-pink', 'dark-green', 'dark-blue', 'dark-red', 'dark-teal', 'dark-brown', 'dark-orange', 'dark-purple', 'dark-warm-gray', 'light-pink', 'light-green', 'light-blue', 'light-red', 'light-teal', 'light-brown', 'light-orange', 'light-purple', 'light-warm-gray', 'none'], description: 'Project color' },
        default_view: { type: 'string', enum: ['list', 'board', 'timeline', 'calendar', 'overview'], description: 'Default view' },
        due_on: { type: 'string', description: 'Due date YYYY-MM-DD or null to clear' },
        start_on: { type: 'string', description: 'Start date YYYY-MM-DD or null to clear' },
        owner: { type: 'string', description: 'New owner user GID or null' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/projects/${project_gid}`, data, { params });
    }
  },
  {
    name: 'delete_project',
    description: 'Permanently delete a project. DESTRUCTIVE: Cannot be undone. Tasks that exist ONLY in this project are also deleted. Tasks multi-homed to other projects remain in those projects. Consider using update_project with archived=true to archive instead — archiving preserves all data and is reversible. Related: update_project with archived=true for safe archival.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID to permanently delete' }
      },
      required: ['project_gid']
    },
    handler: async (args) => await client.delete(`/projects/${args.project_gid}`)
  },
  {
    name: 'duplicate_project',
    description: 'Create a copy of an existing project. Returns an async Job — use get_job to poll for completion (may take minutes for large projects). Select what to include via the include array: task_notes, task_assignee, task_subtasks, task_attachments, task_tags, task_followers, task_projects, task_dates, task_dependencies. IMPORTANT: Rules and forms are NOT duplicated. Use schedule_dates to shift all task dates relative to a new start/due date; set should_skip_weekends=true to avoid weekend dates. Max 5 concurrent duplication jobs per user. Related: create_project for blank projects, get_job to track progress, instantiate_project_template for template-based creation.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID to duplicate' },
        name: { type: 'string', description: 'Name for the duplicated project' },
        team: { type: 'string', description: 'Team GID for the new project' },
        include: {
          type: 'array',
          items: { type: 'string', enum: ['task_notes', 'task_assignee', 'task_subtasks', 'task_attachments', 'task_tags', 'task_followers', 'task_projects', 'task_dates', 'task_dependencies'] },
          description: 'What to copy. Options: task_notes, task_assignee, task_subtasks, task_attachments, task_tags, task_followers, task_projects, task_dates, task_dependencies'
        },
        schedule_dates: {
          type: 'object',
          description: 'Set dates for the new project. Properties: should_skip_weekends (boolean), due_on or start_on (YYYY-MM-DD)',
          properties: {
            should_skip_weekends: { type: 'boolean' },
            due_on: { type: 'string' },
            start_on: { type: 'string' }
          }
        },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['project_gid', 'name']
    },
    handler: async (args) => {
      const { project_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/projects/${project_gid}/duplicate`, data, { params });
    }
  },
  {
    name: 'get_project_sections',
    description: 'List all sections in a project, in order. Sections organize tasks into groups — they appear as columns in board view or headers in list view. Every project has at least one default section ("Untitled section"). Returns max 100 per page. Related: create_section to add sections, get_section for details, list_tasks with section filter.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,created_at"' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, ...params } = args;
      return await client.get(`/projects/${project_gid}/sections`, params);
    }
  },
  {
    name: 'get_project_task_counts',
    description: 'Get task count breakdown for a project. Returns counts of completed, incomplete, and total tasks, plus milestone counts. Useful for project health monitoring, progress tracking, and building dashboards. NOTE: Counts may be slightly delayed for very active projects. Related: list_project_tasks for the actual task list, get_project for project details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "num_tasks,num_completed_tasks,num_incomplete_tasks,num_milestones"' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/projects/${args.project_gid}/task_counts`, params);
    }
  }
];
