/**
 * Batch API Tools - Execute multiple API requests in a single HTTP call
 *
 * The Batch API allows submitting up to 10 API actions in a single request.
 * Actions execute in PARALLEL with NO guaranteed order.
 *
 * Key constraints:
 * - Maximum 10 actions per batch request
 * - Actions execute simultaneously — cannot use output from one as input to another
 * - Each action counts individually toward rate limits (10 actions = 10 rate limit hits)
 * - If ANY action would exceed rate limits, the ENTIRE batch fails with 429
 * - Cannot batch: attachment uploads, organization exports, SCIM operations, nested batches
 * - Response always returns 200 with individual status codes per action
 * - Request body for POST/PUT must be wrapped in {data: {...}}
 *
 * @module batch
 */
module.exports = (client) => [
  {
    name: 'batch_api',
    description: 'Execute multiple API requests in a single batch call. CONSTRAINTS: Max 10 actions per batch. Actions execute in PARALLEL with NO guaranteed order — cannot chain results between actions. Each action counts individually toward rate limits (1500 req/min paid, 150 free). If any action would exceed rate limits, the ENTIRE batch fails with 429. CANNOT batch: attachment uploads, organization exports, SCIM operations, or nested batch calls. Response always returns HTTP 200 with individual status codes per action — check each action result. Request body for POST/PUT must be wrapped in {data: {...}}. Related: bulk_create_tasks for task-specific batching with error tracking.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method' },
              relative_path: { type: 'string', description: 'API path (e.g., "/tasks/12345")' },
              data: { type: 'object', description: 'Request body for POST/PUT. Wrap in {data: {...}}.' },
              options: { type: 'object', description: 'Query parameters (e.g., {opt_fields: "name,assignee"})' }
            },
            required: ['method', 'relative_path']
          },
          description: 'Array of actions (max 10)'
        }
      },
      required: ['actions']
    },
    handler: async (args) => {
      if (args.actions.length > 10) throw new Error('Batch API maximum is 10 actions per request');
      return await client.post('/batch', { actions: args.actions });
    }
  }
];
