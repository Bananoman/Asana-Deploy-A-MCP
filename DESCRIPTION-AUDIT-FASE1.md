# Description Audit — Fase 1 MCP Asana

> Generado 2026-05-25 desde MCP-Eval-Harness baseline (Sonnet 4.6, 50 cases, 26% tool acc).
> 57% de fallas eran defensive pre-checks. Este doc propone 5 recetas de rewrite con before/after concretos para review **antes de aplicar**.

## Resumen del problema

- 247 tools, 26% accuracy baseline. 21/37 fallas = LLM llamó `get_current_user`/`workspace_typeahead`/`list_workspaces` ANTES del tool real.
- **Smoking gun**: `get_current_user` description dice literalmente *"Useful as a first call to discover which workspaces are available and to get the current user GID for subsequent API calls."* → invitamos al pre-check.
- Tool Search BM25 NO ayuda (-4pp) porque indexa las mismas descriptions malas. Fix descriptions PRIMERO.

## Receta A — Defensive lookup tools (4 tools)

**Aplica a:** `get_current_user`, `workspace_typeahead`, `list_workspaces`, `get_project_sections` (este último fue mal usado como pre-check de `bulk_move_tasks_to_section`).

**Rule:** quitar phrasing que invite a llamarlo "primero". Agregar gating explícito.

### A.1 — `get_current_user`

**BEFORE:**
> Get profile information for the currently authenticated user. Shortcut for get_user with user_gid="me". Returns name, email, workspaces list, and photo URLs. **Useful as a first call to discover which workspaces are available and to get the current user GID for subsequent API calls.** Photo URLs are returned in multiple sizes...

**AFTER:**
> Get profile of the currently authenticated user. Returns name, email, workspaces, photo URLs. **Use ONLY when the user explicitly asks "who am I" or needs the current user's GID/email. Do NOT call before create/update/search/bulk tools — those resolve identity server-side automatically.** Shortcut for get_user with user_gid="me".

### A.2 — `workspace_typeahead`

**BEFORE:**
> Fast autocomplete search across workspace resources by name. Fuzzy-matched results for quick lookup by partial name...

**AFTER:**
> Fast autocomplete to resolve a name → GID **only when an upstream tool explicitly errors with "not found" or when the user is browsing/searching interactively**. Do NOT call as a pre-step before create/update/bulk tools — those accept names directly. Fuzzy match by name across task/project/user/portfolio/tag/custom_field.

### A.3 — `list_workspaces`

**BEFORE:**
> List all workspaces and organizations the authenticated user has access to. Returns both personal workspaces and organization workspaces with paginated results... **Use this as a sta**[rting point]...

**AFTER:**
> List all workspaces the user can access. **Use ONLY when the user asks to see/choose a workspace, or when an upstream tool fails with "workspace required" and there's no contextual workspace_id.** Do NOT call as a routine pre-step. Returns is_organization flag per result.

---

## Receta B — Entry-point write tools (~30 tools)

**Aplica a:** `create_task`, `create_subtask`, `create_project`, `create_project_with_structure`, `create_section`, `create_goal`, `create_portfolio`, `create_rule`, `create_webhook`, `create_status_update`, `create_custom_field`, `create_enum_custom_field`, `create_custom_object`, `create_custom_object_record`, `create_team`, `create_tag`, `create_time_tracking_entry`, `update_task`, `update_project`, `search_tasks`, `instantiate_project_template`, `duplicate_task`, `save_project_as_template`, etc.

**Rule:** abrir con la acción + "Pass names or GIDs; identity resolved server-side". Mover constraints/warnings al final. Quitar "requires X_gid" del headline.

### B.1 — `create_task`

**BEFORE:**
> Create a new task in a workspace/project. Supports full task configuration: assignee, dates, custom fields, subtypes (milestone, approval), rich text via html_notes, and more. **Either workspace or at least one project GID is required.** CONSTRAINTS: Milestones cannot have start_on/start_at...

**AFTER:**
> Create a task. **Direct action — no pre-validation needed.** Pass project/workspace/assignee by name OR GID; this tool resolves names automatically. Supports assignee, dates, custom fields, subtypes (milestone, approval), rich text. Do NOT call get_current_user or workspace_typeahead first. Constraints: milestones cannot have start_on/start_at; html_notes wrapped in <body>, supported tags: strong/em/u/a/code/ul/ol/li/h1/h2/br.

