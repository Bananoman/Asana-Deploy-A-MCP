/** Jobs Tools */
module.exports = (client) => [
  {
    name: 'get_job',
    description: 'Get a job status',
    inputSchema: {
      type: 'object',
      properties: {
        job_gid: { type: 'string', description: 'Job GID' }
      },
      required: ['job_gid']
    },
    handler: async (args) => await client.get(`/jobs/${args.job_gid}`)
  }
];
