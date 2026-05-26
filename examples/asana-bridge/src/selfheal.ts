/**
 * Self-heal cron — runs every 10 min via cron trigger.
 *
 * Asana auto-DELETES webhooks after 24h if no successful heartbeat. Unlike ClickUp
 * (which suspends with reactivation possible), Asana's deletion is final → must re-create.
 *
 * Strategy:
 *   1. List webhooks via Asana API for our workspace
 *   2. For each expected (workspace_gid, target_url) pair, verify a webhook exists
 *   3. If missing AND ENABLE_AUTO_RECREATE="true", re-create the webhook
 *   4. Else log degraded state to capture + structured log; Rubén intervenes manually
 *
 * Default: auto-recreate OFF (`env.ENABLE_AUTO_RECREATE !== "true"`) to avoid first-deploy surprises.
 * Flip to "true" once 1 week of soak shows stable behavior.
 */
import type { Env } from "./types";
import { captureLog, structuredLog } from "./observability";

const ASANA_API_BASE = "https://app.asana.com/api/1.0";

interface AsanaWebhook {
  gid: string;
  resource: { gid: string; resource_type: string };
  target: string;
  active: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
}

export async function runSelfHeal(env: Env, ctx: ExecutionContext): Promise<void> {
  const startedAt = new Date().toISOString();
  // Always-on heartbeat marker in STATE — single key updated on every fire, observable via /healthz
  await env.STATE.put("last_selfheal_at", startedAt);

  if (!env.ASANA_TOKEN || !env.ASANA_WORKSPACE_GID) {
    structuredLog("warn", "selfheal_skipped_missing_env");
    return;
  }
  const headers = {
    "Authorization": `Bearer ${env.ASANA_TOKEN}`,
    "Accept": "application/json",
  };

  // Fetch all webhooks for this workspace
  const url = `${ASANA_API_BASE}/webhooks?workspace=${env.ASANA_WORKSPACE_GID}&opt_fields=resource,target,active,last_success_at,last_failure_at&limit=100`;
  let webhooks: AsanaWebhook[] = [];
  try {
    const resp = await fetch(url, { headers });
    if (!resp.ok) throw new Error(`Asana list_webhooks ${resp.status}`);
    const j = (await resp.json()) as { data?: AsanaWebhook[] };
    webhooks = j.data || [];
  } catch (err) {
    await captureLog(env, {
      type: "selfheal_error",
      received_at: startedAt,
      error: String(err),
    });
    return;
  }

  // Match expected webhook (Phase 4 scope: single test project)
  const expectedResource = env.TEST_PROJECT_GID;
  const expectedTargetPattern = "/asana-webhook-test";
  const found = webhooks.find(w =>
    w.resource.gid === expectedResource && w.target.includes(expectedTargetPattern)
  );

  const health = {
    expected_resource: expectedResource,
    found: !!found,
    found_gid: found?.gid ?? null,
    active: found?.active ?? null,
    last_success_at: found?.last_success_at ?? null,
    last_failure_at: found?.last_failure_at ?? null,
    total_webhooks_in_workspace: webhooks.length,
  };

  if (!found) {
    structuredLog("error", "selfheal_webhook_missing", health);
    if (env.ENABLE_AUTO_RECREATE === "true") {
      // Auto-recreate is intentionally NOT implemented yet — would require generating
      // a new webhook_gid → updating the URL → handshake handler. Phase 4.2.
      await captureLog(env, {
        type: "selfheal_recreate_skipped",
        received_at: startedAt,
        reason: "auto_recreate_not_implemented_yet",
        ...health,
      });
    } else {
      await captureLog(env, {
        type: "selfheal_alert",
        received_at: startedAt,
        severity: "critical",
        message: "Expected webhook MISSING — Rubén must re-create manually via mcp__asana_xmarts__create_webhook",
        ...health,
      });
    }
    return;
  }

  // Webhook exists — check failure freshness
  if (found.last_failure_at && (!found.last_success_at || found.last_failure_at > found.last_success_at)) {
    structuredLog("warn", "selfheal_webhook_degraded", health);
    await captureLog(env, {
      type: "selfheal_alert",
      received_at: startedAt,
      severity: "warning",
      message: "Webhook has more recent failure than success",
      ...health,
    });
  } else {
    structuredLog("info", "selfheal_healthy", health);
  }
}
