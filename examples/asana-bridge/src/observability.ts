/**
 * Structured capture log + JSON logging for forensics + Phase 1/2/3 correlation.
 * All worker activity persisted to CAPTURE_LOG KV with 7d TTL.
 */
import type { Env } from "./types";

export async function captureLog(env: Env, entry: Record<string, unknown>): Promise<void> {
  const key = `delivery:${new Date().toISOString()}:${crypto.randomUUID()}`;
  await env.CAPTURE_LOG.put(key, JSON.stringify(entry), {
    expirationTtl: 86400 * 7,
  });
  // Mirror to console for `wrangler tail`
  console.log(JSON.stringify({ event: "captured", key, type: entry.type ?? "?" }));
}

export function structuredLog(level: "info" | "warn" | "error", msg: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level, msg, ts: new Date().toISOString(), ...fields }));
}
