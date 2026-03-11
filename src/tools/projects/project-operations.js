/**
 * Project Operations - Custom Fields, Followers, Members, Task Listing
 *
 * Operations for managing project relationships: adding/removing custom fields,
 * managing follower and member lists, and listing project tasks.
 *
 * Key distinctions:
 * - Members have edit access to the project and its tasks
 * - Followers receive notifications but may not have edit access
 * - Custom fields must exist before being added to a project (use create_custom_field first)
 * - Premium plan required for custom fields
 *
 * @module project-operations
 */
module.exports = (client) => [
  {
    name: 'add_project_custom_field_setting',
    description: 'Add a custom field to a project, making it available on all tasks in that project. Set is_important=true to display the field prominently in task list view. The custom field must already exist in the workspace — use create_custom_field first. Premium feature. Adding a field already on the project is a no-op. Related: remove_project_custom_field_setting, list_project_custom_field_settings, create_custom_field.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        custom_field: { type: 'string', description: 'Custom field GID to add' },
        is_important: { type: 'boolean', description: 'Show field in task list view (default: false). Important fields are visible without expanding task details.' }
      },
      required: ['project_gid', 'custom_field']
    },
    handler: async (args) => {
      const { project_gid, custom_field, is_important } = args;
      return await client.post(`/projects/${project_gid}/addCustomFieldSetting`, { custom_field, is_important });
    }
  },
  {
    name: 'remove_project_custom_field_setting',
    description: 'Remove a custom field from a project. The field is no longer visible in the project, but tasks retain their custom field values — re-adding the field later restores the values. The field itself is not deleted from the workspace. Related: add_project_custom_field_setting, list_project_custom_field_settings.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        custom_field: { type: 'string', description: 'Custom field GID to remove' }
      },
      required: ['project_gid', 'custom_field']
    },
    handler: async (args) => {
      const { project_gid, custom_field } = args;
      return await client.post(`/projects/${project_gid}/removeCustomFieldSetting`, { custom_field });
    }
  },
  {
    name: 'add_project_followers',
    description: 'Add followers to a project. Followers receive inbox notifications about project status updates, milestones, and comments. Followers are different from members: followers get notifications but do not necessarily have edit access. Adding a user who is already a follower is a no-op. Related: remove_project_followers, add_project_members for edit access.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        followers: { type: 'array', items: { type: 'string' }, description: 'Array of user GIDs to add as followers' }
      },
      required: ['project_gid', 'followers']
    },
    handler: async (args) => {
      const { project_gid, followers } = args;
      return await client.post(`/projects/${project_gid}/addFollowers`, { followers });
    }
  },
  {
    name: 'remove_project_followers',
    description: 'Remove followers from a project. Removed followers stop receiving project notifications. Does not affect their member status or edit access. Related: add_project_followers, remove_project_members.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        followers: { type: 'array', items: { type: 'string' }, description: 'Array of user GIDs to remove' }
      },
      required: ['project_gid', 'followers']
    },
    handler: async (args) => {
      const { project_gid, followers } = args;
      return await client.post(`/projects/${project_gid}/removeFollowers`, { followers });
    }
  },
  {
    name: 'add_project_members',
    description: 'Add members to a project with edit access. Members can create, edit, and delete tasks in the project. Members are automatically added as followers too. Different from followers — members have full edit access while followers only receive notifications. The access level granted depends on the project default_access_level setting. Related: remove_project_members, add_project_followers for notification-only access, list_project_memberships.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        members: { type: 'array', items: { type: 'string' }, description: 'Array of user GIDs to add as members' }
      },
      required: ['project_gid', 'members']
    },
    handler: async (args) => {
      const { project_gid, members } = args;
      return await client.post(`/projects/${project_gid}/addMembers`, { members });
    }
  },
  {
    name: 'remove_project_members',
    description: 'Remove members from a project. Removed members lose edit access but may retain visibility if the project is public to workspace. The project owner cannot be removed as a member. Related: add_project_members, list_project_memberships.',
    annotations: { idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        members: { type: 'array', items: { type: 'string' }, description: 'Array of user GIDs to remove as members' }
      },
      required: ['project_gid', 'members']
    },
    handler: async (args) => {
      const { project_gid, members } = args;
      return await client.post(`/projects/${project_gid}/removeMembers`, { members });
    }
  },
  {
    name: 'list_project_tasks',
    description: 'List all tasks in a project, ordered by their position in the project (not by due date). Returns paginated results (max 100/page). Without pagination, results truncate at ~1000 tasks. For filtered or sorted results, use search_tasks instead. For tasks in a specific section, use list_tasks with section filter. Related: get_task for full task details, search_tasks for advanced filtering, list_tasks with section filter.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,assignee.name,due_on,completed,custom_fields"' }
      },
      required: ['project_gid']
    },
    handler: async (args) => {
      const { project_gid, ...params } = args;
      return await client.get(`/projects/${project_gid}/tasks`, params);
    }
  },
];
