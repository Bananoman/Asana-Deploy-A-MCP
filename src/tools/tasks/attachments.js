/**
 * Attachment Tools - File and URL management on tasks
 *
 * Attachments can be Asana-hosted file uploads or references to external services
 * (Google Drive, Dropbox, OneDrive, Box, Vimeo, or generic external URLs).
 *
 * Key constraints:
 * - Max file size: 100 MB (practical limit ~30 MB due to nginx)
 * - download_url is TEMPORARY (~2 minutes for Asana-hosted) — do not persist, refresh on demand
 * - Box-hosted and Vimeo attachments return null download_url
 * - Attachment uploads CANNOT be performed via the Batch API
 * - Non-ASCII filenames must be URL-encoded
 * - Attachments cannot be updated — delete and re-upload to modify
 *
 * @module attachments
 */
module.exports = (client) => [
  {
    name: 'get_attachment',
    description: 'Get details of a single attachment by GID. Returns name, host service (asana, gdrive, dropbox, onedrive, box, vimeo, external), download URL, size, and parent resource. IMPORTANT: download_url is temporary (~2 minutes for Asana-hosted files) — do not store it, fetch fresh each time. Box and Vimeo attachments return null download_url; use view_url instead. Related: list_task_attachments to find attachments, upload_attachment, delete_attachment.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        attachment_gid: { type: 'string', description: 'Attachment GID' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,download_url,host,size,created_at,parent"' }
      },
      required: ['attachment_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/attachments/${args.attachment_gid}`, params);
    }
  },
  {
    name: 'delete_attachment',
    description: 'Permanently delete an attachment reference from Asana. DESTRUCTIVE: Cannot be undone. For Asana-hosted files, the file is permanently deleted. For external service references (Google Drive, Dropbox, etc.), only the Asana link is removed — the actual file in the external service is not affected. Related: get_attachment, upload_attachment.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        attachment_gid: { type: 'string', description: 'Attachment GID to permanently delete' }
      },
      required: ['attachment_gid']
    },
    handler: async (args) => await client.delete(`/attachments/${args.attachment_gid}`)
  },
  {
    name: 'list_task_attachments',
    description: 'List all attachments on a task, including inline images embedded in the task description. Returns attachment metadata (name, type, host service). Does NOT include download URLs — use get_attachment on individual items for full details including temporary download_url. Returns max 100 per page. Related: upload_attachment to add files, get_attachment for full details.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        task_gid: { type: 'string', description: 'Task GID' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,host,created_at,size"' }
      },
      required: ['task_gid']
    },
    handler: async (args) => {
      const { task_gid, ...params } = args;
      return await client.get(`/tasks/${task_gid}/attachments`, params);
    }
  },
  {
    name: 'upload_attachment',
    description: 'Attach a file or external URL to a task. For external URLs, provide resource_url and set resource_subtype to "external". For file uploads, provide file path. CONSTRAINTS: Max file size 100 MB (practical ~30 MB). Non-ASCII filenames must be URL-encoded. Attachment uploads CANNOT be performed via the Batch API — use this tool directly. Related: list_task_attachments to see existing, get_attachment for details, attach_external_data for structured external references.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Task GID to attach to (required)' },
        file: { type: 'string', description: 'File path for direct upload' },
        name: { type: 'string', description: 'Display name for the attachment' },
        url: { type: 'string', description: 'External URL to attach (for external links). Required when resource_subtype is "external".' },
        resource_subtype: { type: 'string', enum: ['external'], description: 'Set to "external" when attaching a URL' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include in response' }
      },
      required: ['parent']
    },
    handler: async (args) => {
      const { opt_fields, ...data } = args;
      const params = {};
      if (opt_fields) params.opt_fields = opt_fields;
      return await client.post('/attachments', data, { params });
    }
  },
  {
    name: 'list_attachments',
    description: 'List attachments for any parent object (task, project, or project brief) by its GID. Use this when listing attachments for non-task resources. For task-specific listing, prefer list_task_attachments. Returns max 100 per page. Related: get_attachment for full details, upload_attachment.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent object GID (task, project, or project_brief)' },
        limit: { type: 'number', description: 'Results per page (1-100)' },
        offset: { type: 'string', description: 'Pagination token' },
        opt_fields: { type: 'string', description: 'Comma-separated fields. Example: "name,host,size,created_at"' }
      },
      required: ['parent']
    },
    handler: async (args) => {
      const { parent, ...params } = args;
      params.parent = parent;
      return await client.get('/attachments', params);
    }
  }
];
