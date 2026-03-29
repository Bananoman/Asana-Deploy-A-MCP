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

// ─── Prompts (5 consulting workflow prompts) ───

const PROMPTS = [
  {
    name: 'asana_discovery_session',
    description: 'Guide a complete Asana discovery session: maturity scoring, discovery questions, and industry detection. Use this as the first step in a client engagement.',
    arguments: [
      { name: 'workspace_gid', description: 'Client workspace GID', required: true },
      { name: 'client_name', description: 'Client organization name', required: false },
      { name: 'known_industry', description: 'If known, skip industry detection (e.g., marketing, product, operations)', required: false }
    ]
  },
  {
    name: 'asana_fitgap_analysis',
    description: 'Classify client requirements against Asana capabilities. Produces a fit-gap matrix with N (native), C (configurable), D (development), CP (process change) classifications.',
    arguments: [
      { name: 'workspace_gid', description: 'Client workspace GID', required: true },
      { name: 'requirements', description: 'Comma-separated list of client requirements from discovery', required: false }
    ]
  },
  {
    name: 'asana_implementation_plan',
    description: 'Generate a complete DVA (Documento de Visión y Alcance) for the client. Includes scope, phases, training plan, risk register, and investment estimate.',
    arguments: [
      { name: 'workspace_gid', description: 'Client workspace GID', required: true },
      { name: 'client_name', description: 'Client organization name', required: true },
      { name: 'industry', description: 'Client industry', required: true },
      { name: 'methodology', description: 'quick_start, hybrid, or enterprise (from maturity assessment)', required: true }
    ]
  },
  {
    name: 'asana_health_check',
    description: 'Run a comprehensive workspace health audit: orphan projects, overdue tasks, unused custom fields, disabled rules, and sprint planning opportunities.',
    arguments: [
      { name: 'workspace_gid', description: 'Workspace GID to audit', required: true },
      { name: 'focus', description: 'Focus area: all, tasks, projects, rules, or fields (default: all)', required: false }
    ]
  },
  {
    name: 'asana_automation_planner',
    description: 'Analyze a workspace and produce an automation plan: what to automate with Rules, AI Teammates, Claude Code agents, and what NOT to automate yet. Includes savings estimates.',
    arguments: [
      { name: 'workspace_gid', description: 'Workspace GID to analyze', required: true },
      { name: 'project_gid', description: 'Optional: specific project to focus on', required: false },
      { name: 'budget_context', description: 'Client Asana plan: free, premium, business, or enterprise', required: false }
    ]
  },
  {
    name: 'asana_generate_deliverables',
    description: 'Generate both implementation deliverables in one flow: (1) Implementation Template with classified subtasks (A/PA/M) and MCP tool mappings, and (2) DVA (Documento de Visión y Alcance) for the client. Orchestrates: maturity → fitgap → template → DVA → ROI.',
    arguments: [
      { name: 'workspace_gid', description: 'Client workspace GID', required: true },
      { name: 'client_name', description: 'Client organization name', required: true },
      { name: 'industry', description: 'Client industry (e.g., marketing, operations, product)', required: true }
    ]
  }
];

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: PROMPTS };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: promptArgs } = request.params;
  const prompt = PROMPTS.find(p => p.name === name);

  if (!prompt) {
    throw new Error(`Prompt not found: ${name}. Available: ${PROMPTS.map(p => p.name).join(', ')}`);
  }

  const workspace = promptArgs?.workspace_gid || '{workspace_gid}';

  const messages = {
    asana_discovery_session: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Run a complete Asana discovery session for ${promptArgs?.client_name || 'the client'} (workspace: ${workspace}).

Step 1: Call assess_asana_maturity with workspace_gid="${workspace}" to get the maturity score and recommended methodology.

Step 2: Based on the maturity score, call analyze_workspace_overview with workspace_gid="${workspace}" to understand the workspace structure.

Step 3: Pick the 2-3 most active projects and call analyze_project_ai_readiness on each to assess AI automation potential.

Step 4: ${promptArgs?.known_industry ? `The industry is "${promptArgs.known_industry}". Use this for playbook matching.` : 'Call detect_team_industry on the most representative project to identify the industry playbook.'}

Step 5: Synthesize everything into a Discovery Report with sections:
- Executive Summary (2-3 sentences)
- Maturity Score (table with 5 dimensions)
- Workspace Overview (teams, projects, activity)
- AI Readiness Assessment (per project)
- Industry Match and Recommended Playbook
- Recommended Methodology and Next Steps

Be specific and actionable. This report will be shown to the client.`
        }
      }
    ],

    asana_fitgap_analysis: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Generate a fit-gap analysis for workspace ${workspace}.

${promptArgs?.requirements
  ? `Client requirements:\n${promptArgs.requirements.split(',').map((r, i) => `${i + 1}. ${r.trim()}`).join('\n')}\n\nCall generate_fitgap_analysis with workspace_gid="${workspace}" and these requirements as client_requirements array.`
  : `No requirements provided yet. Call generate_fitgap_analysis with workspace_gid="${workspace}" to auto-infer requirements from workspace patterns.`}

After getting results, present them as a professional Fit-Gap Matrix:

| # | Requirement | Priority | Classification | How | Effort | Hours |
|---|------------|----------|---------------|-----|--------|-------|

Then add:
- Summary counts (N/C/D/CP)
- Total hours estimate (PERT: optimistic / expected / pessimistic)
- Top 3 risks from the D and CP items
- Recommended next step: generate_implementation_plan`
        }
      }
    ],

    asana_implementation_plan: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Generate a complete implementation plan (DVA) for ${promptArgs?.client_name || 'the client'}.

