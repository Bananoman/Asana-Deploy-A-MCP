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
    description: 'Create a task. Direct action — do NOT call get_current_user, list_workspaces, or workspace_typeahead first; this tool resolves project/workspace/assignee context from the args you pass. Supports assignee, due/start dates, custom fields, subtypes (milestone, approval), rich text html_notes. Pass either workspace GID OR at least one project GID. For subtasks use create_subtask. Constraints: milestones have no start_on/start_at; html_notes wrapped in <body>, allowed tags strong/em/u/s/code/ol/ul/li/a/blockquote; enum custom fields take enum_option GID (use set_custom_field_value if you only have the option label); formula/custom_id fields are read-only; due_on (YYYY-MM-DD) and due_at (ISO 8601) mutually exclusive. Related: update_task, add_task_to_project, add_task_to_section, set_custom_field_value, bulk_create_tasks (many at once).',
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
        custom_fields: { type: 'object', description: 'Map of custom field GID to value. For enum fields, use the enum_option GID as value. For date fields pass "YYYY-MM-DD" string and add the GID to custom_field_types as "date". For people fields pass array of user GIDs and mark as "people". Example: {"12345":"67890","99999":"2026-06-15"}' },
        custom_field_types: { type: 'object', description: 'Optional map of custom field GID to Asana type ("text","number","enum","multi_enum","date","people"). REQUIRED for date and people fields so handler can shape the value into the API\'s expected object format. Example: {"99999":"date"}' },
        memberships: { type: 'array', items: { type: 'object' }, description: 'Array of {project, section} objects to place task in specific sections' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['name']
    },
    handler: async (args) => {
      const { opt_fields, custom_field_types, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      if (data.custom_fields) data.custom_fields = client.shapeCustomFieldsMap(data.custom_fields, custom_field_types);
      return await client.post('/tasks', data, { params });
    }
  },
  {
    name: 'update_task',
    description: 'Update an existing task (rename, reassign, change dates, mark complete, set notes, change custom fields). Direct action — do NOT call get_task or get_current_user first; only the fields you pass are changed, omitted fields stay. Use for "mark task X complete", "push due date to Friday", "reassign to Carlos", "archive this task" (pass completed=true or archived=true). Constraints: cannot change resource_subtype to milestone if start_on is set; formula/custom_id custom fields are read-only; assignee=null unassigns; due_on/start_on=null clears the date. modified_at does NOT update on project/section moves or comments. Related: get_task (current state), create_task (new), set_custom_field_value (custom-field-only edits), bulk_update_tasks (many).',
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
        custom_fields: { type: 'object', description: 'Map of custom field GID to new value. For date/people fields the value must be shaped — pass plain strings/arrays and provide custom_field_types so the handler shapes them automatically. Example: {"99999":"2026-06-15"} with custom_field_types:{"99999":"date"}' },
        custom_field_types: { type: 'object', description: 'Optional map of custom field GID to Asana type ("text","number","enum","multi_enum","date","people"). REQUIRED for date and people fields so handler can shape the value into the API\'s expected object format.' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, opt_fields, custom_field_types, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      if (data.custom_fields) data.custom_fields = client.shapeCustomFieldsMap(data.custom_fields, custom_field_types);
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
    description: 'Create a subtask under a parent task — use to break down work ("split task X into 4 subtasks: design, copy, dev, QA", "add a child task to Y"). Direct action — pass parent task by GID; do NOT call get_task first. Supports all task fields (assignee, dates, custom fields, notes). Subtasks do NOT auto-inherit parent project — call add_task_to_project separately if needed. Max 5 levels deep (beyond fails silently). Related: get_task_subtasks (list children), set_task_parent (move existing task under a parent), create_task (top-level).',
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
    description: 'Relate an existing task to an additional project (multi-homing) — use for "also add task X to the Marketing project", "share this task with the QA backlog". Direct action — pass task and project by GID; do NOT call get_task or get_project first. Tasks can belong to many projects at once. Optional: section, insert_before/insert_after (mutually exclusive). No section → goes to project default section. Use create_task to make a NEW task in a project. Related: remove_task_from_project, add_task_to_section (move within same project).',
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
    description: 'Mark a task as blocked by / waiting on other tasks (this task cannot proceed until they complete) — use for "make task 200 blocked by tasks 100 and 150", building dependency chains, critical-path setup. Direct action — pass task and dependency GIDs; do NOT call get_task first. Max 30 combined dependencies + dependents per task. Dependencies can span projects. Circular dependencies are rejected. Approval tasks have known bugs with dependency behavior. Related: add_task_dependents (reverse: this task blocks others), remove_task_dependencies.',
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
    description: 'Find tasks across a workspace by text, tag, project, section, assignee, completion, due/start/modified/created date, or custom field value. Direct action — do NOT call list_workspaces, get_current_user, or workspace_typeahead first. Use for "find overdue tasks tagged urgent", "tasks due this week assigned to Carlos", "completed tasks in project X last sprint". Date filters: YYYY-MM-DD for due_on/start_on, ISO 8601 for completed_on/modified_on/created_on. Sort via sort_by (default modified_at desc). Note: 60 req/min rate limit (vs 1500 elsewhere); capped at ~1000 results — narrow filters for larger sets; does not search subtask content. Related: list_tasks (simple project listing, no rate cap), get_task (full details).',
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
    description: 'Clone / copy / duplicate an existing task — use for "duplicate task X so I can reuse it", "clone this kickoff template", reusable task patterns. Direct action — pass source task GID; do NOT call get_task first. Choose what to copy via include array: notes, assignee, subtasks, attachments, tags, followers, projects, dates, dependencies, parent. Async — returns a Job; poll with get_job for the new task GID (seconds for large tasks). Related: create_task (fresh task), instantiate_task_template (from template), get_job (status).',
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
