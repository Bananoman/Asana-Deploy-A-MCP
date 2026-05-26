/**
 * Idempotency via Durable Object.
 *
 * Why DO and not KV: KV is eventually consistent across colos. Same compound key
 * arriving twice from same colo within ms can race past the get→put gap. DO
 * `idFromName(dedupKey)` provides single-writer serialization (one DO instance per key).
 *
 * Key format (LOCKED in `_strategy/ASANA_WORKER_DESIGN_v0.3.md` §1, empirically validated
 * 100% unique across 66 events Phase 1B): sha256(gid|subtype|action|parent.gid|change.field|created_at).slice(0,16)
 *
 * TTL: 24h — covers Asana exponential backoff retry window. Same key beyond 24h
 * = Asana spec violation, worth a log.
 */
import type { AsanaEvent, Env } from "./types";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildDedupKey(ev: AsanaEvent): Promise<string> {
  const parts = [
    ev.resource.gid,
    ev.resource.resource_subtype || "_",
    ev.action,
    ev.parent?.gid || "_",
    ev.change?.field || "_",
    ev.created_at,
  ].join("|");
  const hash = await sha256Hex(parts);
  return `seen:asana:${hash.slice(0, 16)}`;
}

/** Check + claim atomically via DO. Returns true if event was already seen. */
export async function isDuplicate(ev: AsanaEvent, env: Env): Promise<boolean> {
  const key = await buildDedupKey(ev);
  const id = env.DEDUP_DO.idFromName(key);
  const stub = env.DEDUP_DO.get(id);
  const resp = await stub.fetch(new Request("https://do/checkAndClaim", {
    method: "POST",
    body: key,
  }));
  const text = await resp.text();
  return text === "duplicate";
}

/**
 * Durable Object class — one instance per dedup key.
 * Storage: a single bool flag with 24h TTL via alarm.
 */
export class DedupDO {
  state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== "/checkAndClaim") {
      return new Response("Not found", { status: 404 });
    }

    const seen = await this.state.storage.get<boolean>("seen");
    if (seen) {
      return new Response("duplicate", { status: 200 });
    }

    await this.state.storage.put("seen", true);
    // 24h TTL via alarm — DO auto-evicts when alarm fires
    const ttl = Date.now() + 24 * 60 * 60 * 1000;
    await this.state.storage.setAlarm(ttl);
    return new Response("claimed", { status: 200 });
  }

  async alarm(): Promise<void> {
    // 24h elapsed — clear the flag so we don't accumulate storage
    await this.state.storage.deleteAll();
  }
}
