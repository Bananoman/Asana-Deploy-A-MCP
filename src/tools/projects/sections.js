/**
 * Section Tools - CRUD + Task Assignment + Ordering
 *
 * Sections organize tasks within a project. In list view, sections appear as group headers.
 * In board view, sections become columns. Every project has at least one default section.
 *
 * Key constraints:
 * - Deleting a section moves its tasks to the project's first (default) section — tasks are NOT deleted
 * - Section names must be unique within a project
 * - Sections are project-scoped and cannot be shared across projects
 * - A task can only be in one section per project
 * - Use insert_section to reorder (not update_section)
 *
 * @module sections
 */
module.exports = (client) => [
  {
    name: 'list_sections',
    description: 'List all sections in a project, ordered by their position. Sections appear as columns in board view or group headers in list view. Every project has at least one default section. Returns max 100 per page. Related: create_section to add new sections, get_section for details, add_task_to_section to move tasks.',
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
    name: 'get_section',
    description: 'Get details of a specific section by GID. Returns section name, project reference, and creation date. Related: update_section to rename, list_sections for all sections, list_tasks with section filter to get tasks in this section.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        section_gid: { type: 'string', description: 'Section GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,project.name,created_at"' }
      },
      required: ['section_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/sections/${args.section_gid}`, params);
    }
  },
  {
    name: 'create_section',
    description: 'Create a new section in a project. New sections are added to the end of the project by default. In board view, this creates a new column. Use insert_section afterward to reorder if needed. Section names should be unique within the project. Related: list_sections, update_section, insert_section for reordering.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        name: { type: 'string', description: 'Section name (appears as group header or column title)' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['project_gid', 'name']
    },
    handler: async (args) => {
      const { project_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/projects/${project_gid}/sections`, data, { params });
    }
  },
  {
    name: 'update_section',
    description: 'Update a section name. NOTE: This only changes the section name — to reorder sections within a project, use insert_section instead. Related: get_section, insert_section for reordering, delete_section.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        section_gid: { type: 'string', description: 'Section GID to update' },
        name: { type: 'string', description: 'New section name' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['section_gid']
    },
    handler: async (args) => {
      const { section_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/sections/${section_gid}`, data, { params });
    }
  },
  {
    name: 'delete_section',
    description: 'Delete a section from a project. IMPORTANT: Tasks in the deleted section are NOT deleted — they are automatically moved to the project first (default) section. DESTRUCTIVE: Cannot be undone. Related: update_section to rename instead, list_sections.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        section_gid: { type: 'string', description: 'Section GID to delete' }
      },
      required: ['section_gid']
    },
    handler: async (args) => await client.delete(`/sections/${args.section_gid}`)
  },
  {
    name: 'add_task_to_section',
    description: 'Move a task into a specific section within its project. The task must already belong to the project containing this section. A task can only be in one section per project — moving it here removes it from its current section. Use insert_before/insert_after to control position within the section (mutually exclusive). Related: create_section, list_sections, add_task_to_project to add task to project first.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        section_gid: { type: 'string', description: 'Target section GID' },
        task: { type: 'string', description: 'Task GID to add to this section' },
        insert_before: { type: 'string', description: 'Task GID to insert before (mutually exclusive with insert_after)' },
        insert_after: { type: 'string', description: 'Task GID to insert after (mutually exclusive with insert_before)' }
      },
      required: ['section_gid', 'task']
    },
    handler: async (args) => {
      const { section_gid, ...data } = args;
      return await client.post(`/sections/${section_gid}/addTask`, data);
    }
  },
  {
    name: 'insert_section',
    description: 'Reorder a section within a project by placing it before or after another section. Use before_section or after_section (mutually exclusive — provide only one). Pass both as null to move the section to the end. This changes the visual order of columns (board) or groups (list). Related: create_section, list_sections.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID containing the sections' },
        section: { type: 'string', description: 'Section GID to move' },
        before_section: { type: 'string', description: 'Section GID to place before (mutually exclusive with after_section)' },
        after_section: { type: 'string', description: 'Section GID to place after (mutually exclusive with before_section)' }
      },
      required: ['project_gid', 'section']
    },
    handler: async (args) => {
      const { project_gid, ...data } = args;
      return await client.post(`/projects/${project_gid}/sections/insert`, data);
    }
  }
];
