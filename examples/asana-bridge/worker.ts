/**
 * asana-bridge — Phase 3 production-grade Worker
 *
 * Architecture per `_strategy/ASANA_WORKER_DESIGN_v0.3.md` (delta-supersedes v0.2):
 *   - Dedup via Durable Object (DEDUP_DO binding) — single-writer per compound key
 *   - Echo suppression Layer 1 (user identity) + Layer 2 (KV echo key with FIELD_SIDE_EFFECTS)
 *   - Story consolidation: STORY_TWIN drop + orphan-story dead-letter
 *   - Flow registry with 5 foundational teammates, DISABLED_FLOWS="ALL" default + DRY_RUN=true
 *   - Bridge writes ONLY via /bridge-write/<secret> path (forces markEcho-before-write)
 *
 * Anti-patterns enforced (v0.2 §3 + Phase 1/2 lock):
 *   - HMAC SHA-256 verify on every delivery (handshake-or-die)
 *   - Hard-fail closed when stored secret missing
 *   - Capture log 7d TTL
 *   - WORKER_ENABLED KV kill switch (always checked first)
 *   - ctx.waitUntil for async work (Asana 10s timeout cap)
 *   - per-event iteration inside events[] (Asana batches)
 *
 * Routes:
 *   POST /asana-webhook-test                       — handshake + delivery
 *   POST /asana-webhook-test/bridge-write/<secret> — Bridge write (sets echo + PUTs Asana)
 *   POST /asana-webhook-test/ido-test/<secret>     — break-glass iDO (default disabled)
 *   GET  /asana-webhook-test/healthz               — env + KV + DO + flows + last delivery
 *
 * Exports DedupDO class for Durable Object binding (see wrangler.toml).
 */

import type { Env, AsanaWebhookPayload, AsanaEvent } from "./src/types";
import { captureLog } from "./src/observability";
import { isDuplicate, DedupDO } from "./src/dedup";
import {
  checkEcho,
  findStoryTwinsToSkip,
  markEcho,
  markRecentTaskChange,
  isCrossDeliveryStoryTwin,
  STORY_TWINS,
} from "./src/echo";
import { isOrphanStory } from "./src/storyConsolidation";
import { makeAsanaApi } from "./src/asanaApi";
import { resolveAndRun } from "./src/flows";
import { checkPerTaskRateLimit, checkPerFlowQuota } from "./src/guards";
import { runPollingFallback } from "./src/poll";
import { runSelfHeal } from "./src/selfheal";

export { DedupDO };  // required for DO binding (Cloudflare looks up class by name)

const VERSION = "0.4.1-orchestrator-wired";

// ─────────────────────────────────────────────────────────────────────────────
// HMAC SHA-256 (timing-safe, body-as-string per Asana spec — Worker agent: "common pitfall")
// ─────────────────────────────────────────────────────────────────────────────

