#!/usr/bin/env node

/**
 * Asana MCP Server
 * Main entry point for the Model Context Protocol server
 *
 * This server provides 220 tools for complete Asana API coverage
 * organized into 8 categories for easy navigation.
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const AsanaClient = require('./core/AsanaClient');
const { getAllTools } = require('./tools');
const os = require('os');
const path = require('path');

// Validate environment
const ASANA_TOKEN = process.env.ASANA_TOKEN;
if (!ASANA_TOKEN) {
  console.error('❌ Error: ASANA_TOKEN environment variable is required');
  console.error('Please set it in your environment or .env file');
  process.exit(1);
}

// Log startup info to stderr (will appear in Claude Desktop logs)
const logDir = process.env.MCP_LOG_DIR || path.join(os.tmpdir(), 'deploy-a-mcp-logs');
console.error(`🚀 Asana MCP Server starting...`);
console.error(`📁 Logs directory: ${logDir}`);

// Initialize Asana client and tools
const client = new AsanaClient(ASANA_TOKEN);
const tools = getAllTools(client);

console.error(`✅ ${tools.length} tools loaded successfully`);
console.error(`📂 Tool Categories:`);
console.error(`   - Workspace (users, teams, workspaces)`);
console.error(`   - Projects (projects, templates, statuses)`);
console.error(`   - Tasks (tasks, stories, attachments)`);
console.error(`   - Portfolio (portfolios, allocations)`);
console.error(`   - Goals (goals, relationships, periods)`);
console.error(`   - Automation (rules, webhooks, jobs)`);
console.error(`   - Reporting (exports, audit logs)`);
console.error(`   - Collaboration (updates, reactions, tags)`);
console.error(`   - Advanced (batch, custom objects, integrations)`);
console.error(``);

// Create MCP server
const server = new Server(
  {
    name: 'asana-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  })),
}));

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.name === request.params.name);

  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  try {
    // Fix GID serialization: MCP framework may send numeric GIDs as JSON numbers
    // Asana API requires all GIDs as strings.
    const GID_PROPS = new Set([
      'workspace', 'workspace_gid', 'team', 'team_gid',
      'project', 'project_gid', 'source_project_gid', 'target_project_gid',
      'task', 'task_gid', 'section', 'section_gid',
      'portfolio', 'portfolio_gid', 'goal_gid', 'goal_relationship_gid',
      'tag', 'tag_gid', 'user_gid', 'custom_field', 'custom_field_gid',
      'custom_field_setting_gid', 'enum_option', 'enum_option_gid',
      'item', 'parent', 'owner', 'assignee', 'member', 'resource', 'resource_gid',
      'target', 'supporting_resource', 'organization',
      'attachment_gid', 'story_gid', 'status_update_gid', 'reaction_gid',
      'webhook_gid', 'membership_gid', 'allocation_gid', 'rule_gid',
      'project_template_gid', 'task_template_gid', 'project_brief_gid',
      'project_status_gid', 'job_gid', 'time_tracking_entry_gid',
      'time_period', 'time_period_gid', 'organization_export_gid',
      'access_request_gid', 'custom_object_gid', 'record_gid',
      'user_task_list_gid',
      'assignee_section', 'backlog_section_gid', 'doing_section_gid',
      'done_section_gid', 'in_progress_section_gid', 'review_section_gid',
      'todo_section_gid', 'sprint_section_gid', 'sprint_tag_gid',
      'trigger_section_gid', 'trigger_custom_field_gid',
      'action_assignee_gid', 'action_custom_field_gid', 'action_follower_gid',
      'action_section_gid', 'action_tag_gid',
      'before_section', 'after_section', 'before_enum_option', 'after_enum_option',
      'insert_before', 'insert_after', 'insertion_before', 'insertion_after',
      'developer_gid', 'dev_lead_gid', 'qa_gid', 'qa_lead_gid', 'actor_gid',
    ]);
    function coerceGids(obj) {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(coerceGids);
      if (typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          if (GID_PROPS.has(k) && typeof v === 'number') out[k] = String(v);
          else if (typeof v === 'object') out[k] = coerceGids(v);
          else out[k] = v;
        }
        return out;
      }
      return obj;
    }
    const fixedArgs = coerceGids(request.params.arguments || {});
    const result = await tool.handler(fixedArgs);

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error(`Error executing tool ${request.params.name}:`, error);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            tool: request.params.name,
            details: error.response?.data || error.stack,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🎯 Asana MCP Server running and ready for connections');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
