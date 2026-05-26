/**
 * Echo suppression — prevents the Bridge-writes-trigger-Bridge loop.
 *
 * Two layers:
 * - Layer 1: user identity check. If event.user.gid === BRIDGE_USER_GID → suppress.
 * - Layer 2: echo key check. Before every bridge write, set `echo:<task_gid>:<field>` 60s TTL.
 *   On webhook receipt, check the same key. If hit → suppress.
 *
 * EMPIRICAL §6B (Phase 2 2026-05-26): writing a primary field also fires side-effect events
 * (notes → html_notes, completed → completed_at, due_on → due_at). Echo key must be set for
 * ALL side-effect fields, not just the primary. Story-level twins (marked_complete, due_date_changed)
 * have no `change.field` and are dropped via story consolidation rule.
 */
import type { AsanaEvent, Env } from "./types";

const FIELD_SIDE_EFFECTS: Record<string, string[]> = {
  notes:       ["notes", "html_notes"],
  html_notes:  ["notes", "html_notes"],
  completed:   ["completed", "completed_at"],
  due_on:      ["due_on", "due_at"],
  due_at:      ["due_on", "due_at"],
  name:        ["name"],
  assignee:    ["assignee"],
};

export const STORY_TWINS: Record<string, string[]> = {
  completed: ["marked_complete", "marked_incomplete"],
  due_on:    ["due_date_changed"],
  due_at:    ["due_date_changed"],
};

/** Set a short-lived KV marker so a story arriving in a LATER delivery can still be identified
 * as a twin of a recent task change. TTL 30s — story usually arrives within 0.5-3s but we
 * leave headroom for delivery jitter. See `ASANA_WORKER_DESIGN_v0.3.md` §10 limitation #1. */
export async function markRecentTaskChange(taskGid: string, field: string, env: Env): Promise<void> {
  const twins = STORY_TWINS[field];
  if (!twins) return;
  await Promise.all(
    twins.map(twin => env.STATE.put(`recent_task_change:${taskGid}:${twin}`, "1", { expirationTtl: 30 }))
  );
}

/** Check if this story event is a twin of a task change that landed within the last 30s
 * (possibly in a previous delivery). Returns true if the story should be dropped. */
export async function isCrossDeliveryStoryTwin(ev: AsanaEvent, env: Env): Promise<boolean> {
  if (ev.resource.resource_type !== "story") return false;
  if (ev.action !== "added") return false;
  const subtype = ev.resource.resource_subtype;
  if (!subtype) return false;
  if (!ev.parent?.gid) return false;
  const hit = await env.STATE.get(`recent_task_change:${ev.parent.gid}:${subtype}`);
  return hit === "1";
}

/** Call BEFORE every bridge write to Asana. Covers side-effect fields. */
export async function markEcho(taskGid: string, field: string, env: Env): Promise<void> {
  const fields = FIELD_SIDE_EFFECTS[field] || [field];
  await Promise.all(
    fields.map(f => env.STATE.put(`echo:${taskGid}:${f}`, "1", { expirationTtl: 60 }))
  );
}

export interface EchoAudit {
  layer1_user_match: boolean;
  layer2_echo_hit: boolean;
  would_suppress: boolean;
  field: string | null;
  task_gid: string | null;
}

export async function checkEcho(ev: AsanaEvent, env: Env): Promise<EchoAudit> {
  const bridgeUserGid = env.BRIDGE_USER_GID || "";
  const userGid = ev.user?.gid ?? null;
  const layer1 = bridgeUserGid !== "" && userGid !== null && userGid === bridgeUserGid;

  const isTask = ev.resource.resource_type === "task";
  const taskGid = isTask ? ev.resource.gid : null;
  const field = ev.change?.field ?? null;

  let layer2 = false;
  if (taskGid && field) {
    const hit = await env.STATE.get(`echo:${taskGid}:${field}`);
    if (hit) layer2 = true;
  }

  return {
    layer1_user_match: layer1,
    layer2_echo_hit: layer2,
    would_suppress: layer1 || layer2,
    field,
    task_gid: taskGid,
  };
}

/**
 * Story consolidation: a task `change.field=X` arriving alongside a story `subtype=STORY_TWIN[X]`
 * means the story is the parallel auto-event. Drop the story since the task event already covers it.
 *
 * Returns the set of story-event indices to drop (from `events[]`).
 */
export function findStoryTwinsToSkip(events: AsanaEvent[]): Set<number> {
  const toSkip = new Set<number>();

  // First pass: collect (task_gid, twin_subtype) pairs derived from task changes
  const taskChanges = new Set<string>();
  for (const ev of events) {
    if (ev.resource.resource_type === "task" && ev.change?.field) {
      const twins = STORY_TWINS[ev.change.field];
      if (twins) {
        for (const twin of twins) {
          taskChanges.add(`${ev.resource.gid}:${twin}`);
        }
      }
    }
  }

  // Second pass: find stories that match a twin lookup
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (
      ev.resource.resource_type === "story" &&
      ev.action === "added" &&
      ev.resource.resource_subtype &&
      ev.parent?.gid
    ) {
      const key = `${ev.parent.gid}:${ev.resource.resource_subtype}`;
      if (taskChanges.has(key)) {
        toSkip.add(i);
      }
    }
  }

  return toSkip;
}
