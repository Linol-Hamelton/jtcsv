/**
 * Phase 2 Week 5 — Core M6 actionable error messages.
 *
 * Locks the user-facing shape of every ParsingError factory: the message
 * carries line / column when known, the offending Value when relevant,
 * and a Hint pointing at the most likely fix.
 *
 * These tests document the contract — a refactor that drops a hint or
 * mangles the message format fails here loud.
 */
import { describe, test, expect } from '@jest/globals';
import { ParsingError } from '../errors';

describe('ParsingError — locational details', () => {
  test('plain message — no line, no column, no hint', () => {
    const e = new ParsingError('plain failure');
    expect(e.message).toBe('plain failure');
    expect(e.lineNumber).toBeNull();
    expect(e.column).toBeNull();
    expect(e.value).toBeNull();
    expect(e.hint).toBeUndefined();
  });

  test('line + column appear in the message in the documented order', () => {
    const e = new ParsingError('boom', 42, 7);
    expect(e.message).toBe('boom at line 42, column 7');
    expect(e.lineNumber).toBe(42);
    expect(e.column).toBe(7);
  });

  test('line alone (no column) appears without a comma column suffix', () => {
    const e = new ParsingError('boom', 42);
    expect(e.message).toBe('boom at line 42');
    expect(e.message).not.toContain('column');
  });

  test('context, expected, actual stack in their documented order', () => {
    const e = new ParsingError('shape mismatch', 5, null, 'a,b,c', '3 fields', '4 fields');
    expect(e.message).toContain('shape mismatch at line 5');
    expect(e.message).toContain('Context: a,b,c');
    expect(e.message).toContain('Expected: 3 fields');
    expect(e.message).toContain('Actual: 4 fields');
    // Documented order: Context, Expected, Actual
    const ctxIdx = e.message.indexOf('Context:');
    const expIdx = e.message.indexOf('Expected:');
    const actIdx = e.message.indexOf('Actual:');
    expect(ctxIdx).toBeLessThan(expIdx);
    expect(expIdx).toBeLessThan(actIdx);
  });
});

describe('ParsingError — value + hint extensions (Core M6)', () => {
  test('value field is stored and rendered as JSON-quoted', () => {
    const e = new ParsingError('bad cell', 3, 2, null, null, null, { value: 'hi\nthere' });
    expect(e.value).toBe('hi\nthere');
    expect(e.message).toContain('Value: "hi\\nthere"');  // JSON-escaped
  });

  test('value > 200 chars is truncated with an ellipsis', () => {
    const long = 'x'.repeat(500);
    const e = new ParsingError('long', null, null, null, null, null, { value: long });
    expect(e.value!.length).toBe(201);
    expect(e.value!.endsWith('…')).toBe(true);
  });

  test('hint appears at the end of the message, prefixed with "Hint:"', () => {
    const e = new ParsingError('thing', 1, null, null, null, null, {
      hint: 'try option X',
    });
    expect(e.message).toMatch(/Hint: try option X$/);
    expect(e.hint).toBe('try option X');
  });

  test('full shape: line + value + hint render in canonical order', () => {
    const e = new ParsingError('cell broke', 7, 3, null, null, null, {
      value: 'NaN',
      hint: 'pass parseNumbers: false',
    });
    expect(e.message).toBe(
      'cell broke at line 7, column 3\nValue: "NaN"\nHint: pass parseNumbers: false',
    );
  });
});

describe('ParsingError factory methods carry hints', () => {
  test('csvFormat() — accepts and renders an optional hint', () => {
    const e = ParsingError.csvFormat('bad', 1, 1, 'a,b', 'use --delimiter=;');
    expect(e.message).toContain('CSV format error: bad');
    expect(e.message).toMatch(/Hint: use --delimiter=;$/);
  });

  test('fieldCountMismatch — too few fields → suggests repairRowShifts', () => {
    const e = ParsingError.fieldCountMismatch(4, 2, 5, 'a,b');
    expect(e.message).toContain('Field count mismatch at line 5');
    expect(e.message).toContain('Expected: 4 fields');
    expect(e.message).toContain('Actual: 2 fields');
    expect(e.hint).toContain('repairRowShifts');
    expect(e.message).toMatch(/Hint:.*repairRowShifts/);
  });

  test('fieldCountMismatch — too many fields → suggests unquoted-delimiter check', () => {
    const e = ParsingError.fieldCountMismatch(2, 5, 7, 'a,b,c,d,e');
    expect(e.hint).toContain('more fields than the header');
    expect(e.hint).toContain('unquoted delimiter');
  });

  test('unclosedQuotes — hint mentions both missing-quote and missing-escape causes', () => {
    const e = ParsingError.unclosedQuotes(3, 12, '"abc');
    expect(e.message).toContain('Unclosed quotes');
    expect(e.message).toContain('at line 3, column 12');
    expect(e.hint).toMatch(/closing `"`/);
    expect(e.hint).toMatch(/escaped as `""`/);
  });

  test('invalidDelimiter — hint suggests autoDetect or known single-char delimiters', () => {
    const e = ParsingError.invalidDelimiter('||', 1, 'context here');
    expect(e.message).toContain("Invalid delimiter '||'");
    expect(e.hint).toContain('single character');
    expect(e.hint).toContain('autoDetect');
  });

  test('cellValue — captures the offending cell and a custom hint', () => {
    const e = ParsingError.cellValue(
      'cell could not be coerced',
      'not-a-date',
      4,
      2,
      'set parseDates: false or use a custom transform',
    );
    expect(e.value).toBe('not-a-date');
    expect(e.message).toContain('cell could not be coerced at line 4, column 2');
    expect(e.message).toContain('Value: "not-a-date"');
    expect(e.message).toContain('Hint: set parseDates: false');
  });

  test('fastPathBailout — surfaces a content snippet AND directs to useFastPath:false', () => {
    const e = ParsingError.fastPathBailout(
      'header row contained a candidate delimiter but was not split correctly',
      'a,b,c,d',
    );
    expect(e.message).toContain('Fast-path parser bailout');
    expect(e.message).toContain('header row contained');
    expect(e.message).toContain('Content snippet: "a,b,c,d"');
    expect(e.hint).toContain('useFastPath: false');
    expect(e.hint).toContain('standard quote-aware parser');
  });
});

describe('ParsingError JSON serialization stability', () => {
  // Errors get caught, logged, sometimes JSON.stringify'd into a
  // structured log. Lock the toString() and structured-field shape so
  // log-parsing pipelines downstream don't break on a refactor.
  test('toString() includes class name + detailed message', () => {
    const e = new ParsingError('boom', 1, 2);
    expect(e.toString()).toBe('ParsingError: boom at line 1, column 2');
  });

  test('all locational fields are own-enumerable for log inspection', () => {
    const e = ParsingError.fieldCountMismatch(3, 2, 10, 'a,b');
    expect(e.lineNumber).toBe(10);
    expect(e.expected).toBe('3 fields');
    expect(e.actual).toBe('2 fields');
    expect(typeof e.hint).toBe('string');
  });
});
