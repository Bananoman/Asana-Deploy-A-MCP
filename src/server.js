#!/usr/bin/env node

/**
 * Deploy-A MCP Server - Modular Enterprise Edition
 *
 * Supports:
 * - ASANA_TOOL_MODE: full|efficient|minimal (default: efficient)
 * - ASANA_DOMAINS: all|comma-separated categories (default: all)
 * - ASANA_RESPONSE_MODE: full|compact (default: full)
 *
 * In efficient mode, core tools (~17) are loaded eagerly and the rest (~224)
 * are deferred — they still work when called, but their full schemas are only
 * sent to the client when listed. This reduces init tokens from ~84K to ~5K.
 *
 * @module server
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const AsanaClient = require('./core/AsanaClient');
const { getToolsByMode } = require('./tools');
const os = require('os');
const path = require('path');

// ─── Environment ───

const ASANA_TOKEN = process.env.ASANA_TOKEN;
if (!ASANA_TOKEN) {
  console.error('Error: ASANA_TOKEN environment variable required');
  process.exit(1);
}

const TOOL_MODE = (process.env.ASANA_TOOL_MODE || 'efficient').toLowerCase();
const RESPONSE_MODE = (process.env.ASANA_RESPONSE_MODE || 'full').toLowerCase();
const READ_ONLY = process.env.ASANA_READ_ONLY === 'true';
const logDir = process.env.MCP_LOG_DIR || path.join(os.tmpdir(), 'deploy-a-mcp-logs');

console.error(`Deploy-A MCP Server starting...`);
console.error(`  Tool mode: ${TOOL_MODE}`);
console.error(`  Response mode: ${RESPONSE_MODE}`);
console.error(`  Domains: ${process.env.ASANA_DOMAINS || 'all'}`);
console.error(`  Read-only: ${READ_ONLY}`);
console.error(`  Logs: ${logDir}`);

// ─── Initialize ───

const asanaClient = new AsanaClient(ASANA_TOKEN);
const { eagerTools, deferredTools, allTools } = getToolsByMode(asanaClient);

// Build lookup map for call handler (all tools callable regardless of mode)
const toolMap = new Map();
for (const tool of allTools) {
  toolMap.set(tool.name, tool);
}

console.error(`  Eager tools: ${eagerTools.length}`);
console.error(`  Deferred tools: ${deferredTools.length}`);
console.error(`  Total callable: ${allTools.length}`);

// ─── Compact response helpers ───

const COMPACT_STRIP_KEYS = new Set([
  'color', 'created_at', 'created_by', 'photo', 'permalink_url',
  'workspace', 'resource_type', 'resource_subtype'
]);

function compactify(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(compactify);
  if (typeof obj !== 'object') return obj;

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Strip null/empty values
    if (value === null || value === '' || value === undefined) continue;
    // Strip noisy keys
    if (COMPACT_STRIP_KEYS.has(key)) continue;
    // Truncate long text fields
    if ((key === 'notes' || key === 'html_notes') && typeof value === 'string' && value.length > 200) {
      result[key] = value.substring(0, 200) + '... [truncated]';
      continue;
    }
    result[key] = compactify(value);
  }
  return result;
}

// ─── MCP Server ───

const server = new Server(
  { name: 'deploy-a-mcp', version: '3.0.0' },
  {
    capabilities: {
      tools: {},
      resources: { listChanged: true },
      prompts: { listChanged: true }
    }
  }
);

// List tools: in efficient mode, deferred tools get minimal schema
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const listed = [];

  // Eager tools: full schema
  for (const tool of eagerTools) {
    listed.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      ...(tool.annotations && { annotations: tool.annotations })
    });
  }

  // Deferred tools: minimal description + empty schema (still callable via toolMap)
  for (const tool of deferredTools) {
    listed.push({
      name: tool.name,
      description: tool.description.split('.')[0] + '.',
      inputSchema: { type: 'object', properties: {} },
      ...(tool.annotations && { annotations: tool.annotations })
    });
  }

  return { tools: listed };
});

// Call tool: any tool is callable regardless of eager/deferred
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = toolMap.get(name);

  if (!tool) {
    throw new Error(`Tool not found: ${name}. Use get_asana_guide to discover available tools.`);
  }

  try {
    let result = await tool.handler(args || {});

    // Apply compact mode if enabled
    if (RESPONSE_MODE === 'compact' && typeof result === 'object') {
      result = compactify(result);
    }

    return {
      content: [{
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error.message,
          errorCode: error.code || 'UNKNOWN',
          tool: name,
          retryable: error.status === 429 || (error.status && error.status >= 500),
          details: error.response?.data || null
        }, null, 2)
      }],
      isError: true
    };
  }
});

// ─── Prompts (stubs — implementations added in Phase 3) ───

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: [] };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  throw new Error(`Prompt not found: ${request.params.name}. Prompts will be added in a future update.`);
});

// ─── Resources (stubs — implementations added in Phase 4) ───

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return { resourceTemplates: [] };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  throw new Error(`Resource not found: ${request.params.uri}. Resources will be added in a future update.`);
});

// ─── Start ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Deploy-A MCP Server ready');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
