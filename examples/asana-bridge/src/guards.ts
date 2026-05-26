/**
 * Defense-in-depth guards.
 *
 * Per-event check order in worker.ts processDelivery:
 *   1. twin_drop (echo.ts findStoryTwinsToSkip)
 *   2. cross_delivery_twin (echo.ts isCrossDeliveryStoryTwin)
 *   3. dedup_DO (dedup.ts isDuplicate)
 *   4. mark recent_task_change (echo.ts markRecentTaskChange)
 *   5. echo_suppress (echo.ts checkEcho)
 *   6. orphan_story (storyConsolidation.ts)
 *   7. ─► [guards here] ◄─
 *      a. per-task rate limit
 *      b. per-flow quota
 *   8. flow_resolve (flows.ts)
 *
 * Guards return either { allow: true } or { allow: false, reason, key, count }.
 * Guards do NOT throw on KV errors — fail-open to flow_resolve which logs as flow_error.
 */
import type { AsanaEvent, Env } from "./types";

const TASK_RATE_BUCKET_MIN = 5;          // 5-min sliding bucket
const TASK_RATE_LIMIT_PER_BUCKET = 10;   // max events per task per 5min window for flow dispatch
const TASK_RATE_TTL_SECONDS = 600;       // KV TTL — covers 2x bucket so transitions are safe

const FLOW_QUOTA_TTL_SECONDS = 86400;    // KV TTL — full day
const FLOW_QUOTA_DEFAULT_DAILY = 200;    // per-flow daily cap

export interface GuardResult {
  allow: boolean;
  reason?: string;
  key?: string;
  count?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-task rate-limit guard
// ─────────────────────────────────────────────────────────────────────────────

function bucketMinutes(d: Date): string {
  // Round DOWN to nearest 5-min boundary, format YYYYMMDDHHMMM (last digit = bucket index 0..9)
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hr = String(d.getUTCHours()).padStart(2, "0");
  const mn = Math.floor(d.getUTCMinutes() / TASK_RATE_BUCKET_MIN);
  return `${y}${m}${day}${hr}${String(mn).padStart(2, "0")}`;
}

export async function checkPerTaskRateLimit(ev: AsanaEvent, env: Env): Promise<GuardResult> {
  if (ev.resource.resource_type !== "task") return { allow: true };
  const taskGid = ev.resource.gid;
  const bucket = bucketMinutes(new Date());
  const key = `rate:${taskGid}:${bucket}`;

  // KV does not support atomic increment. Best-effort: read current, write back +1.
  // Two concurrent invocations in same colo can race — acceptable for soft rate limit.
  // For strict serialization use the Dedup DO pattern (overkill for rate limiting).
  let count = 0;
  try {
    const cur = await env.STATE.get(key);
    count = cur ? parseInt(cur, 10) : 0;
  } catch {
    // KV read failure → fail-open
    return { allow: true };
  }
  const newCount = count + 1;
  // Fire-and-forget the write (worker can return 200 even if write lags)
  await env.STATE.put(key, String(newCount), { expirationTtl: TASK_RATE_TTL_SECONDS });

  if (newCount > TASK_RATE_LIMIT_PER_BUCKET) {
    return { allow: false, reason: "task_rate_limit_exceeded", key, count: newCount };
  }
  return { allow: true, key, count: newCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-flow daily quota guard
// ─────────────────────────────────────────────────────────────────────────────

function quotaDay(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function checkPerFlowQuota(flow: string, env: Env): Promise<GuardResult> {
  const day = quotaDay(new Date());
  const key = `quota:${flow}:${day}`;

  let count = 0;
  try {
    const cur = await env.STATE.get(key);
    count = cur ? parseInt(cur, 10) : 0;
  } catch {
    return { allow: true };
  }
  const newCount = count + 1;
  await env.STATE.put(key, String(newCount), { expirationTtl: FLOW_QUOTA_TTL_SECONDS });

  if (newCount > FLOW_QUOTA_DEFAULT_DAILY) {
    return { allow: false, reason: "flow_quota_exceeded", key, count: newCount };
  }
  return { allow: true, key, count: newCount };
}