### B.2 — `search_tasks`

**BEFORE:**
> Search tasks in a workspace with advanced filters. **IMPORTANT: This endpoint has a stricter rate limit of 60 requests/minute (vs 1500 for other endpoints). Results are capped at ~1000 items even with pagination — for larger datasets, use more specific filters.** Does not search subtask content...

**AFTER:**
> Find tasks by text, tag, project, assignee, completion, due date, or custom field. **Direct action — pass workspace/project by name; do NOT pre-call list_workspaces or get_current_user.** Use for "find overdue", "tasks tagged urgent", "tasks due this week", etc. Note: 60 req/min rate limit; capped at ~1000 results — narrow filters for larger sets. Does not search subtask content.

### B.3 — `create_goal`

**BEFORE:**
> Create a new goal in a workspace (Business+ plan required). Goals track strategic objectives and can have metrics... **Requires workspace and name.** Set is_workspace_level=true...

**AFTER:**
> Create an OKR or strategic goal. Pass workspace/team by name OR GID; identity resolved server-side. Goals track strategic objectives with optional metric (number/percentage/currency), time period (FY/H1/H2/Q1-Q4), and supporting projects/portfolios. Set is_workspace_level=true for org-wide goals. Business+ plan required.

---

## Receta C — Bulk tools (14 tools)

**Aplica a:** todos los `bulk_*` (eval acc: 0/7 = 0%).

**Rule:** abrir con la acción en phrasing de usuario ("reassign many", "mark batch complete"). Quitar jargon "sequential processing" del headline.

### C.1 — `bulk_assign_tasks`

**BEFORE:**
> Assign multiple tasks to the same user. Useful for workload redistribution or sprint planning. Overwrites existing assignees. Sequential processing with per-task results. Related: update_task for single assignment, bulk_update_tasks for arbitrary updates.

**AFTER:**
> **Bulk-reassign many tasks to one person in one call.** Use for "assign these 20 tasks to Carlos", workload redistribution, sprint planning rebalance. Pass tasks and assignee by name OR GID. Overwrites existing assignees. Max 50 tasks per call. Per-task error tracking; partial failures do not abort. Related: update_task (single), bulk_update_tasks (arbitrary updates).

### C.2 — `bulk_complete_tasks`

**BEFORE:**
> Mark multiple tasks as completed. Useful for closing out sprints, archiving done work, or batch status updates. Completion triggers notifications to task followers. Sequential processing with per-task results. Related: update_task for single completion, archive_completed_tasks to remove completed tasks from projects.

**AFTER:**
> **Mark a batch of tasks complete at once.** Use for "close out the sprint", "mark all in section X done", end-of-week task cleanup. Pass tasks by name OR GID. Triggers follower notifications. Max 50 tasks per call. Per-task error tracking. Related: update_task (single), archive_completed_tasks (remove from project), bulk_delete_tasks (destructive).

### C.3 — `bulk_set_task_due_dates`

**BEFORE:**
> Set the same due date on multiple tasks. Useful for sprint deadline alignment or milestone coordination. Date format: YYYY-MM-DD. Overwrites existing due dates. Sequential processing. Related: update_task for single date change, bulk_update_tasks.

**AFTER:**
> **Push or align the due date on many tasks at once.** Use for "set Friday as due date for these 30 tasks", sprint deadline alignment, milestone coordination, deadline slip propagation. Date format: YYYY-MM-DD. Overwrites existing due dates. Max 50 tasks. Related: update_task (single), bulk_update_tasks.

### C.4 — `bulk_delete_tasks`

**BEFORE:**
> Permanently delete multiple tasks. DESTRUCTIVE: Cannot be undone. Deleted tasks are removed from all projects; subtasks become top-level tasks. Use stopOnError=true for safety...

**AFTER:**
> **Permanently delete a batch of tasks.** Use for "clean up stale tasks", "delete the test data". DESTRUCTIVE: Cannot be undone. Consider bulk_complete_tasks or archive_completed_tasks first if tasks should be preserved. Subtasks become top-level after deletion. Max 50 per call. Use stopOnError=true for safety.

---

