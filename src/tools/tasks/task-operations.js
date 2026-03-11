/**
 * Task Operations - Dependents, Parent, Tags, Followers
 *
 * Additional operations on tasks that manage relationships and metadata.
 * These tools handle task-to-task relationships (dependents), parent-child hierarchy,
 * tag assignment, and follower management.
 *
 * Key constraints:
 * - Max 30 combined dependencies + dependents per task
 * - Max 5 levels of subtask nesting
 * - Tags are workspace-scoped; must exist before adding to a task
 * - Followers receive notifications on task changes
 *
 * @module task-operations
 */
module.exports = (client) => [
  {
    name: 'get_task_dependents',
    description: 'List tasks that depend on this task (tasks blocked by this one — they cannot start until this task completes). A task can have at most 30 combined dependencies + dependents. Returns max 100 per page. Related: add_task_dependents to add blocked tasks, get_task_dependencies for the reverse direction (what blocks this task).',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to get dependents for' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,assignee.name,completed"' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, ...params } = args;
      return await client.get(`/tasks/${task_gid}/dependents`, params);
    }
  },
  {
    name: 'add_task_dependents',
    description: 'Add tasks as dependents of this task (those tasks will be blocked until this task is completed). Max 30 combined dependencies + dependents per task. Dependencies can cross projects. Circular dependencies are rejected by the API. NOTE: Approval tasks have known bugs with dependency resolution. Related: remove_task_dependents, add_task_dependencies for reverse direction.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'The blocking task GID' },
        dependents: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs that will be blocked by this task'
        }
      },
      required: ['task_gid', 'dependents']
    },
    handler: async (args) => {
      const { task_gid, dependents } = args;
      return await client.post(`/tasks/${task_gid}/addDependents`, { dependents });
    }
  },
  {
    name: 'remove_task_dependents',
    description: 'Remove dependent relationships from this task. The dependent tasks are not deleted, only unlinked — they will no longer be blocked by this task. Related: add_task_dependents, get_task_dependents.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        dependents: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of task GIDs to remove as dependents'
        }
      },
      required: ['task_gid', 'dependents']
    },
    handler: async (args) => {
      const { task_gid, dependents } = args;
      return await client.post(`/tasks/${task_gid}/removeDependents`, { dependents });
    }
  },
  {
    name: 'set_task_parent',
    description: 'Set or change the parent of a task, making it a subtask. Pass parent as null to promote it to a top-level task. CONSTRAINTS: Max nesting depth is 5 levels — setting a parent that would exceed this fails. Subtasks do NOT inherit the parent project automatically; use add_task_to_project if needed. Use insert_before/insert_after to control position among sibling subtasks. Related: create_subtask for creating new subtasks, get_task_subtasks to list children.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID to reparent' },
        parent: { type: 'string', description: 'New parent task GID, or null to make top-level' },
        insert_before: { type: 'string', description: 'Sibling subtask GID to insert before' },
        insert_after: { type: 'string', description: 'Sibling subtask GID to insert after' }
      },
      required: ['task_gid', 'parent']
    },
    handler: async (args) => {
      const { task_gid, ...data } = args;
      return await client.post(`/tasks/${task_gid}/setParent`, data);
    }
  },
  {
    name: 'add_task_tag',
    description: 'Add a tag to a task. Tags provide cross-project categorization and are workspace-scoped. The tag must already exist — use create_tag first if needed. Adding a tag that is already on the task is a no-op (no error). Related: remove_task_tag, get_task_tags, create_tag, list_workspace_tags to find existing tags.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        tag: { type: 'string', description: 'Tag GID to add' }
      },
      required: ['task_gid', 'tag']
    },
    handler: async (args) => {
      const { task_gid, tag } = args;
      return await client.post(`/tasks/${task_gid}/addTag`, { tag });
    }
  },
  {
    name: 'remove_task_tag',
    description: 'Remove a tag from a task. The tag itself is not deleted from the workspace, only removed from this task. Removing a tag not on the task is a no-op (no error). Related: add_task_tag, get_task_tags, delete_tag to remove tag from workspace.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        tag: { type: 'string', description: 'Tag GID to remove' }
      },
      required: ['task_gid', 'tag']
    },
    handler: async (args) => {
      const { task_gid, tag } = args;
      return await client.post(`/tasks/${task_gid}/removeTag`, { tag });
    }
  },
  {
    name: 'add_task_followers',
    description: 'Add followers to a task. Followers receive inbox notifications about task changes (comments, completion, assignee changes, due date changes, etc.). Adding a user who is already a follower is a no-op. Users can only be added as followers if they have access to the task workspace. Related: remove_task_followers, add_task_comment to post a comment that notifies followers.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to add as followers'
        }
      },
      required: ['task_gid', 'followers']
    },
    handler: async (args) => {
      const { task_gid, followers } = args;
      return await client.post(`/tasks/${task_gid}/addFollowers`, { followers });
    }
  },
  {
    name: 'remove_task_followers',
    description: 'Remove followers from a task. Removed followers will stop receiving notifications for this task. The task assignee cannot be removed as a follower. Related: add_task_followers.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to remove as followers'
        }
      },
      required: ['task_gid', 'followers']
    },
    handler: async (args) => {
      const { task_gid, followers } = args;
      return await client.post(`/tasks/${task_gid}/removeFollowers`, { followers });
    }
  }
];
