/**
 * Asana REST API client — typed wrapper.
 *
 * Phase 3 scope: read-only helpers (getTaskExists for orphan check). Writes happen
 * exclusively via `routes/bridge-write` to keep the markEcho-before-write invariant
 * enforced in one place.
 */
import type { Env } from "./types";
import { markEcho } from "./echo";

const BASE = "https://app.asana.com/api/1.0";

export interface AsanaApi {
  getTaskExists(taskGid: string): Promise<boolean>;
  putTaskField(taskGid: string, field: string, value: unknown): Promise<{ status: number; body: string }>;
}

export function makeAsanaApi(env: Env): AsanaApi {
  const headers = {
    "Authorization": `Bearer ${env.ASANA_TOKEN}`,
    "Accept": "application/json",
  };

  return {
    async getTaskExists(taskGid: string): Promise<boolean> {
      const resp = await fetch(`${BASE}/tasks/${taskGid}?opt_fields=gid`, { headers });
      if (resp.status === 200) return true;
      if (resp.status === 404) return false;
      // 401/403 etc → throw (caller should not assume non-existence)
      throw new Error(`Asana getTask failed: ${resp.status}`);
    },

    async putTaskField(taskGid: string, field: string, value: unknown): Promise<{ status: number; body: string }> {
      // INVARIANT: mark echo BEFORE the write
      await markEcho(taskGid, field, env);

      const dataPayload: Record<string, unknown> = {};
      dataPayload[field] = value;

      const resp = await fetch(`${BASE}/tasks/${taskGid}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataPayload }),
      });

      const body = await resp.text();
      return { status: resp.status, body };
    },
  };
}
