const { coerceStringArray } = require('../src/core/coerce');

describe('coerceStringArray — array param normalization', () => {
  test('passes a real array through unchanged', () => {
    expect(coerceStringArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  test('parses a JSON-encoded array string (the section/member bug)', () => {
    expect(coerceStringArray('["🚀 Onboarding", "🔍 Diagnóstico"]'))
      .toEqual(['🚀 Onboarding', '🔍 Diagnóstico']);
  });

  test('splits a comma-separated string', () => {
    expect(coerceStringArray('123, 456 , 789')).toEqual(['123', '456', '789']);
  });

  test('null / undefined / empty string → empty array', () => {
    expect(coerceStringArray(null)).toEqual([]);
    expect(coerceStringArray(undefined)).toEqual([]);
    expect(coerceStringArray('')).toEqual([]);
    expect(coerceStringArray('   ')).toEqual([]);
  });

  test('wraps a non-array, non-string scalar', () => {
    expect(coerceStringArray(42)).toEqual([42]);
  });

  test('a JSON array string never iterates character-by-character', () => {
    const result = coerceStringArray('["x","y","z"]');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    // regression guard: must NOT be 13 single characters of the raw string
    expect(result).not.toContain('[');
    expect(result).not.toContain('"');
  });
});
