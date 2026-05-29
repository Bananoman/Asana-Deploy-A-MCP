/**
 * Asana Rules API — support shim.
 *
 * Asana's PUBLIC REST API does not expose CRUD for automation Rules.
 * The ONLY rules endpoint Asana documents is:
 *
 *     POST /rule_triggers/{rule_trigger_gid}/run
 *
 * ...and it only fires rules whose trigger is an "incoming web request" (API trigger).
 * Listing, reading, creating, updating, deleting, cloning, or bulk-managing rules is
 * UI-only (Project ▸ Customize ▸ Rules) or done with Script Actions (Enterprise+).
 *
 * Earlier versions of this server shipped tools that POST/GET/PUT/DELETE against
 * /projects/{gid}/rules and /rules/{gid} — paths that DO NOT EXIST, so every call
 * returned a confusing raw 404 ("No matching route for request"). Those handlers now
 * fail loudly and honestly via rulesApiUnsupported() instead.
 *
 * Ref: https://developers.asana.com/reference/rules
 *      https://developers.asana.com/reference/triggerrule
 *
 * @module _rules-api-support
 */

const RULES_API_NOTE =
  "Asana's public API exposes no list/get/create/update/delete for Rules — only " +
  'POST /rule_triggers/{rule_trigger_gid}/run (see trigger_rule). Manage rules in the ' +
  'Asana UI (Project ▸ Customize ▸ Rules) or with Script Actions (Enterprise+). ' +
  'Ref: https://developers.asana.com/reference/rules';

/**
 * Build a clear, structured error for a rules operation Asana's API cannot perform.
 * server.js surfaces error.message + error.code to the client.
 * @param {string} operation human-readable operation, e.g. "Listing project rules"
 */
function rulesApiUnsupported(operation) {
  const err = new Error(`${operation} is not supported by the Asana API. ${RULES_API_NOTE}`);
  err.code = 'ASANA_RULES_API_UNSUPPORTED';
  err.status = 501; // not retryable
  err.unsupported = true;
  return err;
}

/**
 * Safely fetch a project's rules for advisory/scoring tools.
 * Because no list endpoint exists, this always reports rules as NOT measurable —
 * callers must treat ruleCount as unknown (null), never as a confirmed 0.
 * Kept as a function so that if Asana ever ships a real endpoint we flip it here once.
 * @returns {Promise<{data: any[], measurable: boolean}>}
 */
async function fetchProjectRulesSafe() {
  return { data: [], measurable: false };
}

module.exports = { RULES_API_NOTE, rulesApiUnsupported, fetchProjectRulesSafe };
