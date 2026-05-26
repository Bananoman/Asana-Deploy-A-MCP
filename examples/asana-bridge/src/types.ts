/**
 * Asana webhook payload shape — empirically validated in Phase 1A+1B (66 events, 11 subtypes).
 * Source: `_strategy/ASANA_WORKER_EMPIRICAL_V1_2026-05-25.md`.
 */

export interface AsanaResource {
  gid: string;
  resource_type: string;          // "task" | "story" | "project" | "section" | "tag" | etc.
  resource_subtype?: string;      // "default_task" | "milestone" | "comment_added" | "trashed" | ...
}

export interface AsanaUser {
  gid: string;
  resource_type: "user";
}

export interface AsanaChange {
  field: string;                  // "name" | "notes" | "html_notes" | "due_on" | "due_at" | "completed" | "completed_at" | "assignee" | "custom_fields"
  action: "changed" | "added" | "removed";
  new_value?: unknown;            // present only for custom_fields + assignee per Phase 1B finding 14
}

export interface AsanaEvent {
  created_at: string;             // ISO 8601 with milliseconds
  action: "added" | "changed" | "removed" | "deleted";
  parent: AsanaResource | null;
  user: AsanaUser | null;
  resource: AsanaResource;
  change?: AsanaChange;
}

export interface AsanaWebhookPayload {
  events: AsanaEvent[];
}

export interface Env {
  // KV namespaces
  CAPTURE_LOG: KVNamespace;       // 7d TTL — every request entry
  HOOK_SECRETS: KVNamespace;      // 1y TTL — per-webhook secret
  STATE: KVNamespace;             // misc state: WORKER_ENABLED, echo keys (60s), bookmarks

  // Durable Object binding — dedup
  DEDUP_DO: DurableObjectNamespace;

  // Public vars
  ASANA_WORKSPACE_GID: string;
  TEST_PROJECT_GID: string;
  ENABLE_IDO: string;             // "true" | "false"
  IDO_SHARED_SECRET?: string;
  BRIDGE_USER_GID?: string;
  DISABLED_FLOWS: string;         // "ALL" | "" | "pm_master,dev_lead,..."
  DRY_RUN: string;                // "true" | "false"
  ENABLE_AUTO_RECREATE?: string;  // "true" to allow selfheal to re-create missing webhooks; default off
  // Phase 4 / Milestone D: orchestrator ingest target
  ORCHESTRATOR_BASE_URL?: string;
  ORCHESTRATOR_WORKSPACE_SLUG?: string;

  // Secrets
  ASANA_TOKEN: string;
  BRIDGE_WRITE_SECRET?: string;
  ORCHESTRATOR_INGEST_SECRET?: string;
}
