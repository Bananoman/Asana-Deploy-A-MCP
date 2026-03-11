/**
 * Stories (Comments & Activity) Tools
 *
 * Stories represent activity on a task. There are two types:
 * - User-generated: Comments posted by users (can be created, edited, deleted)
 * - System-generated: Automatic records of changes (assignee changes, completion, etc.) — read-only
 *
 * Rich text comments support HTML formatting and @mentions via data-asana-gid attributes.
 * text and html_text are mutually exclusive — provide one or the other, not both.
 *
 * Key constraints:
 * - Only user-created stories (comments) can be edited or deleted
 * - System-generated stories are immutable and cannot be deleted
 * - html_text must be wrapped in <body> tags
 * - Comments over ~32KB may be truncated
 * - Deprecated fields: hearted/hearts/num_hearts — use liked/likes/num_likes instead
 *
 * @module stories
 */
module.exports = (client) => [
  {
    name: 'get_task_stories',
    description: 'List all stories (comments and system activity) on a task, ordered chronologically. Stories include user comments (type: "comment") and system-generated updates like assignee changes, completion, due date changes, etc. (type: "system"). Returns max 100 per page. Use opt_fields="text,created_by.name,created_at,type,resource_subtype" for a useful default. NOTE: Deprecated fields hearted/hearts/num_hearts — use liked/likes/num_likes instead. Related: add_task_comment to post a comment, get_story for a single story.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to get stories for' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "text,created_by.name,created_at,type,resource_subtype"' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, ...params } = args;
      return await client.get(`/tasks/${task_gid}/stories`, params);
    }
  },
  {
    name: 'add_task_comment',
    description: 'Add a comment to a task. All task followers will be notified via inbox. Supports plain text (text) or rich HTML (html_text) — these are mutually exclusive, provide only one. For rich HTML: wrap in <body> tags, supported tags: strong, em, u, code, ol, ul, li, a, blockquote. For @mentions: use <a data-asana-gid="USER_GID" data-asana-type="user"/> in html_text. Comments can be pinned to the top of the task activity feed. Related: get_task_stories to see existing comments, update_story to edit, create_task_reaction to add emoji reaction.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to comment on' },
        text: { type: 'string', description: 'Plain text comment' },
        html_text: { type: 'string', description: 'Rich HTML comment. Wrap in <body> tags. Supports <strong>, <em>, <u>, <code>, <ol>, <ul>, <a>, <blockquote>. Use <a data-asana-gid="USER_GID" data-asana-type="user"/> for @mentions. Overrides text if both provided.' },
        is_pinned: { type: 'boolean', description: 'Pin this comment to the top of the task' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, opt_fields, ...data } = args;
      if (!data.text && !data.html_text) throw new Error('Either text or html_text is required');
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post(`/tasks/${task_gid}/stories`, data, { params });
    }
  },
  {
    name: 'get_story',
    description: 'Get details of a specific story/comment by its GID. Returns the story content, author, timestamps, type (comment vs system), pin status, and engagement data (likes). System stories include context-specific fields: old_name/new_name for renames, old_dates/new_dates for date changes, old_section/new_section for moves. Related: update_story to edit, delete_story to remove, get_task_stories for all stories on a task.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        story_gid: { type: 'string', description: 'Story GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "text,html_text,created_by.name,type,is_pinned"' }
      },
      required: ['story_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/stories/${args.story_gid}`, params);
    }
  },
  {
    name: 'update_story',
    description: 'Update a comment/story text or pin status. IMPORTANT: Only user-created comments can be edited — system-generated stories are immutable and will return an error. Supports both plain text (text) and rich HTML (html_text). The story will show an "edited" indicator after modification. Related: get_story to check current content, delete_story to remove instead.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        story_gid: { type: 'string', description: 'Story GID to update' },
        text: { type: 'string', description: 'New plain text content' },
        html_text: { type: 'string', description: 'New rich HTML content (overrides text)' },
        is_pinned: { type: 'boolean', description: 'Pin/unpin this comment' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['story_gid']
    },
    handler: async (args) => {
      const { story_gid, opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.put(`/stories/${story_gid}`, data, { params });
    }
  },
  {
    name: 'delete_story',
    description: 'Permanently delete a comment/story. DESTRUCTIVE: Cannot be undone. Only user-created comments can be deleted — attempting to delete system-generated stories returns an error. Related: update_story to edit instead of deleting.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        story_gid: { type: 'string', description: 'Story GID to permanently delete' }
      },
      required: ['story_gid']
    },
    handler: async (args) => await client.delete(`/stories/${args.story_gid}`)
  }
];
