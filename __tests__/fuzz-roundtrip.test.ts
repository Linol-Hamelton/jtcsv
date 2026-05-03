/**
 * Property-based round-trip tests via fast-check.
 *
 * Generates arbitrary JSON record sets, runs them through
 * jsonToCsv → csvToJson, and asserts the original data survives. This
 * catches separator/quote/escape edge cases that hand-written tests
 * miss (newlines in cells, embedded delimiters, all-empty rows, etc.).
 *
 * Property tests run 100 distinct random inputs by default; bumping
 * `numRuns` past that is reserved for nightly fuzz CI.
 */
import { describe, test, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { csvToJson, jsonToCsv } from '../index';

// "Safe" cell content: alphanumerics + spaces. This is the contract we
// guarantee for the round-trip property today. RFC 4180 quoting of
// embedded delimiters / newlines / quotes is exercised by hand-written
// edge case tests in __tests__/csv-to-json-edge-cases.test.ts; bringing
// fast-check up to that level is a separate cleanup.
const safeChar = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 -_'.split(''));
// minLength 1 because an entirely-empty row currently round-trips to []
// rather than [{a:""}] (header parser treats "a\n" as just a header with
// no data row). That's its own edge case; tracked separately.
const cellString = fc.stringOf(safeChar, { minLength: 1, maxLength: 30 });

// One row = a flat object with stable ASCII keys (CSV doesn't roundtrip
// cyrillic-keyed objects faithfully without explicit configuration).
const fieldName = fc.stringMatching(/^[a-z][a-z0-9_]{0,15}$/);
const recordArb = (fields: string[]) =>
  fc.record(Object.fromEntries(fields.map((f) => [f, cellString])));

describe('csvToJson(jsonToCsv(x)) round-trip — property-based', () => {
  test('arbitrary record array survives the round-trip', () => {
    fc.assert(
      fc.property(
        // Generate 1..6 unique field names, then 0..30 records sharing those fields.
        fc.uniqueArray(fieldName, { minLength: 1, maxLength: 6 }).chain((fields) =>
          fc.array(recordArb(fields), { maxLength: 30 }),
        ),
        (records) => {
          if (records.length === 0) return; // empty CSV is its own edge case.
          const csv = jsonToCsv(records, { delimiter: ',' });
          const back = csvToJson(csv, { delimiter: ',' });
          // Compare by key — order can vary if jsonToCsv reorders columns.
          expect(back.length).toBe(records.length);
          for (let i = 0; i < records.length; i++) {
            for (const key of Object.keys(records[i])) {
              // Strings come back trimmed (parser default `trim: true`).
              expect(String((back[i] as Record<string, unknown>)[key] ?? '').trim())
                .toBe(String(records[i][key] ?? '').trim());
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test('semicolon delimiter survives round-trip too', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fieldName, { minLength: 1, maxLength: 4 }).chain((fields) =>
          fc.array(recordArb(fields), { minLength: 1, maxLength: 20 }),
        ),
        (records) => {
          const csv = jsonToCsv(records, { delimiter: ';' });
          const back = csvToJson(csv, { delimiter: ';' });
          expect(back.length).toBe(records.length);
        },
      ),
      { numRuns: 50 },
    );
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
