/**
 * Typeahead (Autocomplete Search) Tools - Fast fuzzy search
 *
 * Typeahead provides fast, fuzzy-matched autocomplete results for finding
 * resources by name. Much faster than search_tasks but returns limited results.
 *
 * Key constraints:
 * - Returns ~20 results by default (max 100)
 * - Fuzzy matching — partial names and typos may match
 * - Does NOT search task descriptions or custom field values — name only
 * - Not a replacement for search_tasks (which supports advanced filters)
 *
 * @module typeahead
 */
module.exports = (client) => [
  {
    name: 'workspace_typeahead',
    description: 'Fast autocomplete search across workspace resources by name. Fuzzy-matched results for quick lookup by partial name. Supports: task, project, user, portfolio, tag, custom_field resource types. Returns ~20 results by default (max 100 via count parameter). IMPORTANT: Searches name only — does not search descriptions, custom fields, or task content. Much faster than search_tasks but with limited filtering. Use search_tasks for advanced filtering (by assignee, dates, custom fields, etc.). Related: search_tasks for advanced filtering, list_projects/list_tasks for full listings.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        workspace_gid: { type: 'string', description: 'Workspace GID' },
        resource_type: { type: 'string', enum: ['project', 'task', 'user', 'portfolio', 'tag', 'custom_field'], description: 'Type of resource to search' },
        query: { type: 'string', description: 'Search query (fuzzy matching)' },
        count: { type: 'number', description: 'Number of results (default 20, max 100)' },
        opt_fields: { type: 'string', description: 'Fields to include in results' }
      },
      required: ['workspace_gid', 'resource_type']
    },
    handler: async (args) => {
      const { workspace_gid, resource_type, ...params } = args;
      params.type = resource_type;
      return await client.get(`/workspaces/${workspace_gid}/typeahead`, params);
    }
  }
];
