/** Additional Project Operations - Followers, Custom Fields, Members */
module.exports = (client) => [
  {
    name: 'add_project_custom_field_setting',
    description: 'Add a custom field to a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        custom_field: { type: 'string', description: 'Custom field GID' },
        is_important: { type: 'boolean', description: 'Is this field important' }
      },
      required: ['project_gid', 'custom_field']
    },
    handler: async (args) => {
      const { project_gid, custom_field, is_important } = args;
      return await client.post(`/projects/${project_gid}/addCustomFieldSetting`, {
        custom_field,
        is_important
      });
    }
  },
  {
    name: 'remove_project_custom_field_setting',
    description: 'Remove a custom field from a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        custom_field: { type: 'string', description: 'Custom field GID' }
      },
      required: ['project_gid', 'custom_field']
    },
    handler: async (args) => {
      const { project_gid, custom_field } = args;
      return await client.post(`/projects/${project_gid}/removeCustomFieldSetting`, {
        custom_field
      });
    }
  },
  {
    name: 'add_project_followers',
    description: 'Add followers to a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to add as followers'
        }
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
    description: 'Remove followers from a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to remove as followers'
        }
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
    description: 'Add members to a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' },
        members: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs to add as members'
        }
      },
      required: ['project_gid', 'members']
    },
    handler: async (args) => {
      const { project_gid, members } = args;
      return await client.post(`/projects/${project_gid}/addMembers`, { members });
    }
  },
  {
    name: 'list_project_tasks',
    description: 'Get tasks for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_gid: { type: 'string', description: 'Project GID' }
      },
      required: ['project_gid']
    },
    handler: async (args) => await client.get(`/projects/${args.project_gid}/tasks`)
  }
];
