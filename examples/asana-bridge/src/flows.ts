/**
 * Flow registry — 5 foundational teammates.
 *
 * Phase 3 ships STUBS only. DISABLED_FLOWS="ALL" default → no dispatch.
 * Each flow gets soak 48h on enable before next is turned on (per design v0.2).
 */
import type { AsanaEvent, Env } from "./types";
import { structuredLog } from "./observability";

export interface FlowResult {
  flow: string;
  decision: "would_dispatch" | "would_skip" | "no_match";
  reason?: string;
}

interface FlowSpec {
  name: string;
  /** Returns true if this flow handles this event */
  match(ev: AsanaEvent): boolean;
  /** Dry-run handler — returns what it WOULD do without actually dispatching */
  dryRun(ev: AsanaEvent, env: Env): Promise<FlowResult>;
}

// ── 5 foundational teammates ──────────────────────────────────────────────────

const pm_master: FlowSpec = {
  name: "pm_master",
  match: (ev) => ev.resource.resource_type === "task" && (ev.action === "added" || ev.action === "changed"),
  dryRun: async (ev) => ({
    flow: "pm_master",
    decision: "would_dispatch",
    reason: `task ${ev.resource.gid} ${ev.action}${ev.change?.field ? ` field=${ev.change.field}` : ""}`,
  }),
};

const dev_lead: FlowSpec = {
  name: "dev_lead",
  match: (ev) =>
    ev.resource.resource_type === "task" &&
    ev.action === "changed" &&
    ev.change?.field === "custom_fields",
  dryRun: async (ev) => ({
    flow: "dev_lead",
    decision: "would_dispatch",
    reason: `task ${ev.resource.gid} custom_fields changed`,
  }),
};

const qa_validator: FlowSpec = {
  name: "qa_validator",
  match: (ev) =>
    ev.resource.resource_type === "task" &&
    ev.action === "changed" &&
    ev.change?.field === "completed",
  dryRun: async (ev) => ({
    flow: "qa_validator",
    decision: "would_dispatch",
    reason: `task ${ev.resource.gid} completion toggled`,
  }),
};

const knowledge_steward: FlowSpec = {
  name: "knowledge_steward",
  match: (ev) =>
    ev.resource.resource_type === "story" &&
    ev.action === "added" &&
    ev.resource.resource_subtype === "comment_added",
  dryRun: async (ev) => ({
    flow: "knowledge_steward",
    decision: "would_dispatch",
    reason: `comment story on parent=${ev.parent?.gid ?? "?"}`,
  }),
};

const repo_hygienist: FlowSpec = {
  name: "repo_hygienist",
  match: (ev) =>
    ev.resource.resource_type === "task" &&
    (ev.action === "deleted" || ev.action === "removed"),
  dryRun: async (ev) => ({
    flow: "repo_hygienist",
    decision: "would_dispatch",
    reason: `task ${ev.resource.gid} ${ev.action}`,
  }),
};

// REGISTRY order = matching priority (first match wins). Most specific first.
// pm_master is the catch-all for task added/changed — MUST be last so specific flows
// (dev_lead for custom_fields, qa_validator for completed) get their events first.
const REGISTRY: FlowSpec[] = [dev_lead, qa_validator, repo_hygienist, knowledge_steward, pm_master];

/** Resolve the first matching flow, then check gate (DISABLED_FLOWS). */
export async function resolveAndRun(ev: AsanaEvent, env: Env): Promise<FlowResult> {
  const disabled = (env.DISABLED_FLOWS || "").trim();
  const flow = REGISTRY.find(f => f.match(ev));
  if (!flow) {
    return { flow: "none", decision: "no_match" };
  }

  // Kill switch: DISABLED_FLOWS="ALL" or matching name → would_skip
  if (disabled === "ALL" || disabled.split(",").map(s => s.trim()).includes(flow.name)) {
    return { flow: flow.name, decision: "would_skip", reason: "DISABLED_FLOWS" };
  }

  const result = await flow.dryRun(ev, env);
  if (env.DRY_RUN !== "false") {
    structuredLog("info", "flow_dryrun_only", { flow: flow.name, ...result });
    return { ...result, decision: result.decision === "would_dispatch" ? "would_dispatch" : result.decision };
  }

  // Real dispatch not implemented in Phase 3 — Phase 4 wires this up
  structuredLog("warn", "flow_real_dispatch_not_implemented", { flow: flow.name });
  return { ...result, decision: "would_skip", reason: "real_dispatch_not_implemented" };
}
