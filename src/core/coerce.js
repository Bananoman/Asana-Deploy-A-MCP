/**
 * Input coercion helpers for MCP tool handlers.
 *
 * LLM/MCP clients sometimes serialize array-typed parameters as a JSON-encoded
 * string (e.g. '["a","b"]') or a comma-separated string instead of a real array.
 * Handlers that iterate such a value then treat the JSON string character-by-character
 * — the root cause of the May 2026 bug where create_project_with_structure created one
 * section per character and add_project_members POSTed a stringified array that the
 * Asana API rejected. coerceStringArray() normalizes the value to a real string array
 * so handlers behave correctly regardless of how the client serialized it.
 *
 * @module core/coerce
 */

/**
 * Normalize a value that should be an array of strings.
 * - real array            → returned as-is
 * - null / undefined / '' → []
 * - '["a","b"]'           → ["a","b"]   (JSON-encoded array)
 * - 'a, b , c'            → ["a","b","c"] (comma-separated)
 * - any other scalar      → [value]
 *
 * @param {*} value
 * @returns {Array}
 */
function coerceStringArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    const s = value.trim();
    if (s === '') return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {
        // not valid JSON — fall through to comma-split
      }
    }
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [value];
}

module.exports = { coerceStringArray };
