# Asana MCP Server

**Complete Asana API integration for Claude Desktop / Claude Code via the Model Context Protocol (MCP).**

[![Tools](https://img.shields.io/badge/Tools-247-blue)](#tool-categories)
[![Version](https://img.shields.io/badge/Version-2.1.0-green)](../CHANGELOG.md)
[![Tests](https://img.shields.io/badge/Tests-57%2F57-success)](#testing)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

> **247 tools** across **10 categories** — 242 API tools (100% Asana REST coverage) + 5 advisor tools that analyze workspaces and recommend AI Teammates / AI Studio rules / Claude Code agents.

This is NOT a wrapper of the official Asana MCP. It's a superset: full API coverage **plus** advisory intelligence in a single server.

---

## Table of Contents

- [What's new in v2.1.0](#whats-new-in-v210)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Tool Categories](#tool-categories)
- [Architecture](#architecture)
- [Testing](#testing)
- [Documentation](#documentation)

---

## What's new in v2.1.0

LLM tool-selection accuracy on a 50-case NL benchmark went from **26% → 58% (+32pp)** by rewriting tool descriptions across 5 recipes (anti-defensive-lookups, entry-point writes, bulk, relations, advisor disambiguation). 57 tools changed, zero schema/behavior changes. Empirical methodology and findings live in [MCP-Eval-Harness](https://github.com/Bananoman/MCP-Eval-Harness) (sibling repo).

See [CHANGELOG.md](../CHANGELOG.md) for full notes.

---

## Quick Start

### Prerequisites

- Node.js 18+ (required by `@modelcontextprotocol/sdk`)
- An Asana Personal Access Token from https://app.asana.com/0/my-apps
- Claude Desktop or Claude Code

### Install

```bash
git clone https://github.com/Bananoman/Asana-Deploy-A-MCP.git
cd Asana-Deploy-A-MCP
npm install
cp .env.example .env
# Edit .env and set ASANA_TOKEN to your PAT
npm test
```

### Wire it into Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "asana": {
      "command": "node",
      "args": ["/absolute/path/to/Asana-Deploy-A-MCP/src/index.js"],
      "env": {
        "ASANA_TOKEN": "your_pat_here"
      }
    }
  }
}
```

Restart Claude Desktop. The 247 tools become available as `mcp__asana__*`.

### Wire it into Claude Code

Create or edit `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "asana": {
      "command": "node",
      "args": ["/absolute/path/to/Asana-Deploy-A-MCP/src/index.js"],
      "env": {
        "ASANA_TOKEN": "your_pat_here"
      }
    }
  }
}
```

### Run multiple Asana accounts

For multi-tenant setups (one MCP per Asana workspace), copy the entry and rename the key:

```json
{
  "mcpServers": {
    "asana_xma":   { "command": "node", "args": ["..."], "env": { "ASANA_TOKEN": "pat_for_xmarts" } },
    "asana_ecol":  { "command": "node", "args": ["..."], "env": { "ASANA_TOKEN": "pat_for_ecol" } }
  }
}
```

Each instance is fully isolated.

---

## Configuration

All knobs are environment variables. Defaults are production-safe.

| Variable | Default | Purpose |
|---|---|---|
| `ASANA_TOKEN` | *(required)* | Asana Personal Access Token |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |
| `MCP_LOG_DIR` | `/tmp/deploy-a-mcp-logs` | Log file directory (rotates daily) |
| `CACHE_TTL` | `300` | Response cache TTL in seconds |
| `CACHE_MAX_SIZE` | `1000` | Max cached responses |
| `RATE_LIMIT_MAX_REQUESTS` | `1400` | Max req/min (Asana's hard limit is 1500) |
| `RATE_LIMIT_CONCURRENT` | `150` | Max concurrent in-flight requests |
| `ASANA_TOOL_MODE` | `efficient` | `full` (all 247) / `efficient` (saves ~80K tokens) / `minimal` |
| `ASANA_DOMAINS` | `all` | Comma-list to load only some categories: `workspace,projects,tasks,...` |
| `ASANA_RESPONSE_MODE` | `full` | `full` / `compact` (50-70% smaller responses) |
| `ASANA_READ_ONLY` | `false` | `true` loads only read-only tools (safe exploration) |

See [.env.example](.env.example) for the template.

---

## Tool Categories

247 tools, 10 categories, 46 module files in `src/tools/`:

| Category | Modules | Representative tools |
|---|---|---|
| **workspace** (4) | users, teams, workspaces, memberships | `get_current_user`, `list_workspaces`, `list_teams`, `add_user_to_team` |
| **projects** (6) | projects, sections, statuses, briefs, templates, operations | `create_project`, `create_project_with_structure`, `clone_project_structure`, `duplicate_project` |
| **tasks** (6) | tasks, attachments, stories, task-operations, templates, user-task-lists | `create_task`, `search_tasks`, `add_task_comment`, `add_task_dependencies`, `duplicate_task` |
| **portfolio** (2) | portfolios, allocations | `create_portfolio`, `add_item_to_portfolio`, `create_allocation` |
| **goals** (3) | goals, relationships, time-periods | `create_goal`, `add_supporting_goal_relationship`, `list_workspace_time_periods` |
| **automation** (5) | rules, rules-bulk, rules-workflows, webhooks, jobs | `create_rule`, `bulk_create_rules`, `setup_kanban_workflow`, `setup_sprint_workflow`, `create_webhook` |
| **reporting** (2) | organization-exports, audit-log | `create_organization_export`, `get_audit_log_events` |
| **collaboration** (3) | status-updates, reactions, tags | `create_status_update`, `create_task_reaction`, `create_tag` |
| **advanced** (15) | batch, bulk-operations, custom-fields, custom-objects, composite-operations, events, external-data, time-tracking, typeahead, access-requests, methodology-tools, workspace-advisor, etc. | `batch_api`, `bulk_create_tasks`, `bulk_update_tasks`, `create_custom_field`, `create_custom_object`, `workspace_typeahead`, `clone_project_structure` |
| **advisor** (5, embedded in `advanced/`) | workspace-advisor, methodology-tools | `analyze_workspace_overview`, `analyze_project_ai_readiness`, `detect_team_industry`, `validate_ai_capability`, `generate_teammate_blueprint` |

### Advisor flow

```
1. analyze_workspace_overview   → "What's in this workspace?"
2. analyze_project_ai_readiness → "Is this project ready for AI?"
3. detect_team_industry         → "Which industry playbook applies?"
4. validate_ai_capability       → "Is what I want to do feasible?"
5. generate_teammate_blueprint  → "Give me the copy-paste spec for AI Studio"
```

Knowledge embedded as constants in the tools themselves (no external files): 15 AI Teammate capabilities, 15 limitations with alternatives, 6 industry playbooks, 6 trigger types mapped to Asana primitives, 6 output formats.

---

## Architecture

Modular monolith. No microservices.

```
src/
├── index.js           ← Entry point (stdio transport)
├── server.js          ← MCP server + request handlers
├── core/
│   ├── AsanaClient.js          ← HTTP client (axios + retry + circuit breaker + cache + rate limit)
│   ├── CircuitBreakerWrapper.js
│   ├── ResponseCache.js
│   └── InputValidator.js
└── tools/             ← 247 tools across 46 modules
    ├── index.js           ← Central registry
    ├── workspace/  projects/  tasks/  portfolio/  goals/
    ├── automation/  reporting/  collaboration/  advanced/
```

### Stack (decided, not up for re-debate)

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 18+ | Required by `@modelcontextprotocol/sdk` |
| MCP SDK | `@modelcontextprotocol/sdk` ^1.0.4 | Standard for Claude Desktop/Code |
| HTTP | `axios` ^1.7.9 + `axios-retry` | Interceptors, retry, robust |
| Circuit breaker | `opossum` ^9.0.0 | Protects against cascading failures |
| Rate limiter | `bottleneck` ^2.19.5 | Respects Asana's 1500 req/min |
| Validation | `joi` ^18.0.1 | Input schema validation |
| Cache | `node-cache` ^5.1.2 | TTL-configurable, reduces API calls |
| Logging | `winston` + daily-rotate | Rotating logs, configurable levels |
| Tests | `jest` ^29.7.0 | 57/57 passing |

### Tool definition convention

Every tool is an object:

```js
{
  name: 'create_task',
  description: 'Creates a task in Asana. ...',
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  inputSchema: { type: 'object', properties: { ... }, required: [...] },
  handler: async (args) => { /* uses client.get/post/put/delete */ }
}
```

Each module file under `src/tools/<category>/` exports a function `(client) => Array<Tool>`.

---

## Testing

```bash
npm test                  # full suite
npm run test:unit         # unit only
npm run test:integration  # integration only
npm run test:coverage     # with coverage report
```

**Status:** 57/57 passing. Coverage 95%+ across modules.

### Smoke test (verify all tools load)

```bash
node -e "const {getAllTools}=require('./src/tools/index'); const m={get:async()=>({data:[]}),post:async()=>({}),put:async()=>({}),delete:async()=>({})}; console.log(getAllTools(m).length,'tools')"
# Expected: 247 tools
```

---

## Documentation

| File | Purpose |
|---|---|
| [README.md](README.md) | This file |
| [../CLAUDE.md](../CLAUDE.md) | Project constitution (tesis, stack, conventions) |
| [../CHANGELOG.md](../CHANGELOG.md) | Narrative history (per version) |
| [DESCRIPTION-AUDIT-FASE1.md](DESCRIPTION-AUDIT-FASE1.md) | v2.1.0 audit: 5 recipes + before/after examples |
| [docs/guides/](docs/guides/) | User guides (Quick Start, Claude Desktop, Rules Automation) |
| [docs/api-reference/](docs/api-reference/) | Full API spec + tool inventory |
| [docs/adr/](docs/adr/) | Architectural decision records |
| [docs/build-log/](docs/build-log/) | Implementation decisions |

---

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

Description-audit methodology validated in the sibling [MCP-Eval-Harness](https://github.com/Bananoman/MCP-Eval-Harness) repo (50-case NL benchmark, Sonnet 4.6 + prompt caching).
