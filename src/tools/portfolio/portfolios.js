/** Portfolio Tools - Complete CRUD + Management */
module.exports = (client) => [
  {
    name: 'list_portfolios',
    description: 'List portfolios in workspace',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' }
      },
      required: ['workspace']
    },
    handler: async (args) => await client.get('/portfolios', { workspace: args.workspace })
  },
  {
    name: 'get_portfolio',
    description: 'Get portfolio details',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => await client.get(`/portfolios/${args.portfolio_gid}`)
  },
  {
    name: 'create_portfolio',
    description: 'Create a new portfolio',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: { type: 'string', description: 'Workspace GID' },
        name: { type: 'string', description: 'Portfolio name' },
        color: { type: 'string', description: 'Portfolio color' }
      },
      required: ['workspace', 'name']
    },
    handler: async (args) => await client.post('/portfolios', args)
  },
  {
    name: 'update_portfolio',
    description: 'Update a portfolio',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        name: { type: 'string', description: 'New portfolio name' },
        color: { type: 'string', description: 'New portfolio color' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => {
      const { portfolio_gid, ...data } = args;
      return await client.put(`/portfolios/${portfolio_gid}`, data);
    }
  },
  {
    name: 'delete_portfolio',
    description: 'Delete a portfolio',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' }
      },
      required: ['portfolio_gid']
    },
    handler: async (args) => await client.delete(`/portfolios/${args.portfolio_gid}`)
  },
  {
    name: 'add_item_to_portfolio',
    description: 'Add an item (project) to a portfolio',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        item: { type: 'string', description: 'Project GID to add' }
      },
      required: ['portfolio_gid', 'item']
    },
    handler: async (args) => {
      const { portfolio_gid, item } = args;
      return await client.post(`/portfolios/${portfolio_gid}/addItem`, { item });
    }
  },
  {
    name: 'remove_item_from_portfolio',
    description: 'Remove an item (project) from a portfolio',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        item: { type: 'string', description: 'Project GID to remove' }
      },
      required: ['portfolio_gid', 'item']
    },
    handler: async (args) => {
      const { portfolio_gid, item } = args;
      return await client.post(`/portfolios/${portfolio_gid}/removeItem`, { item });
    }
  },
  {
    name: 'add_members_to_portfolio',
    description: 'Add members to a portfolio',
    inputSchema: {
      type: 'object',
      properties: {
        portfolio_gid: { type: 'string', description: 'Portfolio GID' },
        members: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of user GIDs'
        }
      },
      required: ['portfolio_gid', 'members']
    },
    handler: async (args) => {
      const { portfolio_gid, members } = args;
      return await client.post(`/portfolios/${portfolio_gid}/addMembers`, { members });
    }
  }
];
