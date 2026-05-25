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
    description: 'Mark other tasks as blocked-by this task (downstream tasks waiting on this one) — use for "make tasks 200 and 250 depend on task 100", reverse direction of add_task_dependencies. Direct action — pass task and dependent GIDs; do NOT call get_task first. Max 30 combined dependencies + dependents per task. Cross-project allowed. Circular deps rejected. Approval tasks have known bugs. Related: add_task_dependencies (this task is blocked by others), remove_task_dependents.',
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
    description: 'Apply a tag / label to a task — use for "tag task X as urgent", "label this as blocker", workspace-wide categorization. Direct action — pass task and tag by GID; do NOT call get_task or list_workspace_tags first. Tag must already exist (use create_tag first if needed). Tags are workspace-scoped (cross-project). Idempotent — adding an existing tag is a no-op. Related: remove_task_tag, bulk_add_task_tags (many tasks), create_tag (new tag), get_task_tags.',
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
    description: 'Subscribe people to notifications on a task — use for "add Carlos as follower on task 3001", "subscribe stakeholders to this task", broadcasting visibility. Direct action — pass task and users by GID; do NOT call get_task or get_current_user first. Followers get inbox notifications on comments, completion, assignee/due-date changes. Users must have access to the task workspace. Idempotent — re-adding is a no-op. Related: remove_task_followers, bulk_add_task_followers (many tasks), add_task_comment (post + notify).',
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
