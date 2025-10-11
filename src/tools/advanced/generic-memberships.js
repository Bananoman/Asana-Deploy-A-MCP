/** Generic Memberships Tools */
module.exports = (client) => [
  {
    name: 'get_membership',
    description: 'Get a membership (works for any membership type)',
    inputSchema: {
      type: 'object',
      properties: {
        membership_gid: { type: 'string', description: 'Membership GID' }
      },
      required: ['membership_gid']
    },
    handler: async (args) => await client.get(`/memberships/${args.membership_gid}`)
  },
  {
    name: 'create_membership',
    description: 'Create a membership',
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent resource GID (project, portfolio, etc.)' },
        member: { type: 'string', description: 'Member user GID' }
      },
      required: ['parent', 'member']
    },
    handler: async (args) => await client.post('/memberships', args)
  },
  {
    name: 'delete_membership',
    description: 'Delete a membership',
    inputSchema: {
      type: 'object',
      properties: {
        membership_gid: { type: 'string', description: 'Membership GID' }
      },
      required: ['membership_gid']
    },
    handler: async (args) => await client.delete(`/memberships/${args.membership_gid}`)
  },
  {
    name: 'list_memberships',
    description: 'List memberships for a parent resource',
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent resource GID' }
      },
      required: ['parent']
    },
    handler: async (args) => await client.get('/memberships', { parent: args.parent })
  },
  {
    name: 'update_membership',
    description: 'Update a membership',
    inputSchema: {
      type: 'object',
      properties: {
        membership_gid: { type: 'string', description: 'Membership GID' },
        role: { type: 'string', description: 'New role for the member' }
      },
      required: ['membership_gid']
    },
    handler: async (args) => {
      const { membership_gid, ...data } = args;
      return await client.put(`/memberships/${membership_gid}`, data);
    }
  }
];
