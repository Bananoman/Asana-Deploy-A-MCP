/**
 * Task Tools - Complete CRUD + Search + Subtasks + Dependencies + Project Relations
 *
 * Tasks are the fundamental unit of work in Asana. Each task belongs to at most one workspace
 * and can be in multiple projects simultaneously (multi-homing). Tasks support rich text (HTML),
 * custom fields, subtasks (up to 5 levels deep), dependencies, and file attachments.
 *
 * Plan requirements: Free (basic), Premium (custom fields, task templates), Business (time tracking)
 * Rate limits: 1500 req/min (paid), 150 req/min (free). Search endpoint: 60 req/min (separate limit).
 *
 * Key constraints:
 * - Milestones cannot have start_on/start_at dates
 * - Formula custom fields are read-only (cannot be set via API)
 * - html_notes must be wrapped in <body> tags
 * - Due dates: YYYY-MM-DD for due_on, ISO 8601 for due_at (mutually exclusive)
 * - Max ~20 projects per task, max 5 levels subtask nesting, max 30 dependencies+dependents per task
 * - modified_at does NOT update on container moves or comments alone
 *
 * NOT possible via API:
 * - Creating task views (Board, List, Timeline, Calendar) — UI only
 * - Creating forms that generate tasks — UI only
 * - AI-powered task operations — UI only
 *
 * @module tasks
 */
