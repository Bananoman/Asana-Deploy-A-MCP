/**
 * Orchestrator ingest client.
 *
 * Posts normalized Asana events to xma_team_orchestrator
 * (POST /orchestrator/webhook/asana on beesmart). Per coordination plan §5b
 * D.1-D.7 LOCKED 2026-05-26.
 *
 * - Auth: X-Orchestrator-Secret header (env.ORCHESTRATOR_INGEST_SECRET).
 * - Payload: { workspace_slug, dedup_key, asana_event }.
 * - On 5xx: caller retries with exponential backoff up to 1h then DLQs (D.7).
 * - On 200 noop_echo / noop_dup: treat as success, no retry.
 * - On 401 / 404 / 400: log + give up (config error, don't loop).
 *
 * Not auto-invoked anywhere yet. Will be plugged into the webhook event
 * pipeline in Milestone F when DRY_RUN flips to false and a first flow is
 * enabled (qa_validator soak).
 */
import type { AsanaEvent, Env } from "../types";

export interface OrchestratorPostResult {
  ok: boolean;
  status: number;
  body: unknown;
  retryable: boolean; // true if caller should retry/DLQ; false for terminal noops or config errors
}

export async function postEventToOrchestrator(
  env: Env,
  dedupKey: string,
  asanaEvent: AsanaEvent
): Promise<OrchestratorPostResult> {
  const baseUrl = env.ORCHESTRATOR_BASE_URL || "";
  const slug = env.ORCHESTRATOR_WORKSPACE_SLUG || "";
  const secret = env.ORCHESTRATOR_INGEST_SECRET || "";

  if (!baseUrl || !slug || !secret) {
    return {
      ok: false,
      status: 0,
      body: { error: "orchestrator env not fully configured" },
      retryable: false,
    };
  }

  const url = `${baseUrl.replace(/\/$/, "")}/orchestrator/webhook/asana`;
  const payload = {
    workspace_slug: slug,
    dedup_key: dedupKey,
    asana_event: asanaEvent,
  };

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Orchestrator-Secret": secret,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: { error: "network", detail: String(err) },
      retryable: true,
    };
  }

  let body: unknown = null;
  try {
    body = await resp.json();
  } catch {
    body = { raw: await resp.text().catch(() => "") };
  }

  // 200 → recorded | noop_echo | noop_dup → success, no retry
  if (resp.status === 200) {
    return { ok: true, status: 200, body, retryable: false };
  }
  // 4xx → config/data error → caller logs + drops (no retry)
  if (resp.status >= 400 && resp.status < 500) {
    return { ok: false, status: resp.status, body, retryable: false };
  }
  // 5xx → transient → caller should retry with backoff per D.7
  return { ok: false, status: resp.status, body, retryable: true };
}
