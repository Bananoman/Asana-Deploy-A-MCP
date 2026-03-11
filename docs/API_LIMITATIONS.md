# Asana API Limitations & Impossible Operations

This document serves as the definitive reference for what the Asana REST API **cannot** do.
Use this to proactively inform users when they request operations that are only available through the Asana UI.

---

## Operations NOT Available via API

### Forms & Intake
- **Cannot create, edit, or configure forms** — Forms are UI-only. Tasks created from form submissions appear as normal tasks and can be read via API.
- **Cannot submit form responses programmatically** — Form submissions must come through the Asana form URL.
- **Cannot export/import forms** between projects.

### Dashboards, Charts & Views
- **Cannot create or modify dashboard charts** — Dashboards are UI-only constructs.
- **Cannot create Timeline/Gantt views** — No API representation exists for these views.
- **Cannot create Board/List/Calendar/Overview views** — View configuration is UI-only.
- **Cannot retrieve chart data or configurations** programmatically.
- **Cannot create or modify saved report views.**

### AI Studio & Smart Features
- **Cannot create AI Studio rules** — AI-powered automation rules are UI-only.
- **Cannot access AI-generated task summaries or insights** via API.
- **Cannot configure smart status updates** programmatically.

### Approval Workflows
- **Cannot configure multi-step approval chains** — While approval tasks exist (resource_subtype: "approval") and their status can be set (pending/approved/rejected/changes_requested), complex approval workflow routing is UI-only.
- **Known bugs**: Approval tasks have documented issues with blocking/dependent task behavior.

### Rules & Automation (Partial)
- **Cannot create AI-powered rules** — Only basic trigger+action rules via API.
- **Cannot create multi-action rules** — API supports one trigger + one action per rule. The UI allows multiple actions per trigger.
- **Cannot create conditional/branching rule logic** — No if/else or branching support via API.
- **Rules do NOT fire on changes made via API** — Rules only trigger on UI-initiated changes (with some exceptions for webhooks).
- **Cannot change trigger or action type on existing rules** — Must delete and recreate the rule.
- **Rules are NOT included when duplicating projects or instantiating templates** via API.
- **Limited trigger/action types compared to Asana UI** — The UI offers many more trigger conditions and action types than the API exposes.

### Real-Time & Streaming
- **No WebSocket or Server-Sent Events support** — Use the Events API (polling with sync tokens) or Webhooks (HTTP push) for change detection.
- **Events API requires polling** — Not real-time; sync tokens expire after 24 hours.

### User & Account Management
- **Cannot create new Asana user accounts** — Can only add existing Asana users to workspaces/teams.
- **Cannot manage billing or plan subscriptions** via API.
- **Cannot access or modify Admin Console settings** (most org-level admin configurations).
- **Cannot manage SSO/SAML configuration** via standard API (SCIM is Enterprise-only with Service Accounts).

### Project Templates (Partial)
- **Rules are NOT preserved** when instantiating project templates via API.
- **Forms are NOT preserved** in template instantiation.
- **Custom field values on template tasks may not carry over** completely.

### File & Media
- **Cannot generate file previews or thumbnails** — Only upload/download raw files.
- **Cannot analyze attachment contents** — No OCR or content extraction.
- **Download URLs are temporary** (~2 minutes for asana-hosted files).

### Custom Fields (Partial)
- **Formula fields are read-only** — Cannot create or edit formula expressions via API.
- **Custom ID fields are read-only** via API.
- **Cannot change a custom field's type after creation** (e.g., text → enum).
- **Locked fields** (locked by admins) are read-only for non-admin users.

---

## Rate Limits

| Tier | Requests/Minute | Notes |
|------|-----------------|-------|
| Free | 150 | Per API token |
| Premium | 1,500 | Per API token |
| Business | 1,500 | Per API token |
| Enterprise | 1,500 | Per API token |
| **Search API** | **60** | **Separate, stricter limit** |
| Batch API | N/A | Each action counts individually against standard limit |

### Concurrency Limits (Independent from rate limits)
| Operation | Max Concurrent |
|-----------|---------------|
| GET requests | 50 |
| POST/PUT/PATCH/DELETE | 15 |
| Export/duplication/instantiation jobs | 5 per user |

