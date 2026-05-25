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
    description: 'Resolve a partial name → GID via fast fuzzy autocomplete. Use ONLY when (a) the user is interactively browsing/searching by partial name, or (b) an upstream tool errored with "not found" and you must disambiguate. Do NOT call as a pre-step before create/update/bulk/search tools — those accept names directly and resolve them server-side. Supports task/project/user/portfolio/tag/custom_field. Searches name only (not descriptions or custom fields). Returns ~20 (max 100). Related: search_tasks (advanced filters), list_projects/list_tasks (full listings).',
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
