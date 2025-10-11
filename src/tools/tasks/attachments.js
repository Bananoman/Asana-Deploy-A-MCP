/** Attachments Tools */
module.exports = (client) => [
  {
    name: 'get_attachment',
    description: 'Get attachment details',
    inputSchema: {
      type: 'object',
      properties: {
        attachment_gid: { type: 'string', description: 'Attachment GID' }
      },
      required: ['attachment_gid']
    },
    handler: async (args) => await client.get(`/attachments/${args.attachment_gid}`)
  },
  {
    name: 'delete_attachment',
    description: 'Delete an attachment',
    inputSchema: {
      type: 'object',
      properties: {
        attachment_gid: { type: 'string', description: 'Attachment GID' }
      },
      required: ['attachment_gid']
    },
    handler: async (args) => await client.delete(`/attachments/${args.attachment_gid}`)
  },
  {
    name: 'list_task_attachments',
    description: 'Get attachments on a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' }
      },
      required: ['task_gid']
    },
    handler: async (args) => await client.get(`/tasks/${args.task_gid}/attachments`)
  },
  {
    name: 'upload_attachment',
    description: 'Upload an attachment to a task',
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        file: { type: 'string', description: 'File path or URL' },
        name: { type: 'string', description: 'Attachment name' }
      },
      required: ['task_gid', 'file']
    },
    handler: async (args) => {
      const { task_gid, file, name } = args;
      return await client.post(`/tasks/${task_gid}/attachments`, {
        file,
        name: name || file
      });
    }
  },
  {
    name: 'list_attachments',
    description: 'Get attachments for a parent object',
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent object GID' }
      },
      required: ['parent']
    },
    handler: async (args) => await client.get('/attachments', { parent: args.parent })
  }
];
