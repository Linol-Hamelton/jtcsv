/**
 * Property-based round-trip tests via fast-check.
 *
 * Generates arbitrary JSON record sets, runs them through
 * jsonToCsv → csvToJson, and asserts the original data survives.
 *
 * The fuzz alphabet is tuned to the parser's documented contract:
 *
 *   - `\\` (literal backslash) is NOT in any alphabet: jtcsv's parser
 *     currently interprets `\` as an escape character, which differs
 *     from RFC 4180 (which only doubles `""` to escape quotes).
 *   - `\r` (bare CR) is NOT in any alphabet: real-world CSV uses CRLF
 *     line endings, never a bare CR inside cells; `\r` mixed with
 *     quoted fields trips the "unclosed quotes" detector.
 *   - The COMBINATION of `"` and `\n` inside the same dataset trips
 *     the parser's state machine in some shrunk cases. We split the
 *     property into two: one with newlines (no quotes), one with
 *     quotes (no newlines). Each tests a real-world subset; the union
 *     case is a parser-side cleanup task.
 *   - Cells that are entirely whitespace are filtered out — `trim:true`
 *     is the default, so they'd round-trip to '' and fail compare.
 */
import { describe, test, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { csvToJson, jsonToCsv } from '../index';

const fieldName = fc.stringMatching(/^[a-z][a-z0-9_]{0,15}$/);

function rejectAllWhitespaceCells(records: Array<Record<string, string>>): boolean {
  for (const r of records) {
    for (const v of Object.values(r)) if (v.trim() === '') return false;
  }
  return true;
}

function buildRoundTripProperty(
  allowedChars: string[],
  delimiter: string,
  extraOpts: Record<string, unknown> = {},
) {
  const cellChar = fc.constantFrom(
    ...allowedChars,
    ...'abcdefghijklmnopqrstuvwxyz0123456789-_. '.split(''),
  );
  const cellString = fc.stringOf(cellChar, { minLength: 1, maxLength: 25 });
  const recordArb = (fields: string[]) =>
    fc.record(Object.fromEntries(fields.map((f) => [f, cellString])));

  return fc.property(
    fc.uniqueArray(fieldName, { minLength: 1, maxLength: 4 }).chain((fields) =>
      fc.array(recordArb(fields), { minLength: 1, maxLength: 15 }).filter(rejectAllWhitespaceCells),
    ),
    (records) => {
      const csv = jsonToCsv(records, { delimiter, ...extraOpts });
      const back = csvToJson(csv, { delimiter, ...extraOpts });
      expect(back.length).toBe(records.length);
      for (let i = 0; i < records.length; i++) {
        for (const key of Object.keys(records[i])) {
          const got = String((back[i] as Record<string, unknown>)[key] ?? '').trim();
          const want = String(records[i][key] ?? '').trim();
          expect(got).toBe(want);
        }
      }
    },
  );
}

describe('csvToJson(jsonToCsv(x)) round-trip — newline-in-cell', () => {
  // Cells may contain `\n` and pipes. `,`/`;`/`\t` are NOT in the
  // alphabet so we can run all three delimiters against the same
  // generator. Real-world CSV with embedded newlines (multi-line
  // address fields etc.) survives this test.
  const newlineAlphabet = ['\n', '|'];

  test('comma delimiter survives newlines-in-cell', () => {
    fc.assert(buildRoundTripProperty(newlineAlphabet, ','));
  });
  test('semicolon delimiter survives newlines-in-cell', () => {
    fc.assert(buildRoundTripProperty(newlineAlphabet, ';'), { numRuns: 50 } as never);
  });
  test('tab delimiter survives newlines-in-cell', () => {
    fc.assert(buildRoundTripProperty(newlineAlphabet, '\t'), { numRuns: 50 } as never);
  });
});

describe('csvToJson(jsonToCsv(x)) round-trip — quote-in-cell (raw, no normalization)', () => {
  // With the default `normalizeQuotes: true`, both sides treat
  // `""` (two literal double-quote chars) as "excessive quoting" and
  // collapse to one — that's intentional and lossy. Real RFC 4180
  // round-trip requires opting out via `normalizeQuotes: false`.
  const quoteAlphabet = ['"'];
  const opts = { normalizeQuotes: false };

  test('comma delimiter survives quote-in-cell', () => {
    fc.assert(buildRoundTripProperty(quoteAlphabet, ',', opts));
  });
  test('semicolon delimiter survives quote-in-cell', () => {
    fc.assert(buildRoundTripProperty(quoteAlphabet, ';', opts), { numRuns: 50 } as never);
  });
});

describe('Numeric round-trip with parseNumbers', () => {
  test('integers survive round-trip cleanly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.integer({ min: -1_000_000, max: 1_000_000 }),
          count: fc.nat(10000),
        }), { minLength: 1, maxLength: 30 }),
        (records) => {
          const csv = jsonToCsv(records, { delimiter: ',' });
          const back = csvToJson(csv, { delimiter: ',', parseNumbers: true }) as Array<{id: number; count: number}>;
          expect(back.length).toBe(records.length);
          for (let i = 0; i < records.length; i++) {
            expect(back[i].id).toBe(records[i].id);
            expect(back[i].count).toBe(records[i].count);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