### Computational Cost
Complex requests (many custom fields, nested expansions) consume more "cost" and can trigger throttling even within rate limits. The API uses a cost-based system, not just simple request counting.

---

## Plan Requirements

| Feature | Minimum Plan | Notes |
|---------|-------------|-------|
| Custom Fields | Premium | Free users have very limited access |
| Time Tracking | Business | Requires `time_tracking_entries:read` scope |
| Portfolios | Business | Full CRUD available |
| Goals | Business | Full CRUD + metrics |
| Allocations | Business | Resource allocation management |
| Task Templates | Premium | Instantiation available |
| Approvals | Premium | Approval task subtype |
| Audit Log API | Enterprise | **Requires Service Account token** |
| Organization Exports | Enterprise | **Requires Service Account token** |
| Custom Objects | Enterprise | Beta feature |
| SCIM/SAML Provisioning | Enterprise | **Requires Service Account token** |
| Workspace Events | Enterprise | **Requires Service Account token** |

---

## Data Limits & Constraints

| Resource | Limit | Notes |
|----------|-------|-------|
| Pagination max per page | 100 items | Use `offset` token for next page |
| Unpaginated query truncation | ~1,000 items | Always paginate for complete results |
| Text custom field value | 1,024 characters | Max length |
| Attachment file size | 100 MB | Documented (practical ~30 MB due to nginx) |
| Enum options per custom field | 500 | Max options |
| Tasks per active project | 50,000 | Active + inactive combined |
| Webhooks per API token | 10,000 | Max total |
| Webhooks per resource | 1,000 | Max per single resource |
| Batch API actions | 10 | Max per batch request |
| Projects per task | ~20 | Practical limit |
| Subtask nesting depth | 5 levels | Max depth |
| Organization export URL validity | 1 hour | Must refresh on-demand |
| Webhook delivery latency | ~1 minute average | Not guaranteed real-time |

---

## Webhook-Specific Constraints

- **Target URL must be HTTPS** and publicly accessible (no localhost, no HTTP).
- **Handshake required**: On creation, Asana sends `X-Hook-Secret` header; server must echo it back with 200 status.
- **Heartbeat every 8 hours**: Asana sends heartbeat events to verify endpoint is alive.
- **Auto-deletion after 24 hours** without successful heartbeat response.
- **Field-level filtering NOT supported** for high-level resources (Workspace, Team, Portfolio webhooks).
- **Failed deliveries retried** with exponential backoff; persistent failures lead to webhook deletion.

---

## Batch API Constraints

- **Maximum 10 actions** per batch request.
- **Parallel execution**: Actions execute simultaneously with **no guaranteed order**.
- **No action chaining**: Cannot use output from one action as input for another.
- **Cannot batch**: Attachment uploads, organization exports, SCIM operations, or nested batch calls.
- **Rate limit accounting**: Each action counts individually toward rate limits. If any action would exceed limits, the **entire batch fails** with 429.
- **Response**: Always returns 200 with individual status codes per action (even if all actions fail internally).

---

## Date & Format Requirements

| Format | Usage | Example |
|--------|-------|---------|
| Date (date-only) | `due_on`, `start_on` | `2024-03-15` (YYYY-MM-DD) |
| DateTime | `due_at`, `start_at`, `created_at` | `2024-03-15T12:00:00.000Z` (ISO 8601 UTC) |
| Rich Text | `html_notes`, `html_text` | Must be wrapped in `<body>` tags |
| Custom Field Enum | Setting values | Use enum_option GID (not name) |
| User Reference | `assignee`, followers | User GID string or `"me"` |

---

## Deprecated & Changing Behavior

- **As of Feb 2025**: `GET /projects`, `GET /users`, `GET /tags` require explicit `workspace` or `team` parameters for users in multiple workspaces.
- **`hearted`/`hearts`/`num_hearts`** on stories: Deprecated in favor of `liked`/`likes`/`num_likes`.
- **`projects` on sections**: Deprecated in favor of singular `project`.
- Always check the [Asana Developer Changelog](https://developers.asana.com/docs/change-log) for latest deprecations.
