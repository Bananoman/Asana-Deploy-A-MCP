/**
 * Automation Tools - Async Job Tracking
 *
 * Jobs track the progress of long-running asynchronous operations in Asana,
 * such as project duplication, template instantiation, and organization exports.
 *
 * Plan requirements: Free (all plans)
 * Rate limits: Standard (1500 req/min paid, 150 req/min free)
 *
 * Key constraints:
 * - Max 5 concurrent export/duplication/instantiation jobs per user
 * - Jobs are read-only — you can only poll status, not cancel or modify them
 * - Status values: queued, in_progress, completed, failed
 * - Poll get_job periodically (every 5-10 seconds) to check progress
 *
 * NOT possible via API:
 * - Cancelling a running job
 * - Listing all active jobs for a user
 *
 * @module jobs
 */

module.exports = (client) => [
  {
    name: 'get_job',
    description: 'Get the status of an asynchronous job. Jobs are created by long-running operations like duplicate_project, instantiate_project_template, and create_organization_export. Poll this endpoint to track progress (recommended interval: every 5-10 seconds). Status values: "queued" (waiting), "in_progress" (running), "completed" (done — check new_resource for the created resource GID), "failed" (error — check status for details). Max 5 concurrent export/duplication/instantiation jobs per user. Jobs are read-only and cannot be cancelled. Related: duplicate_project and instantiate_project_template return job GIDs, create_organization_export returns a job to track export progress.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        job_gid: { type: 'string', description: 'The globally unique identifier for the job, returned by the operation that created it' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "status,new_resource,new_resource.name,resource_subtype,new_project,new_task"' }
      },
      required: ['job_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/jobs/${args.job_gid}`, params);
    }
  }
];
