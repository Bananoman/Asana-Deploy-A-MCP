/**
 * Story consolidation guard.
 *
 * Two distinct concerns:
 * 1. STORY TWINS — auto-generated stories that mirror a task change (handled in echo.ts
 *    via `findStoryTwinsToSkip`). Drop the story, dispatch only the task event.
 *
 * 2. ORPHAN STORIES — system-generated stories (user=null) whose parent.gid points to
 *    a resource that no longer exists (most commonly `trashed` story arriving after a
 *    task delete, with parent = the deleted task). API fetch returns 404 → drop to dead-letter.
 *
 * EMPIRICAL §3 + Phase 1A finding 10: trashed story arrives 0.5s after task deletion in a
 * separate delivery, with parent pointing to the now-deleted task.
 */
import type { AsanaEvent, Env } from "./types";
import { captureLog } from "./observability";

interface AsanaApiClient {
  getTaskExists(taskGid: string): Promise<boolean>;
}

export async function isOrphanStory(
  ev: AsanaEvent,
  api: AsanaApiClient,
  env: Env
): Promise<boolean> {
  if (ev.resource.resource_type !== "story") return false;
  if (ev.user !== null) return false;  // user-generated story; not an orphan candidate
  if (!ev.parent?.gid) return false;

  const exists = await api.getTaskExists(ev.parent.gid);
  if (!exists) {
    await captureLog(env, {
      type: "dead_letter",
      reason: "orphan_story",
      event: ev,
      received_at: new Date().toISOString(),
    });
    return true;
  }
  return false;
}