Call generate_implementation_plan with:
- workspace_gid: "${workspace}"
- client_name: "${promptArgs?.client_name || 'Client'}"
- industry: "${promptArgs?.industry || 'general'}"
- methodology: "${promptArgs?.methodology || 'hybrid'}"

Then format the output as a client-ready Documento de Visión y Alcance:

# Documento de Visión y Alcance
## ${promptArgs?.client_name || 'Client'} — Asana Implementation

### 1. Executive Summary
### 2. Scope
#### In Scope / Out of Scope / Assumptions
### 3. Implementation Phases (timeline table)
### 4. Training Plan (role × hours × topics)
### 5. Risk Register (risk × probability × impact × mitigation)
### 6. Investment
### 7. Next Steps

Make it professional, specific, and ready for client signature.`
        }
      }
    ],

    asana_health_check: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Run a comprehensive health check on workspace ${workspace}.${promptArgs?.focus && promptArgs.focus !== 'all' ? ` Focus on: ${promptArgs.focus}.` : ''}

Step 1: Call analyze_workspace_overview with workspace_gid="${workspace}" to get the workspace structure.

Step 2: Pick the 5 most active projects and call analyze_project_ai_readiness on each.

Step 3: For each project, check:
- Tasks overdue (due_on < today and not completed)
- Tasks without assignees
- Tasks without due dates
- Empty sections (sections with 0 tasks)
- Disabled rules

Step 4: Call get_asana_guide with topic="api_limitations" to note what can't be fixed via API.

Step 5: Present a Health Check Report:
- Overall Health Score (0-100)
- Critical Issues (fix now)
- Warnings (fix soon)
- Quick Wins (easy improvements)
- Recommendations table: Issue | Severity | Fix | MCP Tool

Be direct and prioritize by impact.`
        }
      }
    ],

    asana_automation_planner: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create an automation plan for workspace ${workspace}.${promptArgs?.project_gid ? ` Focus on project ${promptArgs.project_gid}.` : ''}${promptArgs?.budget_context ? ` Client is on the ${promptArgs.budget_context} plan.` : ''}

Step 1: ${promptArgs?.project_gid
  ? `Call analyze_project_ai_readiness with project_gid="${promptArgs.project_gid}".`
  : `Call analyze_workspace_overview with workspace_gid="${workspace}", then call analyze_project_ai_readiness on the top 3 projects.`}

Step 2: For each AI opportunity detected, call validate_ai_capability to verify feasibility.

Step 3: Call estimate_automation_savings with workspace_gid="${workspace}" to calculate time savings.

Step 4: Call get_asana_guide with topic="prebuilt_teammates" to check if any prebuilt Teammates match before recommending custom builds.

Step 5: Present an Automation Plan:

### Tier 1 — Build First (highest impact, ready now)
For each: Name | Type (Rule/AI Teammate/Agent) | Savings | Confidence

### Tier 2 — Build Next
### Tier 3 — Build Later

### AI Studio Rules (quick wins)
### Do Not Build Yet (and why)

### Savings Summary
| Recommendation | Type | Hours/Year (range) | Confidence |
Total: X-Y hours/year (~Z FTE)

### Build Order Rationale
1-2 paragraphs explaining why this order.

### Disclaimer
"Directional estimates for planning purposes..."

