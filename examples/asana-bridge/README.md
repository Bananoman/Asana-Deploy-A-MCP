# asana-bridge

Cloudflare Worker bridging Asana ↔ Odoo `xmarts-genius` (Brain) + GitLab + xmarts_docs.

**Phase 1 (current): CAPTURE-ONLY.** No writeback. No flows. Validates webhook payload shape empirically before Phase 3+ build.

**Pattern source:** [`ClickUpMCP/examples/odoo-bridge/`](../../../ClickUpMCP/examples/odoo-bridge/) — proven live at `xmarts.blog/clickup-webhook`. Cloned/adapted per `Xmarts/_strategy/ASANA_WORKER_DESIGN_v0.2.md`.

---

## Routes (Phase 1)

| Route | Method | Purpose |
|---|---|---|
| `/asana-webhook-test/healthz` | GET | env probe + KV reachability + last delivery TS |
| `/asana-webhook-test?webhook_gid=<gid>` | POST | Asana webhook handshake + delivery capture |
| `/asana-webhook-test/ido-test/<shared-secret>` | POST | break-glass iDO (default disabled via `ENABLE_IDO=false`) |

No cron triggers in Phase 1.

---

## Setup (first deploy)

```bash
cd /Volumes/External\ SSD/Development/Repositorios\ RMT/Asana-Deploy-A-MCP/examples/asana-bridge

# 1. Verify wrangler is installed + logged in to Cloudflare account
npx wrangler whoami

# 2. Create 3 KV namespaces — paste returned IDs into wrangler.toml
npx wrangler kv namespace create CAPTURE_LOG
npx wrangler kv namespace create HOOK_SECRETS
npx wrangler kv namespace create STATE
# Edit wrangler.toml [[kv_namespaces]] entries with returned IDs

# 3. Set secrets — never commit
npx wrangler secret put ASANA_TOKEN
# Paste the ASANA_TOKEN value from /Volumes/External SSD/Development/Xmarts/.env line 29
# (Ximena's PAT for workspace Xmarts Group LLC — = Rubén dev identity per 2026-05-25)

# 4. Deploy
npx wrangler deploy
# Expected output:
#   Deployed asana-webhook-xmarts triggers
#   route: xmarts.blog/asana-webhook-test*

# 5. Smoke test the worker
curl -s https://xmarts.blog/asana-webhook-test/healthz | jq
# Expected response shape:
# {
#   "version": "0.1.0-capture",
#   "worker_enabled": true,
#   "env": { "ASANA_WORKSPACE_GID": true, "TEST_PROJECT_GID": true, ... },
#   "kv": { "CAPTURE_LOG": true, "HOOK_SECRETS": true, "STATE": true },
#   "phase": "1-capture-only",
#   "flows_disabled": "ALL",
#   "dry_run": true
# }
```

---

## Create webhook subscription scoped to test project

Once the worker is live, register the Asana webhook from the MCP (Claude can do this):

```typescript
mcp__asana_xmarts__create_webhook({
  resource: "1215111495561363",  // 🤖 BRIDGE TEST [SANDBOX] project_gid
  target: "https://xmarts.blog/asana-webhook-test?webhook_gid=AUTO",
  filters: [
    // Capture broad spectrum for empirical analysis
    { resource_type: "task", action: "added" },
    { resource_type: "task", action: "changed" },
    { resource_type: "task", action: "removed" },
    { resource_type: "task", action: "deleted" },
    { resource_type: "story", action: "added" },
    { resource_type: "project", action: "changed" },
  ]
})
```

Asana will immediately POST a handshake; the worker echoes `X-Hook-Secret`, persists it to KV, and returns 200. Subsequent deliveries are HMAC-verified.

**Important:** Replace `webhook_gid=AUTO` with the actual GID returned by `create_webhook` (we cannot know it until the response). Update the webhook's `target` URL after first create — OR use a single fixed `webhook_gid` per environment in the URL since Phase 1 has only one webhook.