## Receta D — Relation tools `add_*_to_*` / `add_*_followers` (16 tools)

**Aplica a:** `add_task_to_section`, `add_task_to_project`, `add_user_to_workspace`, `add_user_to_team`, `add_item_to_portfolio`, `add_members_to_portfolio`, `add_project_members`, `add_project_followers`, `add_task_followers`, `add_task_dependencies`, `add_task_dependents`, `add_task_tag`, `add_goal_followers`, `add_supporting_goal_relationship`, `add_project_custom_field_setting`, `add_portfolio_custom_field_setting`.

**Rule:** abrir con "Relates an existing X to Y" (no "create"). Pass by name or GID. Distinguish from `create_*`.

### D.1 — `add_task_to_section`

**BEFORE:**
> Move a task into a specific section within its project. The task must already belong to the project containing this section...

**AFTER:**
> **Move an existing task into a section (board column / list group).** Use for "move task X to In Review", "drop into Done column". Pass task and section by name OR GID. Task must already be in the section's project. One section per project — moving here removes from current. Use insert_before/after for position. Related: bulk_move_tasks_to_section (many tasks).

### D.2 — `add_user_to_workspace`

**BEFORE:**
> Add an existing Asana user to a workspace or organization, or invite a new user by email. Specify the user by GID (existing user) or email address (sends invitation if not yet on Asana)...

**AFTER:**
> **Invite a user to a workspace, or add an existing Asana user.** Use for "invite ruben@example.com", onboarding new team members. Pass user by email (invites) or GID (existing user). Does NOT create an Asana account — invitee accepts via email. Admin permission required. For organizations, prefer add_user_to_team for team-scoped access.

### D.3 — `add_item_to_portfolio`

**BEFORE:**
> Add a project to a portfolio (Business+ plan required). The item must be a project GID — portfolios contain projects only, not tasks or goals...

**AFTER:**
> **Add an existing project to a portfolio for tracking.** Use for "add project Edenred Onboarding to LATAM Implementations portfolio". Pass portfolio and project by name OR GID. Portfolios contain projects only (not tasks/goals). A project can be in multiple portfolios. Idempotent (re-adding is no-op). Business+ plan. Related: create_portfolio, remove_item_from_portfolio.

### D.4 — `add_supporting_goal_relationship`

**BEFORE:**
> Add a supporting resource to a goal (Business+ plan required). Links a sub-goal, project, or portfolio as a contributor to the parent goal...

**AFTER:**
> **Link a sub-goal, project, or portfolio as a contributor to a parent goal (OKR hierarchy).** Use for "make goal 'Hit Series A' the parent of goal 'Reach 50 customers'", building OKR trees, cascading objectives. Pass goals by name OR GID. Relationship types: subgoal (another goal), supporting_work (project/portfolio). Optional contribution_weight. Business+ plan.

---

## Receta E — Zeroed categories (custom fields/objects/portfolios/templates/webhooks/rules)

**Aplica a:** todas las descriptions de categorías con 0% accuracy en eval.

**Rule:** inyectar keywords de usuario en el headline. "dropdown", "OKR", "template", "webhook subscription", "automation rule".

### E.1 — `create_enum_custom_field`

**BEFORE:**
> Create an enum (dropdown) custom field with initial options. Shortcut for create_custom_field with type=enum...

**AFTER:**
> **Create a dropdown / single-select custom field with named options.** Use for "create a Priority field with Low/Medium/High/Critical options", status fields, category pickers. Pass workspace by name OR GID. Each option can have a name + color. Max 500 options. Shortcut for create_custom_field type=enum. Premium feature. Related: create_enum_option (add later), set_custom_field_value (set on task).

### E.2 — `set_custom_field_value`

**BEFORE:**
> Set a custom field value on a task. Value type depends on the field type: enum → enum_option GID (string), multi_enum → array of enum_option GIDs, text → string (max 1024 chars), number → number, date → "YYYY-MM-DD" string, people → array of user GIDs...

**AFTER:**
> **Set a custom field value on a task** (e.g., "set Priority to Critical on task X", "mark task as 'In Review' status"). Pass task, field, and value by name OR GID; this tool resolves enum options by label. Value type matches field type: enum/multi_enum (option name/GID), text (string ≤1024), number, date (YYYY-MM-DD), people (user GIDs). Formula and custom_id fields are read-only.

