/**
 * Tag Tools - Workspace-Scoped Cross-Project Label Management
 *
 * Tags are labels that can be applied to tasks across multiple projects for categorization,
 * filtering, and reporting. Tags are workspace-scoped — they are shared across ALL projects
 * in a workspace and anyone in the workspace can use any tag (no tag-level permissions).
 *
 * Plan requirements: Free (all tag features)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - Tags are workspace-scoped, not project-scoped (shared across entire workspace)
 * - No tag-level permissions — any workspace member can use, edit, or delete any tag
 * - 18 color options + "none": dark-pink, dark-green, dark-blue, dark-red, dark-teal,
 *   dark-brown, dark-orange, dark-purple, dark-warm-gray, light-pink, light-green,
 *   light-blue, light-red, light-teal, light-brown, light-orange, light-purple, light-warm-gray
 * - list_workspace_tags requires workspace parameter (mandatory since Feb 2025)
 * - Tags have notes field but no rich text description
 *
 * NOT possible via API (use Asana UI instead):
 * - Merging duplicate tags
 * - Bulk-applying tags to multiple tasks at once (use bulk_add_task_tags instead)
 *
 * @module tags
 */

module.exports = (client) => [
  {
    name: 'list_workspace_tags',
    description: 'List all tags in a workspace. Tags are workspace-scoped labels shared across all projects — any workspace member can use any tag. Returns paginated results (default 20, max 100) with tag names, colors, and GIDs. Use this to find existing tags before creating new ones to avoid duplicates. The workspace parameter is required (mandatory since Feb 2025). Related: create_tag to make new tags, get_tag for details, get_task_tags to see tags on a specific task, add_task_tag to apply a tag.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID to list tags from (required since Feb 2025)' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "name,color,created_at,followers,notes"' }
      },
      required: ['workspace']
    },
    handler: async (args) => {
      const { workspace, ...params } = args;
      if (!params.limit) params.limit = 20;
      return await client.get(`/workspaces/${workspace}/tags`, params);
    }
  },
  {
    name: 'create_tag',
    description: 'Create a workspace-scoped tag / label that can be applied to tasks across any project — use for "create an urgent tag", "add a #blocker label". Direct action — pass workspace by GID; do NOT call list_workspaces or list_workspace_tags first (no uniqueness constraint on tag names, but check duplicates if you care). Color options (18 + none): dark-pink, dark-green, dark-blue, dark-red, dark-teal, dark-brown, dark-orange, dark-purple, dark-warm-gray, light-pink, light-green, light-blue, light-red, light-teal, light-brown, light-orange, light-purple, light-warm-gray, none. Related: add_task_tag (apply to tasks), list_workspace_tags (browse existing), bulk_add_task_tags.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID to create the tag in' },
        name: { type: 'string', description: 'Tag name (e.g., "Urgent", "Bug", "Feature Request")' },
        color: {
          type: 'string',
          description: 'Tag color in Asana UI',
          enum: ['dark-pink', 'dark-green', 'dark-blue', 'dark-red', 'dark-teal', 'dark-brown', 'dark-orange', 'dark-purple', 'dark-warm-gray', 'light-pink', 'light-green', 'light-blue', 'light-red', 'light-teal', 'light-brown', 'light-orange', 'light-purple', 'light-warm-gray', 'none']
        },
        notes: { type: 'string', description: 'Plain text description of when to use this tag (no rich text/HTML support)' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => await client.post('/tags', args)
  },
  {
    name: 'get_tag',
    description: 'Get detailed information about a tag by GID. Returns the tag name, color, notes (plain text only), creation date, and follower list. Tags are workspace-scoped — any workspace member can view any tag. Related: update_tag to modify, delete_tag to remove, list_tag_tasks to see all tasks with this tag, list_workspace_tags to browse all tags.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        tag_gid: { type: 'string', description: 'The globally unique identifier for the tag' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "name,color,notes,created_at,followers,followers.name"' }
      },
      required: ['tag_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/tags/${args.tag_gid}`, params);
    }
  },
  {
    name: 'update_tag',
    description: 'Update a tag\'s name, color, or notes. Only provided fields are changed — omitted fields remain unchanged. Any workspace member can update any tag (no tag-level permissions). Color options (18 + none): "dark-pink", "dark-green", "dark-blue", "dark-red", "dark-teal", "dark-brown", "dark-orange", "dark-purple", "dark-warm-gray", "light-pink", "light-green", "light-blue", "light-red", "light-teal", "light-brown", "light-orange", "light-purple", "light-warm-gray", "none". Related: get_tag to see current values, delete_tag to remove entirely.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        tag_gid: { type: 'string', description: 'The globally unique identifier for the tag to update' },
        name: { type: 'string', description: 'New tag name' },
        color: {
          type: 'string',
          description: 'New tag color',
          enum: ['dark-pink', 'dark-green', 'dark-blue', 'dark-red', 'dark-teal', 'dark-brown', 'dark-orange', 'dark-purple', 'dark-warm-gray', 'light-pink', 'light-green', 'light-blue', 'light-red', 'light-teal', 'light-brown', 'light-orange', 'light-purple', 'light-warm-gray', 'none']
        },
        notes: { type: 'string', description: 'New plain text description for the tag' }
      },
      required: ['tag_gid']
    },
    handler: async (args) => {
      const { tag_gid, ...data } = args;
      return await client.put(`/tags/${tag_gid}`, data);
    }
  },
  {
    name: 'delete_tag',
    description: 'Permanently delete a tag from the workspace. The tag is removed from ALL tasks that had it applied across every project in the workspace. This action cannot be undone. Any workspace member can delete any tag (no tag-level permissions). Related: get_tag to verify before deleting, update_tag if you just want to rename, list_tag_tasks to see affected tasks.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        tag_gid: { type: 'string', description: 'The globally unique identifier for the tag to permanently delete' }
      },
      required: ['tag_gid']
    },
    handler: async (args) => await client.delete(`/tags/${args.tag_gid}`)
  },
  {
    name: 'get_task_tags',
    description: 'List all tags applied to a specific task. Returns tag names, colors, and GIDs. Use this to check existing tags before adding new ones (to avoid duplicates) or to audit task categorization. Tags are workspace-scoped, so the same tag can appear on tasks across multiple projects. Related: add_task_tag to apply a tag, remove_task_tag to remove, list_workspace_tags to find available tags.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'The task GID to list tags for' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "name,color,notes"' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, ...params } = args;
      if (!params.limit) params.limit = 20;
      return await client.get(`/tasks/${task_gid}/tags`, params);
    }
  },
  {
    name: 'list_tag_tasks',
    description: 'List all tasks that have a specific tag applied. Returns tasks across all projects in the workspace that carry this tag, making it useful for cross-project reporting, finding all items with a given label, or auditing tag usage. Returns paginated results (default 20, max 100). Related: get_tag for tag details, add_task_tag to apply the tag to more tasks, remove_task_tag to remove from tasks.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        tag_gid: { type: 'string', description: 'The tag GID to list tasks for' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "name,completed,assignee.name,due_on,projects.name"' }
      },
      required: ['tag_gid']
    },
    handler: async (args) => {
      const { tag_gid, ...params } = args;
      if (!params.limit) params.limit = 20;
      return await client.get(`/tags/${tag_gid}/tasks`, params);
    }
  }
];
