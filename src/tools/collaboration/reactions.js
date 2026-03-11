/**
 * Reaction Tools - Emoji Responses on Stories (Comments & Activity)
 *
 * Reactions are emoji responses that can be added to task stories (comments, activity log entries).
 * Each reaction is a single unicode emoji associated with a user and a story. Reactions are on
 * stories, not directly on tasks — use get_task_stories first to find story GIDs.
 *
 * Plan requirements: Free (all reaction features)
 * Rate limits: Standard (1500 req/min paid, 150 free)
 *
 * Key constraints:
 * - One reaction per user per emoji type per story (duplicates are silently ignored)
 * - Limited set of supported emoji types (thumbsup, heart, tada, eyes, rocket, fire, etc.)
 * - Reactions target stories (comments/activity), not tasks directly
 * - Only the reaction creator or a workspace admin can delete a reaction
 *
 * NOT possible via API (use Asana UI instead):
 * - Reacting to task descriptions or project briefs
 * - Custom emoji reactions (only standard set supported)
 *
 * @module reactions
 */

module.exports = (client) => [
  {
    name: 'list_task_reactions',
    description: 'List all emoji reactions on a story (comment or activity entry). Reactions are on stories, not directly on tasks — use get_task_stories first to find story GIDs. Returns paginated results (default 20, max 100) with emoji type and user who reacted. Related: create_task_reaction to add a reaction, get_reaction for details on a specific reaction, delete_reaction to remove, get_task_stories to find story GIDs.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        story_gid: { type: 'string', description: 'The story GID whose reactions to list (use get_task_stories to find story GIDs)' },
        limit: { type: 'number', description: 'Results per page (1-100, default 20)' },
        offset: { type: 'string', description: 'Pagination token from previous response next_page.offset' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "emoji,user,user.name"' }
      },
      required: ['story_gid']
    },
    handler: async (args) => {
      const { story_gid, ...params } = args;
      if (!params.limit) params.limit = 20;
      return await client.get(`/stories/${story_gid}/reactions`, params);
    }
  },
  {
    name: 'create_task_reaction',
    description: 'Add an emoji reaction to a story (comment or activity entry). Reactions are on stories, not directly on tasks — use get_task_stories first to find story GIDs. Supported emoji names: "thumbsup", "thumbsdown", "heart", "tada", "eyes", "rocket", "fire", "clap", "+1", "-1". One reaction per user per emoji type per story — adding a duplicate is silently ignored (no error). Related: list_task_reactions to see existing reactions, delete_reaction to remove a reaction.',
    annotations: { idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        story_gid: { type: 'string', description: 'The story GID to react to (use get_task_stories to find story GIDs)' },
        emoji: { type: 'string', description: 'Emoji name for the reaction. Examples: "thumbsup", "heart", "tada", "eyes", "rocket", "fire", "+1"' }
      },
      required: ['story_gid', 'emoji']
    },
    handler: async (args) => {
      const { story_gid, emoji } = args;
      return await client.post(`/stories/${story_gid}/reactions`, { emoji });
    }
  },
  {
    name: 'delete_reaction',
    description: 'Remove a specific reaction by its GID. Only the user who created the reaction or a workspace admin can delete it. This action cannot be undone. The reaction is permanently removed from the story. Related: list_task_reactions to find reaction GIDs, get_reaction to verify details before deleting.',
    annotations: { destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        reaction_gid: { type: 'string', description: 'The globally unique identifier for the reaction to delete' }
      },
      required: ['reaction_gid']
    },
    handler: async (args) => await client.delete(`/reactions/${args.reaction_gid}`)
  },
  {
    name: 'get_reaction',
    description: 'Get details of a specific reaction by GID. Returns the emoji used, the user who reacted, and the story it was added to. Use this to verify reaction details before performing operations like deletion. Related: list_task_reactions to find reaction GIDs, delete_reaction to remove.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        reaction_gid: { type: 'string', description: 'The globally unique identifier for the reaction' },
        opt_fields: { type: 'string', description: 'Comma-separated fields to include. Example: "emoji,user,user.name"' }
      },
      required: ['reaction_gid']
    },
    handler: async (args) => {
      const params = {};
      if (args.opt_fields) params.opt_fields = args.opt_fields;
      return await client.get(`/reactions/${args.reaction_gid}`, params);
    }
  }
];
