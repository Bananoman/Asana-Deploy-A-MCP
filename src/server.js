#!/usr/bin/env node

/**
 * Deploy-A MCP Server - Modular Enterprise Edition
 *
 * Architecture:
 * - AsanaClient: HTTP client for Asana API
 * - Tool modules: Separate files for each resource type
 * - MCP SDK: Official Anthropic SDK
 *
 * @module server
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

// Get Asana token
const ASANA_TOKEN = process.env.ASANA_TOKEN;

if (!ASANA_TOKEN) {
  console.error('Error: ASANA_TOKEN environment variable required');
  process.exit(1);
}

// Log startup info to stderr (will appear in Claude Desktop logs)
const logDir = process.env.MCP_LOG_DIR || path.join(os.tmpdir(), 'deploy-a-mcp-logs');
console.error(`Deploy-A MCP Server starting...`);
console.error(`Logs directory: ${logDir}`);

// Initialize Asana client
const asanaClient = new AsanaClient(ASANA_TOKEN);

// Get all tools
const tools = getAllTools(asanaClient);

// Create MCP server
const server = new Server(
  {
    name: 'deploy-a-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = tools.find(t => t.name === name);

  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  try {
    const result = await tool.handler(args || {});

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    throw new Error(`Tool execution failed: ${error.message}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
