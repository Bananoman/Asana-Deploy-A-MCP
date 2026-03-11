/**
 * User Task Lists ("My Tasks") Tools
 *
 * A user task list represents the "My Tasks" view for a user in a specific workspace.
 * Each user has exactly one task list per workspace. Tasks here are organized into
 * sections: Recently Assigned, Today, and Upcoming (configurable by the user).
 *
 * Key constraints:
 * - User task lists are read-only containers — cannot be created or deleted via API
 * - To find a user's task list GID, use get_user_task_list_for_user with user GID + workspace GID
 * - The "me" shorthand works for user_gid to reference the authenticated user
 *
 * @module user-task-lists
 */
module.exports = (client) => [
  {
    name: 'get_user_task_list',
    description: 'Get a user task list ("My Tasks") by its GID. Returns the list metadata including owner and workspace. Each user has exactly one task list per workspace — this is a read-only container that cannot be created or deleted. To find the GID, use get_user_task_list_for_user. Related: list_user_task_list_tasks to see the actual tasks.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        user_task_list_gid: { type: 'string', description: 'User task list GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,owner.name,workspace.name"' }
      },
      required: ['user_task_list_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/user_task_lists/${args.user_task_list_gid}`, params);
    }
  },
  {
    name: 'get_user_task_list_for_user',
    description: 'Find the "My Tasks" list GID for a specific user in a workspace. Every user has exactly one task list per workspace. Use "me" as user_gid for the authenticated user. This is typically the first step: get the list GID here, then use list_user_task_list_tasks to retrieve the tasks. Related: get_user_task_list for list details, list_user_task_list_tasks to get tasks.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        user_gid: { type: 'string', description: 'User GID or "me" for current user' },
        workspace: { type: 'string', description: 'Workspace GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include' }
      },
      required: ['user_gid', 'workspace']
    },
    handler: async (args) => {
      const params = { workspace: args.workspace };
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/users/${args.user_gid}/user_task_list`, params);
    }
  },
  {
    name: 'list_user_task_list_tasks',
    description: 'List tasks in a user task list ("My Tasks"). Returns tasks assigned to the user in that workspace. Use completed_since="now" to show only incomplete tasks (common use case). Returns max 100 per page. Tip: Use opt_fields="name,assignee_section.name,due_on,completed" to get section organization (Recently Assigned, Today, Upcoming). Related: get_user_task_list_for_user to find the list GID first.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        user_task_list_gid: { type: 'string', description: 'User task list GID' },
        completed_since: { type: 'string', description: 'ISO 8601 date or "now" to filter only incomplete tasks' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,assignee,due_on,completed,assignee_section.name"' }
      },
      required: ['user_task_list_gid']
    },
    handler: async (args) => {
      const { user_task_list_gid, ...params } = args;
      return await client.get(`/user_task_lists/${user_task_list_gid}/tasks`, params);
    }
  }
];