For Phase 1 simplicity, use `webhook_gid=test`:
```
target: "https://xmarts.blog/asana-webhook-test?webhook_gid=test"
```

---

## Capture loop — Phase 1 acceptance criteria

Goal: 50+ deliveries from real user activity in the test project.

```bash
# Trigger events manually (via MCP or Asana UI):
mcp__asana_xmarts__create_task({ name: "test task 1", projects: ["1215111495561363"] })
mcp__asana_xmarts__update_task({ task_gid: "...", custom_fields: { ... } })
mcp__asana_xmarts__add_task_comment({ task_gid: "...", text: "rapid edit test" })
# ... repeat ~50 events
```

Then inspect logs:

```bash
# Live stream of captured events
npx wrangler tail

# KV dump — every captured payload
npx wrangler kv key list --binding=CAPTURE_LOG | head -50

# Specific delivery payload
npx wrangler kv key get --binding=CAPTURE_LOG "delivery:2026-05-25T16:30:00Z:<uuid>"
```

**Pass criteria:**
1. Handshake completes successfully (1 KV entry of type `handshake`)
2. ≥50 deliveries captured of type `delivery`
3. Zero `bad_signature` entries (HMAC verify working)
4. Heartbeat empty events visible (after 8h soak — separate validation)
5. Payload shape validated:
   - `events[].resource.gid` always present
   - `events[].action` enum values captured (`added`/`changed`/`removed`/`deleted`)
   - `events[].change.field` granularity confirmed
   - Story consolidation behavior observed (delete a comment right after creating)
   - Batching behavior observed (10 rapid edits → 1 delivery with array vs 10 deliveries)

---

## Kill switches (defense in depth)

| Switch | Where | Activation | Recovery |
|---|---|---|---|
| `WORKER_ENABLED=false` (KV `STATE`) | Runtime | `npx wrangler kv key put --binding=STATE WORKER_ENABLED false` | Set to `true` or delete |
| Re-deploy with body changes | wrangler.toml | Edit + `npx wrangler deploy` | New deploy |
| `mcp__asana__delete_webhook(gid)` | Asana side | Removes subscription entirely | Re-create |

---

## Anti-patterns enforced (Phase 1 minimal)

1. **`WORKER_ENABLED` KV kill** — runtime emergency 503 (no redeploy)
2. **DRY_RUN built-in** — no writeback API calls at all in Phase 1
3. **No flows** — registry empty; nothing dispatches
4. **HMAC hard-fail closed** — missing secret → 503, not silent acceptance
5. **`ENABLE_IDO=false` default** — break-glass path explicit + behind shared secret
6. **Capture log TTL 7d** — auto-cleanup, no orphan KV pollution

Full 23-pattern list lands in Phase 3+ (production Worker). See `Xmarts/_strategy/ASANA_WORKER_DESIGN_v0.2.md`.

---

## Phase 1 → Phase 2 graduation gate

Before adding ANY writeback flow:
1. Phase 1 capture acceptance criteria PASS (see above)
2. Echo suppression test harness PASS (Phase 2)
3. Dedup key format finalized empirically (update spec to v0.3)
4. Workers Paid bundle ($5/mo) provisioned — required for Durable Objects (Phase 3+)
5. `asana_bridge@xmarts.com` technical user created (Phase 4 prod — Phase 1-3 use Ximena's token)

---

## References

- Spec: `/Volumes/External SSD/Development/Xmarts/_strategy/ASANA_WORKER_DESIGN_v0.2.md`
- Pattern: `/Volumes/External SSD/Development/Repositorios RMT/ClickUpMCP/examples/odoo-bridge/`
- Asana webhooks spec: https://developers.asana.com/docs/webhooks-guide
- ClickUp Worker live: `https://xmarts.blog/clickup-webhook` (since 2026-05-20)
- Memory: `feedback_ximena_eduardo_ruben_same_dev_identity`, `feedback_never_inline_credentials`