Be specific. Use actual project and task names from the workspace.`
        }
      }
    ],

    asana_generate_deliverables: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Generate both implementation deliverables for ${promptArgs?.client_name || 'the client'} (workspace: ${workspace}, industry: ${promptArgs?.industry || 'general'}).

## DELIVERABLE 1: Implementation Template

Step 1: Call assess_asana_maturity with workspace_gid="${workspace}" to determine the methodology (quick_start/hybrid/enterprise).

Step 2: Call generate_implementation_template with:
- workspace_gid: "${workspace}"
- methodology: [result from step 1]
- client_name: "${promptArgs?.client_name || 'Client'}"
- industry: "${promptArgs?.industry || 'general'}"

Step 3: Present the Implementation Template as a checklist organized by phase:

### Implementation Tracking Template
**Methodology:** [from step 1]
**Client:** ${promptArgs?.client_name || 'Client'}

For each phase (Scoring → Discovery → Fit-Gap → Proposal → Execution):
- List each subtask with its classification badge: [A] Automated, [PA] Partial, [M] Manual
- For [A] items: show the MCP tool and pre-filled command
- For [PA] items: show the MCP tool AND the manual steps the consultant must do
- For [M] items: show the complete step-by-step guide
- Show hours estimate and dependencies

## DELIVERABLE 2: DVA (Client-Facing Document)

Step 4: Call generate_fitgap_analysis with workspace_gid="${workspace}" to get requirement classifications.

Step 5: Call generate_implementation_plan with:
- workspace_gid: "${workspace}"
- client_name: "${promptArgs?.client_name || 'Client'}"
- industry: "${promptArgs?.industry || 'general'}"
- methodology: [from step 1]
- fitgap_summary: [summary from step 4]

Step 6: Call estimate_automation_savings with workspace_gid="${workspace}".

Step 7: Format the DVA as a professional client-ready document:

# Documento de Visión y Alcance
## ${promptArgs?.client_name || 'Client'} — Asana Implementation

### 1. Executive Summary
### 2. Scope (In/Out/Assumptions)
### 3. Implementation Phases (timeline table)
### 4. Training Plan
### 5. Risk Register
### 6. Investment
### 7. Automation ROI (from savings estimate)
### 8. Next Steps

## SUMMARY

End with a summary table:
| Deliverable | Status |
|-------------|--------|
| Implementation Template | Generated ([A]: X, [PA]: Y, [M]: Z subtasks) |
| DVA | Generated (X pages, Y phases, Z weeks) |
| Automation ROI | X-Y hours/year saved |`
        }
      }
    ]
  };

  return {
    description: prompt.description,
    messages: messages[name] || []
  };
});

// ─── Resources (2 dynamic workspace resources) ───

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: [
      {
        uriTemplate: 'asana://workspace/{gid}/overview',
        name: 'Workspace Overview',
        description: 'Teams, project counts, most active projects, custom field and rule counts, public/private breakdown.',
        mimeType: 'application/json'
      },
      {
        uriTemplate: 'asana://workspace/{gid}/projects',
        name: 'Workspace Projects',
        description: 'List of projects with owner, team, modified date, section count, custom fields, and rule count.',
        mimeType: 'application/json'
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Parse URI: asana://workspace/{gid}/overview or asana://workspace/{gid}/projects
  const match = uri.match(/^asana:\/\/workspace\/(\d+)\/(overview|projects)$/);
  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}. Expected: asana://workspace/{gid}/overview or asana://workspace/{gid}/projects`);
  }

  const [, workspaceGid, resourceType] = match;

  if (resourceType === 'overview') {
    const [teams, projects] = await Promise.all([
      asanaClient.get(`/organizations/${workspaceGid}/teams`, { limit: 100, opt_fields: 'name' })
        .catch(() => ({ data: [] })),
      asanaClient.get('/projects', {
        workspace: workspaceGid, limit: 100, archived: false,
        opt_fields: 'name,team,team.name,public,modified_at,owner,owner.name,custom_field_settings'
      })
    ]);

    const projectList = projects.data || [];
    const teamList = teams.data || [];

    // Aggregate by team
    const byTeam = {};
    projectList.forEach(p => {
      const teamName = p.team?.name || '(No team)';
      if (!byTeam[teamName]) byTeam[teamName] = 0;
      byTeam[teamName]++;
    });

    const recentProjects = [...projectList]
      .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at))
      .slice(0, 5)
      .map(p => ({ gid: p.gid, name: p.name, team: p.team?.name, modified_at: p.modified_at }));

    const overview = {
      workspace_gid: workspaceGid,
      total_teams: teamList.length,
      total_projects: projectList.length,
      projects_with_custom_fields: projectList.filter(p => (p.custom_field_settings || []).length > 0).length,
      public_projects: projectList.filter(p => p.public).length,
      private_projects: projectList.filter(p => !p.public).length,
      projects_by_team: byTeam,
      most_active_projects: recentProjects
    };

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(overview, null, 2)
      }]
    };
  }

  if (resourceType === 'projects') {
    const projects = await asanaClient.get('/projects', {
      workspace: workspaceGid, limit: 100, archived: false,
      opt_fields: 'name,team,team.name,public,modified_at,owner,owner.name,custom_field_settings'
    });

    const projectList = (projects.data || []).map(p => ({
      gid: p.gid,
      name: p.name,
      owner: p.owner?.name || null,
      team: p.team?.name || null,
      is_public: p.public,
      modified_at: p.modified_at,
      has_custom_fields: (p.custom_field_settings || []).length > 0
    }));

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ workspace_gid: workspaceGid, projects: projectList }, null, 2)
      }]
    };
  }

  throw new Error(`Unknown resource type: ${resourceType}`);
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
