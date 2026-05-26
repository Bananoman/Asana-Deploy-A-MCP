/**
 * Polling fallback — runs every 5 min via cron trigger.
 *
 * Purpose: catch any task changes that webhooks missed (at-most-once delivery gap).
 * Uses Asana `/tasks/<gid>?opt_fields=modified_at` against a stored bookmark.
 *
 * Bookmark stored in STATE KV as `poll:bookmark:<project_gid>` (ISO timestamp).
 * Worker fetches `/projects/<gid>/tasks?modified_since=<bookmark>&opt_fields=gid,modified_at,name`,
 * dedupes via the same DO (compound key matches what a webhook would produce),
 * then runs through the standard pipeline (echo → orphan → flow → ...).
 *
 * Phase 4 initial: LOGS what it WOULD poll. Real fetch + dispatch wired in Phase 4.1.
 */
import type { Env } from "./types";
import { captureLog, structuredLog } from "./observability";

const POLL_BOOKMARK_KEY_PREFIX = "poll:bookmark:";

export async function runPollingFallback(env: Env, ctx: ExecutionContext): Promise<void> {
  const startedAt = new Date().toISOString();
  await env.STATE.put("last_poll_at", startedAt);

  const projectGid = env.TEST_PROJECT_GID;
  if (!projectGid) {
    structuredLog("warn", "poll_skipped_no_project");
    return;
  }

  const bookmarkKey = POLL_BOOKMARK_KEY_PREFIX + projectGid;
  const bookmark = (await env.STATE.get(bookmarkKey)) || new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Phase 4 stub: just log the intent + advance bookmark. Real fetch added in Phase 4.1.
  await captureLog(env, {
    type: "poll_fallback",
    received_at: startedAt,
    project_gid: projectGid,
    bookmark_was: bookmark,
    bookmark_now: startedAt,
    note: "Phase 4 stub — real Asana fetch + dispatch not wired yet (Phase 4.1)",
  });

  await env.STATE.put(bookmarkKey, startedAt);
  structuredLog("info", "poll_fallback_done", { project_gid: projectGid, advanced_bookmark_to: startedAt });
}
