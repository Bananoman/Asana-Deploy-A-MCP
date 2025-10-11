/** Goal Relationships Tools */
module.exports = (client) => [
  {
    name: 'get_goal_relationship',
    description: 'Get a goal relationship',
    inputSchema: {
      type: 'object',
      properties: {
        goal_relationship_gid: { type: 'string', description: 'Goal relationship GID' }
      },
      required: ['goal_relationship_gid']
    },
    handler: async (args) => await client.get(`/goal_relationships/${args.goal_relationship_gid}`)
  },
  {
    name: 'update_goal_relationship',
    description: 'Update a goal relationship',
    inputSchema: {
      type: 'object',
      properties: {
        goal_relationship_gid: { type: 'string', description: 'Goal relationship GID' },
        contribution_weight: { type: 'number', description: 'Contribution weight' }
      },
      required: ['goal_relationship_gid']
    },
    handler: async (args) => {
      const { goal_relationship_gid, ...data } = args;
      return await client.put(`/goal_relationships/${goal_relationship_gid}`, data);
    }
  },
  {
    name: 'list_goal_relationships',
    description: 'Get goal relationships for a goal',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' }
      },
      required: ['goal_gid']
    },
    handler: async (args) => await client.get(`/goals/${args.goal_gid}/goal_relationships`)
  },
  {
    name: 'create_goal_relationship',
    description: 'Create a goal relationship',
    inputSchema: {
      type: 'object',
      properties: {
        goal_gid: { type: 'string', description: 'Goal GID' },
        supporting_resource: { type: 'string', description: 'Supporting resource GID' },
        contribution_weight: { type: 'number', description: 'Contribution weight' }
      },
      required: ['goal_gid', 'supporting_resource']
    },
    handler: async (args) => {
      const { goal_gid, ...data } = args;
      return await client.post(`/goals/${goal_gid}/goal_relationships`, data);
    }
  }
];
