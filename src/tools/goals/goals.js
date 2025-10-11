/** Goal Tools - Complete CRUD + Relationships */
module.exports = (client) => [
  {
    name: 'list_goals',
    description: 'List goals in workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' }
      },
      required: ['workspace']
    },
    handler: async (args) => await client.get('/goals', { workspace: args.workspace })
  },
  {
    name: 'get_goal',
    description: 'Get goal details',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => await client.get(`/goals/${args.goal_gid}`)
  },
  {
    name: 'create_goal',
    description: 'Create a new goal',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        name: { type: 'string', description: 'Goal name' },
        notes: { type: 'string', description: 'Goal notes' },
        time_period: { type: 'string', description: 'Time period GID' },
        team: { type: 'string', description: 'Team GID' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => await client.post('/goals', args)
  },
  {
    name: 'update_goal',
    description: 'Update a goal',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        name: { type: 'string', description: 'New goal name' },
        notes: { type: 'string', description: 'New goal notes' },
        status: { type: 'string', description: 'Goal status' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => {
      const { goal_gid, ...data } = args;
      return await client.put(`/goals/${goal_gid}`, data);
    }
  },
  {
    name: 'delete_goal',
    description: 'Delete a goal',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => await client.delete(`/goals/${args.goal_gid}`)
  },
  {
    name: 'add_goal_followers',
    description: 'Add followers to a goal',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs'
        }
      },
      required: ['goal_gid', 'followers']
    },
    handler: async (args) => {
      const { goal_gid, followers } = args;
      return await client.post(`/goals/${goal_gid}/addFollowers`, { followers });
    }
  },
  {
    name: 'remove_goal_followers',
    description: 'Remove followers from a goal',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        followers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs'
        }
      },
      required: ['goal_gid', 'followers']
    },
    handler: async (args) => {
      const { goal_gid, followers } = args;
      return await client.post(`/goals/${goal_gid}/removeFollowers`, { followers });
    }
  },
  {
    name: 'add_supporting_goal_relationship',
    description: 'Add a supporting relationship to a goal',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        supporting_resource: { type: 'string', description: 'Supporting goal GID' }
      },
      required: ['goal_gid', 'supporting_resource']
    },
    handler: async (args) => {
      const { goal_gid, supporting_resource } = args;
      return await client.post(`/goals/${goal_gid}/addSupportingRelationship`, {
        supporting_resource
      });
    }
  },
  {
    name: 'remove_supporting_goal_relationship',
    description: 'Remove a supporting relationship from a goal',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        supporting_resource: { type: 'string', description: 'Supporting goal GID' }
      },
      required: ['goal_gid', 'supporting_resource']
    },
    handler: async (args) => {
      const { goal_gid, supporting_resource } = args;
      return await client.post(`/goals/${goal_gid}/removeSupportingRelationship`, {
        supporting_resource
      });
    }
  },
  {
    name: 'get_parent_goals',
    description: 'Get parent goals of a goal',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => await client.get(`/goals/${args.goal_gid}/parentGoals`)
  }
];
