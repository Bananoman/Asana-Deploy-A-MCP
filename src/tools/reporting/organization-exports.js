/**
 * Organization Export Tools - Full Enterprise Data Export
 *
 * Organization exports create a complete data dump of all data in an organization/workspace
 * as a ZIP file containing JSON. This includes tasks, projects, users, custom fields, attachments
 * metadata, and all other organization data.
 *
 * Plan requirements: Enterprise only
 * Rate limits: Standard (1500 req/min paid)
 *
 * Key constraints:
 * - Enterprise only — will return 402/403 on non-Enterprise organizations
 * - Requires Service Account token (not personal access token) for full access
 * - Async job pattern: create export, poll get_organization_export for completion, download
 * - Export can take minutes to hours depending on organization size
 * - Download URL in the completed export is valid for only 1 hour — download immediately
 * - Export format is a ZIP file containing JSON data files
 * - Only one export can run at a time per organization
 *
 * NOT possible via API (use Asana UI instead):
 * - Scheduling recurring exports
 * - Exporting specific projects or date ranges (always exports entire org)
 * - Directly downloading the export (use the download_url from the response)
 *
 * @module organization-exports
 */

module.exports = (client) => [
  {
    name: 'get_organization_export',
    description: 'Get the status and download URL of an organization export job. Poll this endpoint after creating an export to check progress. States: "pending" (queued), "started" (in progress), "finished" (ready to download), "error" (failed). When state is "finished", the response includes a download_url that is valid for only 1 hour — download immediately or the URL will expire and you must create a new export. Export duration varies from minutes to hours depending on organization size. ENTERPRISE ONLY — requires Service Account token. Related: create_organization_export to start a new export, get_job for general async job tracking.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        organization_export_gid: { type: 'string', description: 'The globally unique identifier for the organization export (returned by create_organization_export)' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "state,download_url,organization,organization.name,created_at"' }
      },
      required: ['organization_export_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/organization_exports/${args.organization_export_gid}`, params);
    }
  },
  {
    name: 'create_organization_export',
    description: 'Start a full data export of an entire organization/workspace. ENTERPRISE ONLY — requires organization admin permissions and Service Account token. Creates an asynchronous job that exports ALL organization data (tasks, projects, users, custom fields, attachments metadata, etc.) as a ZIP file containing JSON. The export can take minutes to hours depending on organization size. Only one export can run at a time per organization. After creating, poll get_organization_export with the returned GID to check progress. When state is "finished", the download_url is valid for only 1 hour — download immediately. Related: get_organization_export to check status and get download URL, get_job for general async job tracking.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        organization: { type: 'string', description: 'Organization/Workspace GID to export. Must be an Enterprise organization.' }
      },
      required: ['organization']
    },
    handler: async (args) => await client.post('/organization_exports', args)
  }
];
