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
    const result = await tool.handler(request.params.arguments || {});

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
