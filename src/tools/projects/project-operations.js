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
const { coerceStringArray } = require('../../core/coerce');

module.exports = (client) => [
  {
    name: 'add_project_custom_field_setting',
    description: 'Attach an existing custom field to a project (makes the field available on all tasks in that project) — use for "add my custom field Effort points to project Backlog 2026", exposing workspace fields on a specific project, configuring sprint metrics per project. Direct action — pass project and custom_field by GID; do NOT call list_custom_fields or workspace_typeahead first. Field must already exist in the workspace (use create_custom_field or create_enum_custom_field first). Set is_important=true to show prominently in task list view. Idempotent — re-adding is a no-op. Premium feature. Related: remove_project_custom_field_setting, list_project_custom_field_settings, set_custom_field_value (set on a task).',
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
    description: 'Subscribe people to notifications on a project — use for "follow project X for status updates", "subscribe stakeholders to milestone alerts". Direct action — pass project and users by GID; do NOT call get_project or list_users first. Followers get inbox notifications on status updates, milestones, comments. Different from members: followers get notifications, members get edit access. Idempotent — re-adding is a no-op. Related: remove_project_followers, add_project_members (edit access), create_status_update.',
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
    description: 'Give people edit access to a project — use for "add Ricardo and María as members of project 1234", onboarding teammates to a project, granting collaborators full task CRUD. Direct action — pass project and users by GID; do NOT call get_project, list_users, or get_current_user first. Members can create/edit/delete tasks; auto-added as followers too. Different from followers (notifications-only). Access level depends on project default_access_level. Related: remove_project_members, add_project_followers (notification-only), bulk_add_project_members (many projects).',
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
      const { project_gid } = args;
      const members = coerceStringArray(args.members);
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
      const { project_gid } = args;
      const members = coerceStringArray(args.members);
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