async function hmacSha256Hex(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kill switch
// ─────────────────────────────────────────────────────────────────────────────

async function isWorkerEnabled(env: Env): Promise<boolean> {
  const v = await env.STATE.get("WORKER_ENABLED");
  return v !== "false";
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: Asana webhook (handshake + delivery)
// ─────────────────────────────────────────────────────────────────────────────

async function handleAsanaWebhook(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  webhookGid: string
): Promise<Response> {
  if (!(await isWorkerEnabled(env))) {
    return new Response("WORKER_ENABLED=false", { status: 503 });
  }

  const hookSecret = req.headers.get("X-Hook-Secret");
  const hookSig = req.headers.get("X-Hook-Signature");

  // ── Phase A: Handshake (X-Hook-Secret present, NO X-Hook-Signature) ──
  if (hookSecret && !hookSig) {
    await env.HOOK_SECRETS.put(`hook_secret:${webhookGid}`, hookSecret, {
      expirationTtl: 86400 * 365,
    });
    await captureLog(env, {
      type: "handshake",
      webhook_gid: webhookGid,
      received_at: new Date().toISOString(),
    });
    return new Response("", { status: 200, headers: { "X-Hook-Secret": hookSecret } });
  }

  // ── Phase B: Delivery (X-Hook-Signature) ──
  if (!hookSig) return new Response("Missing X-Hook-Signature", { status: 401 });

  const body = await req.text();  // MUST be raw string

  const storedSecret = await env.HOOK_SECRETS.get(`hook_secret:${webhookGid}`);
  if (!storedSecret) {
    return new Response("Unknown webhook (no stored secret)", { status: 503 });
  }

  const expectedSig = await hmacSha256Hex(body, storedSecret);
  if (!timingSafeEqHex(expectedSig, hookSig)) {
    await captureLog(env, {
      type: "bad_signature",
      webhook_gid: webhookGid,
      received_at: new Date().toISOString(),
    });
    return new Response("Bad signature", { status: 401 });
  }

  // ACK fast, process async
  ctx.waitUntil(processDelivery(body, webhookGid, env));
  return new Response("", { status: 200 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Delivery processing — per-event iteration with all guards
// ─────────────────────────────────────────────────────────────────────────────

async function processDelivery(body: string, webhookGid: string, env: Env): Promise<void> {
  const startedAt = new Date().toISOString();

  let payload: AsanaWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    await captureLog(env, {
      type: "delivery_parse_error",
      webhook_gid: webhookGid,
      received_at: startedAt,
      body: body.slice(0, 500),
    });
    return;
  }

  const events = payload.events || [];

  // Story twins to drop (parallel auto-events of task changes already in batch)
  const twinDrops = findStoryTwinsToSkip(events);

  const api = makeAsanaApi(env);

  const perEventResults: unknown[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    if (twinDrops.has(i)) {
      perEventResults.push({ index: i, decision: "drop_story_twin", resource_type: ev.resource.resource_type });
      continue;
    }

    // Cross-delivery story twin (story arrives in separate delivery from its task change)
    if (await isCrossDeliveryStoryTwin(ev, env)) {
      perEventResults.push({
        index: i,
        decision: "drop_cross_delivery_twin",
        resource_subtype: ev.resource.resource_subtype,
        parent_gid: ev.parent?.gid,
      });
      continue;
    }

    // Heartbeat = empty events array (handled above by `events.length === 0` short-circuit)

    // Dedup (DO single-writer)
    let dupCheck;
    try {
      dupCheck = await isDuplicate(ev, env);
    } catch (err) {
      perEventResults.push({ index: i, decision: "dedup_error", error: String(err) });
      continue;
    }
    if (dupCheck) {
      perEventResults.push({ index: i, decision: "duplicate" });
      continue;
    }

    // Mark recent_task_change BEFORE downstream filters so stories arriving in later
    // deliveries can still see the marker even if the task event was echo-suppressed.
    if (
      ev.resource.resource_type === "task" &&
      ev.action === "changed" &&
      ev.change?.field &&
      STORY_TWINS[ev.change.field]
    ) {
      await markRecentTaskChange(ev.resource.gid, ev.change.field, env);
    }

    // Echo suppression (Layer 1 + Layer 2)
    const echo = await checkEcho(ev, env);
    if (echo.would_suppress) {
      perEventResults.push({
        index: i,
        decision: "echo_suppress",
        layer1: echo.layer1_user_match,
        layer2: echo.layer2_echo_hit,
      });
      continue;
    }

    // Orphan story (only system-generated stories with non-existent parent)
    if (ev.resource.resource_type === "story" && ev.user === null) {
      let orphan: boolean;
      try {
        orphan = await isOrphanStory(ev, api, env);
      } catch (err) {
        perEventResults.push({ index: i, decision: "orphan_check_error", error: String(err) });
        continue;
      }
      if (orphan) {
        perEventResults.push({ index: i, decision: "orphan_dead_letter" });
        continue;
      }
    }

    // Per-task rate limit (5-min bucket, 10 events/window default)
    const rateGuard = await checkPerTaskRateLimit(ev, env);
    if (!rateGuard.allow) {
      perEventResults.push({
        index: i,
        decision: "rate_limit_exceeded",
        key: rateGuard.key,
        count: rateGuard.count,
      });
      continue;
    }

    // Flow resolution + dry-run (real dispatch wired up Phase 4)
    let flowResult;
    try {
      flowResult = await resolveAndRun(ev, env);
    } catch (err) {
      perEventResults.push({ index: i, decision: "flow_error", error: String(err) });
      continue;
    }

    // Per-flow daily quota — only consumes a slot if flow actually matched
    if (flowResult.flow && flowResult.flow !== "none" && flowResult.decision === "would_dispatch") {
      const quotaGuard = await checkPerFlowQuota(flowResult.flow, env);
      if (!quotaGuard.allow) {
        perEventResults.push({
          index: i,
          decision: "flow_quota_exceeded",
          flow: flowResult.flow,
          key: quotaGuard.key,
          count: quotaGuard.count,
        });
        continue;
      }
      perEventResults.push({ index: i, ...flowResult, quota_count: quotaGuard.count });
    } else {
      perEventResults.push({ index: i, ...flowResult });
    }
  }

  await env.STATE.put("last_delivery_at", new Date().toISOString());

  await captureLog(env, {
    type: "delivery",
    webhook_gid: webhookGid,
    received_at: startedAt,
    events_count: events.length,
    twin_drops: Array.from(twinDrops),
    per_event_results: perEventResults,
    body: body,  // raw for deep forensics
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: Bridge write — sets echo + PUTs Asana (Phase 2 harness, now via module)
// ─────────────────────────────────────────────────────────────────────────────

async function handleBridgeWrite(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  providedSecret: string
): Promise<Response> {
  if (!env.BRIDGE_WRITE_SECRET || providedSecret !== env.BRIDGE_WRITE_SECRET) {
    return new Response("Bad bridge-write secret", { status: 401 });
  }
  if (!(await isWorkerEnabled(env))) {
    return new Response("WORKER_ENABLED=false", { status: 503 });
  }
  if (!env.ASANA_TOKEN) {
    return new Response("ASANA_TOKEN not bound", { status: 503 });
  }

  interface BridgeWriteRequest {
    task_gid: string;
    field: string;
    value: unknown;
    set_echo?: boolean;
  }

  let body: BridgeWriteRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON body", { status: 400 });
  }

  if (!body.task_gid || !body.field) {
    return new Response("Missing task_gid or field", { status: 400 });
  }

  const setEcho = body.set_echo !== false;

  // Mark echo BEFORE write (markEcho also covers FIELD_SIDE_EFFECTS per Phase 2 lock)
  if (setEcho) {
    await markEcho(body.task_gid, body.field, env);
  }

  const api = makeAsanaApi(env);
  // NOTE: api.putTaskField internally calls markEcho again — idempotent, so this is safe.
  // For set_echo=false test path, we bypass api.putTaskField (which always echos) and call fetch directly:
  let asanaStatus: number;
  let asanaText: string;
  if (setEcho) {
    const r = await api.putTaskField(body.task_gid, body.field, body.value);
    asanaStatus = r.status;
    asanaText = r.body;
  } else {
    const resp = await fetch(`https://app.asana.com/api/1.0/tasks/${body.task_gid}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.ASANA_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ data: { [body.field]: body.value } }),
    });
    asanaStatus = resp.status;
    asanaText = await resp.text();
  }

  ctx.waitUntil(
    captureLog(env, {
      type: "bridge_write",
      received_at: new Date().toISOString(),
      request: { task_gid: body.task_gid, field: body.field, value: body.value, set_echo: setEcho },
      asana_status: asanaStatus,
      asana_response_body: asanaText.length > 2000 ? asanaText.slice(0, 2000) + "...[truncated]" : asanaText,
    })
  );

  if (asanaStatus < 200 || asanaStatus >= 300) {
    return new Response(
      JSON.stringify({ ok: false, asana_status: asanaStatus, body: asanaText }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, asana_status: asanaStatus }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: Dead-letter dump (read-only) — protected by BRIDGE_WRITE_SECRET
// ─────────────────────────────────────────────────────────────────────────────

async function handleDeadLetterDump(
  req: Request,
  env: Env,
  providedSecret: string
): Promise<Response> {
  if (!env.BRIDGE_WRITE_SECRET || providedSecret !== env.BRIDGE_WRITE_SECRET) {
    return new Response("Bad secret", { status: 401 });
  }

  // Walk CAPTURE_LOG for entries with type=dead_letter OR type=delivery with orphan/error decisions.
  // KV doesn't support filtered queries — list keys then fetch each. Cap to avoid runaway.
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const sinceIso = url.searchParams.get("since") || "1970-01-01T00:00:00Z";
  const prefix = `delivery:`;

  const list = await env.CAPTURE_LOG.list({ prefix, limit: 1000 });
  const out: Array<Record<string, unknown>> = [];

  for (const k of list.keys) {
    if (out.length >= limit) break;
    if (k.name < `${prefix}${sinceIso}`) continue;

    const raw = await env.CAPTURE_LOG.get(k.name);
    if (!raw) continue;
    let entry: any;
    try { entry = JSON.parse(raw); } catch { continue; }

    const isDeadLetter = entry?.type === "dead_letter";
    let dlqDecisions: unknown[] = [];
    if (entry?.type === "delivery" && Array.isArray(entry.per_event_results)) {
      dlqDecisions = entry.per_event_results.filter((r: any) =>
        ["dedup_error", "orphan_dead_letter", "orphan_check_error", "flow_error",
         "rate_limit_exceeded", "flow_quota_exceeded"].includes(r?.decision)
      );
    }
    if (isDeadLetter || dlqDecisions.length > 0) {
      out.push({
        key: k.name,
        type: entry?.type,
        received_at: entry?.received_at,
        reason: entry?.reason ?? null,
        decisions: dlqDecisions,
        event_count: entry?.events_count ?? null,
      });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, count: out.length, entries: out }, null, 2),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: iDO break-glass (default disabled)
// ─────────────────────────────────────────────────────────────────────────────

async function handleIdoBreakGlass(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  providedSecret: string
): Promise<Response> {
  if (env.ENABLE_IDO !== "true") return new Response("iDO disabled", { status: 503 });
  if (!env.IDO_SHARED_SECRET || providedSecret !== env.IDO_SHARED_SECRET) {
    return new Response("Bad iDO secret", { status: 401 });
  }
  if (!(await isWorkerEnabled(env))) return new Response("WORKER_ENABLED=false", { status: 503 });

  const body = await req.text();
  const url = new URL(req.url);

  ctx.waitUntil(
    captureLog(env, {
      type: "ido_breakglass",
      method: req.method,
      received_at: new Date().toISOString(),
      headers: Object.fromEntries(req.headers),
      query: Object.fromEntries(url.searchParams),
      body,
    })
  );

  return new Response(JSON.stringify({ captured: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// /healthz
// ─────────────────────────────────────────────────────────────────────────────

async function handleHealthz(env: Env): Promise<Response> {
  const enabled = await isWorkerEnabled(env);
  const lastDelivery = await env.STATE.get("last_delivery_at");
  const lastPoll = await env.STATE.get("last_poll_at");
  const lastSelfheal = await env.STATE.get("last_selfheal_at");

  const probe = {
    version: VERSION,
    worker_enabled: enabled,
    env: {
      ASANA_WORKSPACE_GID: !!env.ASANA_WORKSPACE_GID,
      TEST_PROJECT_GID: !!env.TEST_PROJECT_GID,
      ENABLE_IDO: env.ENABLE_IDO,
      ASANA_TOKEN: !!env.ASANA_TOKEN,
      BRIDGE_WRITE_SECRET: !!env.BRIDGE_WRITE_SECRET,
      BRIDGE_USER_GID: env.BRIDGE_USER_GID || null,
      DISABLED_FLOWS: env.DISABLED_FLOWS || "ALL",
      DRY_RUN: env.DRY_RUN || "true",
      ORCHESTRATOR_BASE_URL: env.ORCHESTRATOR_BASE_URL || null,
      ORCHESTRATOR_WORKSPACE_SLUG: env.ORCHESTRATOR_WORKSPACE_SLUG || null,
      ORCHESTRATOR_INGEST_SECRET: !!env.ORCHESTRATOR_INGEST_SECRET,
    },
    kv: {
      CAPTURE_LOG: !!env.CAPTURE_LOG,
      HOOK_SECRETS: !!env.HOOK_SECRETS,
      STATE: !!env.STATE,
    },
    durable_objects: {
      DEDUP_DO: !!env.DEDUP_DO,
    },
    crons: ["*/5 * * * * (poll)", "*/10 * * * * (selfheal)"],
    enable_auto_recreate: env.ENABLE_AUTO_RECREATE === "true",
    last_delivery_at: lastDelivery,
    last_poll_at: lastPoll,
    last_selfheal_at: lastSelfheal,
    phase: "4-hardening-dryrun",
    flows_disabled: env.DISABLED_FLOWS || "ALL",
    dry_run: env.DRY_RUN !== "false",
  };

  return new Response(JSON.stringify(probe, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main fetch handler
// ─────────────────────────────────────────────────────────────────────────────

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Dispatch based on cron schedule
    if (event.cron === "*/5 * * * *") {
      ctx.waitUntil(runPollingFallback(env, ctx));
    } else if (event.cron === "*/10 * * * *") {
      ctx.waitUntil(runSelfHeal(env, ctx));
    } else {
      console.warn(JSON.stringify({ event: "scheduled_unknown_cron", cron: event.cron }));
    }
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === "/asana-webhook-test/healthz" || path === "/healthz") {
        return handleHealthz(env);
      }

      const bridgeWriteMatch = path.match(/^\/asana-webhook-test\/bridge-write\/(.+)$/);
      if (bridgeWriteMatch && req.method === "POST") {
        return handleBridgeWrite(req, env, ctx, bridgeWriteMatch[1]);
      }

      const dlqMatch = path.match(/^\/asana-webhook-test\/dlq\/(.+)$/);
      if (dlqMatch && req.method === "GET") {
        return handleDeadLetterDump(req, env, dlqMatch[1]);
      }

      const idoMatch = path.match(/^\/asana-webhook-test\/ido-test\/(.+)$/);
      if (idoMatch && req.method === "POST") {
        return handleIdoBreakGlass(req, env, ctx, idoMatch[1]);
      }

      if (path === "/asana-webhook-test" && req.method === "POST") {
        const webhookGid = url.searchParams.get("webhook_gid") || "default";
        return handleAsanaWebhook(req, env, ctx, webhookGid);
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      const e = err as { message?: string; stack?: string };
      console.error(JSON.stringify({ event: "error", message: e?.message, stack: e?.stack }));
      return new Response("Internal error", { status: 500 });
    }
  },
};