module.exports = (client) => [
  // ===== Basic CRUD =====
  {
    name: 'list_tasks',
    description: 'List tasks filtered by project, assignee, section, or tag. Returns paginated results (default 20, max 100 per page). At least one filter (project, section, tag, or assignee+workspace) is required. Without pagination, results truncate at ~1000 items. Use opt_fields to control returned fields and reduce payload size. For full-text search use search_tasks instead (note: search has a stricter rate limit of 60 req/min). Related: get_task for full details, search_tasks for advanced filtering, list_project_tasks for project-specific listing.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project GID to list tasks from' },
        assignee: { type: 'string', description: 'User GID or "me" to filter by assignee. Requires workspace if used.' },
        section: { type: 'string', description: 'Section GID to list tasks from' },
        workspace: { type: 'string', description: 'Workspace GID (required when filtering by assignee)' },
        completed_since: { type: 'string', description: 'ISO 8601 date string. Only return tasks completed since this date. Use "now" for incomplete tasks only.' },
        modified_since: { type: 'string', description: 'ISO 8601 date string. Only return tasks modified since this date.' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "name,assignee,due_on,completed,custom_fields". Reduces response size.' }
      },
      required: []
    },
    handler: async (args) => {
      const params = {};
      if (args.project) params.project = args.project;
      if (args.assignee) params.assignee = args.assignee;
      if (args.section) params.section = args.section;
      if (args.workspace) params.workspace = args.workspace;
      if (args.completed_since) params.completed_since = args.completed_since;
      if (args.modified_since) params.modified_since = args.modified_since;
      params.limit = args.limit || 20;
      if (args.offset) params.offset = args.offset;
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get('/tasks', params);
    }
  },
  {
    name: 'get_task',
    description: 'Get complete details of a single task by its GID. Returns all task fields including name, assignee, due dates, custom fields, projects, tags, followers, and more. Use opt_fields to limit response and improve performance — without it, the response can be very large for tasks with many custom fields. NOTE: Formula custom field values are computed server-side and may briefly lag after input field changes. Related: list_tasks to find tasks, search_tasks to find by text, update_task to modify.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'The globally unique identifier (GID) of the task' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "name,assignee.name,due_on,completed,notes,custom_fields,projects.name,tags.name"' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/tasks/${args.task_gid}`, params);
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task in a workspace/project. Supports full task configuration: assignee, dates, custom fields, subtypes (milestone, approval), rich text via html_notes, and more. Either workspace or at least one project GID is required. CONSTRAINTS: Milestones cannot have start_on/start_at. html_notes must be wrapped in <body> tags; supported tags: strong, em, u, s, code, ol, ul, li, a, blockquote. For enum custom fields, use the enum_option GID as value (not the option name). Formula and custom_id fields are read-only and cannot be set. Date formats: YYYY-MM-DD for due_on/start_on, ISO 8601 for due_at/start_at (due_on and due_at are mutually exclusive). For subtasks, use create_subtask instead. Related: update_task, add_task_to_project, add_task_to_section, set_custom_field_value.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID (required if no project specified)' },
        name: { type: 'string', description: 'Task name/title' },
        notes: { type: 'string', description: 'Plain text description' },
        html_notes: { type: 'string', description: 'Rich text description in HTML. Wrap in <body> tags. Supports: <strong>, <em>, <u>, <s>, <code>, <ol>, <ul>, <li>, <a>, <blockquote>. Overrides notes if both provided.' },
        projects: { type: 'array', items: { type: 'string' }, description: 'Array of project GIDs to add the task to' },
        assignee: { type: 'string', description: 'User GID or "me" to assign the task to' },
        assignee_section: { type: 'string', description: 'Section GID in assignee My Tasks to place this task' },
        due_on: { type: 'string', description: 'Due date in YYYY-MM-DD format. Cannot be used with due_at.' },
        due_at: { type: 'string', description: 'Due datetime in ISO 8601 format (e.g. 2024-03-15T12:00:00.000Z). Cannot be used with due_on.' },
        start_on: { type: 'string', description: 'Start date in YYYY-MM-DD format. Cannot be set on milestones.' },
        start_at: { type: 'string', description: 'Start datetime in ISO 8601 format' },
        completed: { type: 'boolean', description: 'Whether the task is completed (default: false)' },
        resource_subtype: { type: 'string', enum: ['default_task', 'milestone', 'approval'], description: 'Task subtype. milestone: key moment with no date range. approval: requires approval workflow.' },
        approval_status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'changes_requested'], description: 'Approval status (only for approval subtypes)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Array of tag GIDs to attach' },
        followers: { type: 'array', items: { type: 'string' }, description: 'Array of user GIDs to add as followers (will receive notifications)' },
        parent: { type: 'string', description: 'Parent task GID to create this as a subtask' },
        custom_fields: { type: 'object', description: 'Map of custom field GID to value. For enum fields, use the enum_option GID as value. Example: {"12345":"67890"}' },
        memberships: { type: 'array', items: { type: 'object' }, description: 'Array of {project, section} objects to place task in specific sections' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['name']
    },
    handler: async (args) => {
      const { opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/tasks', data, { params });
    }
  },
  {
    name: 'update_task',
    description: 'Update an existing task. Only the provided fields are changed — omitted fields remain unchanged. Supports modifying any task field: name, assignee, dates, completion status, custom fields, rich text notes, and more. CONSTRAINTS: Cannot change resource_subtype to milestone if task has start_on set. Formula and custom_id custom fields are read-only. Setting assignee to null unassigns the task. Setting due_on/start_on to null clears the date. NOTE: modified_at timestamp does NOT update when tasks are moved between projects/sections or when comments are added. Related: get_task to see current state, create_task for new tasks, set_custom_field_value for custom field-only updates.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'The GID of the task to update' },
        name: { type: 'string', description: 'New task name' },
        notes: { type: 'string', description: 'New plain text description' },
        html_notes: { type: 'string', description: 'New rich text description in HTML (overrides notes)' },
        completed: { type: 'boolean', description: 'Mark task as completed (true) or incomplete (false)' },
        assignee: { type: 'string', description: 'User GID, "me", or null to unassign' },
        due_on: { type: 'string', description: 'Due date YYYY-MM-DD or null to clear' },
        due_at: { type: 'string', description: 'Due datetime ISO 8601 or null to clear' },
        start_on: { type: 'string', description: 'Start date YYYY-MM-DD or null to clear' },
        start_at: { type: 'string', description: 'Start datetime ISO 8601 or null to clear' },
        resource_subtype: { type: 'string', enum: ['default_task', 'milestone', 'approval'], description: 'Change task subtype' },
        approval_status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'changes_requested'], description: 'Set approval status (only for approval tasks)' },
        custom_fields: { type: 'object', description: 'Map of custom field GID to new value' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/tasks/${task_gid}`, data, { params });
    }
  },
  {
    name: 'delete_task',
    description: 'Permanently delete a task by its GID. DESTRUCTIVE: This action cannot be undone. The task is removed from all projects, and its subtasks become top-level tasks (they are not deleted). Consider using update_task with completed=true to mark done instead of deleting. Related: update_task to mark complete instead.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'The GID of the task to permanently delete' }
      },
      required: ['task_gid']
    },
    handler: async (args) => await client.delete(`/tasks/${args.task_gid}`)
  },

  // ===== Subtasks =====
  {
    name: 'get_task_subtasks',
    description: 'List all direct subtasks of a task. Only returns immediate children, not nested subtasks. To get deeper levels, call this recursively on each subtask. Asana supports up to 5 levels of subtask nesting. Returns max 100 per page. Related: create_subtask to add children, set_task_parent to reparent tasks.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Parent task GID' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,assignee.name,completed,due_on"' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, ...params } = args;
      return await client.get(`/tasks/${task_gid}/subtasks`, params);
    }
  },
  {
    name: 'create_subtask',
    description: 'Create a subtask under a parent task. Supports all task fields (assignee, dates, custom fields, etc.). IMPORTANT: Subtasks do NOT automatically inherit the parent project — use add_task_to_project separately if needed. Max nesting depth: 5 levels. Subtask nesting beyond 5 levels will fail silently. Related: get_task_subtasks, set_task_parent to move existing tasks under a parent.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Parent task GID' },
        name: { type: 'string', description: 'Subtask name' },
        notes: { type: 'string', description: 'Plain text description' },
        html_notes: { type: 'string', description: 'Rich text description in HTML' },
        assignee: { type: 'string', description: 'User GID or "me"' },
        due_on: { type: 'string', description: 'Due date YYYY-MM-DD' },
        due_at: { type: 'string', description: 'Due datetime ISO 8601' },
        start_on: { type: 'string', description: 'Start date YYYY-MM-DD' },
        completed: { type: 'boolean', description: 'Initial completion status' },
        resource_subtype: { type: 'string', enum: ['default_task', 'milestone', 'approval'] },
        custom_fields: { type: 'object', description: 'Map of custom field GID to value' },
        projects: { type: 'array', items: { type: 'string' }, description: 'Project GIDs to add this subtask to' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['task_gid', 'name']
    },
    handler: async (args) => {
      const { task_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/tasks/${task_gid}/subtasks`, data, { params });
    }
  },

  // ===== Task-Project Relationships =====
  {
    name: 'add_task_to_project',
    description: 'Add a task to a project (multi-homing). A task can belong to multiple projects simultaneously. Optionally specify a section, or position relative to other tasks using insert_before/insert_after (mutually exclusive). If no section is specified, the task is added to the project default section. Related: remove_task_from_project, add_task_to_section for section-only moves within same project.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to add' },
        project: { type: 'string', description: 'Target project GID' },
        section: { type: 'string', description: 'Section GID to place task in (optional)' },
        insert_before: { type: 'string', description: 'Task GID to insert before (mutually exclusive with insert_after)' },
        insert_after: { type: 'string', description: 'Task GID to insert after (mutually exclusive with insert_before)' }
      },
      required: ['task_gid', 'project']
    },
    handler: async (args) => {
      const { task_gid, ...data } = args;
      return await client.post(`/tasks/${task_gid}/addProject`, data);
    }
  },
  {
    name: 'remove_task_from_project',
    description: 'Remove a task from a project. The task is NOT deleted, only unlinked from the project. If the task is in multiple projects, it remains in the others. If removed from its last project, it becomes a standalone workspace task. Related: add_task_to_project, delete_task to permanently remove.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to remove' },
        project: { type: 'string', description: 'Project GID to remove from' }
      },
      required: ['task_gid', 'project']
    },
    handler: async (args) => {
      const { task_gid, project } = args;
      return await client.post(`/tasks/${task_gid}/removeProject`, { project });
    }
  },

  // ===== Dependencies =====
  {
    name: 'get_task_dependencies',
    description: 'List tasks that this task depends on (blockers — tasks that must complete before this one can start). A task can have at most 30 combined dependencies + dependents. Returns max 100 per page. Related: add_task_dependencies to add blockers, get_task_dependents for reverse direction (who depends on this task).',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, ...params } = args;
      return await client.get(`/tasks/${task_gid}/dependencies`, params);
    }
  },
  {
    name: 'add_task_dependencies',
    description: 'Set tasks that this task depends on (this task is blocked by them until they complete). Max 30 combined dependencies + dependents per task. Dependencies can span across projects. Circular dependencies are rejected. NOTE: Approval tasks have known bugs with dependency behavior. Related: remove_task_dependencies, add_task_dependents for reverse direction.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID that will be blocked' },
        dependencies: { type: 'array', items: { type: 'string' }, description: 'Array of task GIDs that block this task' }
      },
      required: ['task_gid', 'dependencies']
    },
    handler: async (args) => {
      const { task_gid, dependencies } = args;
      return await client.post(`/tasks/${task_gid}/addDependencies`, { dependencies });
    }
  },
  {
    name: 'remove_task_dependencies',
    description: 'Remove dependency relationships from a task. The dependency tasks are not deleted, only unlinked. Related: add_task_dependencies, get_task_dependencies.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to remove dependencies from' },
        dependencies: { type: 'array', items: { type: 'string' }, description: 'Array of task GIDs to remove as dependencies' }
      },
      required: ['task_gid', 'dependencies']
    },
    handler: async (args) => {
      const { task_gid, dependencies } = args;
      return await client.post(`/tasks/${task_gid}/removeDependencies`, { dependencies });
    }
  },

  // ===== Search =====
  {
    name: 'search_tasks',
    description: 'Search tasks in a workspace with advanced filters. IMPORTANT: This endpoint has a stricter rate limit of 60 requests/minute (vs 1500 for other endpoints). Results are capped at ~1000 items even with pagination — for larger datasets, use more specific filters. Does not search subtask content. Supports text search, filtering by assignee, project, section, tags, completion status, date ranges, and custom field values. Use sort_by to order results (default: modified_at descending). Date filters use different formats: YYYY-MM-DD for due_on/start_on filters, ISO 8601 for completed_on/modified_on/created_on filters. Related: list_tasks for simple project listing without rate limit penalty, get_task for full task details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID to search in (required)' },
        text: { type: 'string', description: 'Full-text search query across task name and description' },
        'assignee.any': { type: 'string', description: 'Comma-separated user GIDs to filter by assignee' },
        'assignee.not': { type: 'string', description: 'Comma-separated user GIDs to exclude' },
        'projects.any': { type: 'string', description: 'Comma-separated project GIDs - task must be in at least one' },
        'projects.not': { type: 'string', description: 'Comma-separated project GIDs to exclude' },
        'projects.all': { type: 'string', description: 'Comma-separated project GIDs - task must be in all' },
        'sections.any': { type: 'string', description: 'Comma-separated section GIDs' },
        'tags.any': { type: 'string', description: 'Comma-separated tag GIDs' },
        'tags.not': { type: 'string', description: 'Comma-separated tag GIDs to exclude' },
        'teams.any': { type: 'string', description: 'Comma-separated team GIDs' },
        'followers.not': { type: 'string', description: 'Comma-separated user GIDs to exclude from followers' },
        completed: { type: 'boolean', description: 'Filter by completion status (true=completed, false=incomplete)' },
        is_subtask: { type: 'boolean', description: 'Filter subtasks (true) or top-level tasks (false)' },
        has_attachment: { type: 'boolean', description: 'Filter tasks with (true) or without (false) attachments' },
        is_blocked: { type: 'boolean', description: 'Filter blocked tasks' },
        is_blocking: { type: 'boolean', description: 'Filter tasks that block others' },
        'completed_on.before': { type: 'string', description: 'ISO 8601 date - completed before this date' },
        'completed_on.after': { type: 'string', description: 'ISO 8601 date - completed after this date' },
        'modified_on.before': { type: 'string', description: 'ISO 8601 date - modified before this date' },
        'modified_on.after': { type: 'string', description: 'ISO 8601 date - modified after this date' },
        'due_on.before': { type: 'string', description: 'YYYY-MM-DD - due before this date' },
        'due_on.after': { type: 'string', description: 'YYYY-MM-DD - due after this date' },
        'due_on': { type: 'string', description: 'YYYY-MM-DD - due on this exact date' },
        'created_on.before': { type: 'string', description: 'ISO 8601 date - created before' },
        'created_on.after': { type: 'string', description: 'ISO 8601 date - created after' },
        'start_on.before': { type: 'string', description: 'YYYY-MM-DD - starts before' },
        'start_on.after': { type: 'string', description: 'YYYY-MM-DD - starts after' },
        sort_by: { type: 'string', enum: ['due_date', 'created_at', 'completed_at', 'likes', 'modified_at'], description: 'Sort field (default: modified_at)' },
        sort_ascending: { type: 'boolean', description: 'Sort ascending (true) or descending (false, default)' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['workspace']
    },
    handler: async (args) => {
      const params = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null) params[key] = value;
      }
      return await client.get('/workspaces/' + args.workspace + '/tasks/search', params);
    }
  },

  // ===== Duplicate =====
  {
    name: 'duplicate_task',
    description: 'Create a copy of an existing task. Select what to include in the copy via the include array: notes, assignee, subtasks, attachments, tags, followers, projects, dates, dependencies, parent. Returns an async Job — use get_job to poll for completion and retrieve the new task GID. The job may take a few seconds for tasks with many subtasks or attachments. Related: create_task for new tasks, get_job to check duplication status.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'GID of the task to duplicate' },
        name: { type: 'string', description: 'Name for the new duplicated task' },
        include: {
          type: 'array',
          items: { type: 'string', enum: ['notes', 'assignee', 'subtasks', 'attachments', 'tags', 'followers', 'projects', 'dates', 'dependencies', 'parent'] },
          description: 'What to include in the copy. Options: notes, assignee, subtasks, attachments, tags, followers, projects, dates, dependencies, parent'
        }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, ...data } = args;
      return await client.post(`/tasks/${task_gid}/duplicate`, data);
    }
  }
];