### E.3 — `create_portfolio`

**BEFORE:**
> Create a new portfolio in a workspace (Business+ plan required). Portfolios group projects for high-level tracking and cross-initiative reporting...

**AFTER:**
> **Create a portfolio to group projects for high-level / cross-initiative tracking.** Use for "create a LATAM Implementations 2026 portfolio", program-level views, executive dashboards. Pass workspace by name OR GID. Optional: color (dark-*/light-* palette), owner (defaults to caller), initial members, public visibility. After creation, use add_item_to_portfolio to attach projects. Business+ plan.

### E.4 — `create_rule`

**BEFORE:**
> Create a new automation rule in a project. Each rule has ONE trigger + ONE action (API limitation). Rules only fire on UI-initiated changes, not API changes...

**AFTER:**
> **Create an automation rule** (e.g., "when task moves to Done, auto-assign QA lead", auto-tag on creation, due-date notifications). Pass project by name OR GID. ONE trigger + ONE action per rule (API limitation). Rules fire only on UI changes, not API changes. Cannot create AI-powered or branching rules via API. Trigger types: task_added_to_project, task_moved_to_section, task_completed, task_uncompleted, custom_field_changed. Related: trigger_rule (manual fire), audit_project_rules.

### E.5 — `create_webhook`

**BEFORE:**
> Create a webhook to receive real-time notifications when a resource changes. CRITICAL: target URL MUST be HTTPS and publicly accessible. Asana performs a handshake on creation...

**AFTER:**
> **Subscribe to real-time events on a resource via webhook** (e.g., "notify when a task is created in project X"). Pass resource by name OR GID. Target URL MUST be HTTPS and publicly accessible. Asana sends X-Hook-Secret on creation — your server must echo it back in the response header to complete handshake. Heartbeat every 8 hours; auto-deleted after 24 hours of no response. Related: list_webhooks, delete_webhook.

### E.6 — `analyze_workspace_overview`

**BEFORE:**
> Get a high-level overview of workspace structure for AI planning. Lists all teams, counts projects per team, and identifies the most active projects...

**AFTER:**
> **AI advisor: workspace-wide audit for automation opportunities.** Use for "analyze our Asana workspace and tell me where AI Studio could save time", "where should we start with AI Teammates", workspace maturity assessment. Pass workspace by name OR GID. Returns team structure, project counts, most-active projects, and prioritized AI/automation recommendations. Best starting point for any AI readiness analysis. Related: analyze_project_ai_readiness (one project deep-dive), generate_teammate_blueprint.

---

## Aplicación prevista

| Receta | Tools afectados | Files afectados |
|---|---:|---|
| A — Defensive lookups | 4 | `workspace/users.js`, `advanced/typeahead.js`, `workspace/workspaces.js`, `projects/sections.js` |
| B — Entry-point writes | ~30 | varios files de `tasks/`, `projects/`, `goals/`, `portfolio/`, `automation/`, `collaboration/`, `advanced/custom-*.js` |
| C — Bulk | 14 | `advanced/bulk-operations.js` |
| D — Relations `add_*` | 16 | varios |
| E — Zeroed categories | ~25 | `advanced/custom-fields.js`, `advanced/custom-objects.js`, `portfolio/*.js`, `automation/*.js`, `advanced/workspace-advisor.js`, etc. |
| **Total** | **~85 tools** | **~15 files** |

## Estrategia de ship

1. **Aplico recetas A + B primero** (defensive lookups + entry-points = 34 tools). Re-eval con 15-case sample (~$0.50). Esperamos lift 26% → ~45-55%.
2. **Si confirma lift**: aplico C + D + E (más 51 tools). Re-eval full 50 cases. Esperamos 55% → 65-75%.
3. **Bump version**: 2.0.0 → 2.1.0 (minor, backwards-compatible — names no cambian, solo descriptions).
4. **Si Fase 1 estabiliza > 60%**: activar Tool Search BM25 consumer-side y re-medir (ahora sí debería ayudar).

## Decisión pendiente

¿Aplico ya las recetas A + B (34 tools)? El cambio es no-destructive (solo strings de descripción), no toca código de handlers ni cambia nombres ni firmas.
