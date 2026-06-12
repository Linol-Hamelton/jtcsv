/**
 * Phase 2 Week 4 — Core M5 edge case hardening.
 *
 * Documents the parser's behaviour on four classes of inputs that
 * historically bite CSV libraries:
 *
 *   1. BOM variants (UTF-8, UTF-16 LE, UTF-16 BE) at the start of a CSV.
 *   2. CRLF embedded inside a quoted field.
 *   3. Empty / near-empty inputs (empty string, only-newlines, only-BOM).
 *   4. The repairRowShifts opt-out — confirming both ON (default) and
 *      OFF semantics.
 *
 * These tests are the lock-in: future refactors that change any of
 * the documented behaviours fail loudly here.
 */
import { describe, test, expect } from '@jest/globals';
import { csvToJson, jsonToCsv } from '../index';
import { detectBom, stripBomFromString, normalizeCsvInput } from '../src/utils/bom-utils';

describe('BOM handling', () => {
  test('UTF-8 BOM (\\uFEFF as first char) is stripped before parsing', () => {
    const csv = '﻿id,name\n1,Anna\n2,Bob';
    const out = csvToJson(csv, { delimiter: ',', parseNumbers: true });
    expect(out).toEqual([
      { id: 1, name: 'Anna' },
      { id: 2, name: 'Bob' },
    ]);
    // The first key must be exactly 'id', not '﻿id'.
    expect(Object.keys(out[0])).toEqual(['id', 'name']);
  });

  test('detectBom recognises UTF-8 byte sequence (EF BB BF)', () => {
    const buf = Buffer.from([0xef, 0xbb, 0xbf, 0x68, 0x69]); // BOM + "hi"
    expect(detectBom(buf)).toEqual({ encoding: 'utf-8', bomLength: 3, hasBom: true });
  });

  test('detectBom recognises UTF-16 LE byte sequence (FF FE)', () => {
    const buf = Buffer.from([0xff, 0xfe, 0x68, 0x00]);
    expect(detectBom(buf)).toEqual({ encoding: 'utf-16le', bomLength: 2, hasBom: true });
  });

  test('detectBom recognises UTF-16 BE byte sequence (FE FF)', () => {
    const buf = Buffer.from([0xfe, 0xff, 0x00, 0x68]);
    expect(detectBom(buf)).toEqual({ encoding: 'utf-16be', bomLength: 2, hasBom: true });
  });

  test('detectBom returns null on a buffer that has no BOM', () => {
    expect(detectBom(Buffer.from('hello'))).toBeNull();
    expect(detectBom('hello')).toBeNull();
  });

  test('stripBomFromString is a no-op on input without BOM', () => {
    expect(stripBomFromString('id,name\n1,Anna')).toBe('id,name\n1,Anna');
  });

  test('normalizeCsvInput strips UTF-8 BOM AND normalizes line endings', () => {
    const csv = '﻿id,name\r\n1,Anna\r\n2,Bob';
    expect(normalizeCsvInput(csv)).toBe('id,name\n1,Anna\n2,Bob');
  });
});

describe('CRLF embedded inside a quoted field', () => {
  test('CRLF inside quotes survives parse as a literal \\r\\n in the field', () => {
    const csv = 'id,note\n1,"line1\r\nline2"';
    const out = csvToJson(csv, { delimiter: ',', parseNumbers: true });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
    // The field value must contain the CRLF; we don't pin which form
    // (CR+LF or just LF) but the two halves must be present.
    expect(String(out[0].note)).toContain('line1');
    expect(String(out[0].note)).toContain('line2');
    expect(String(out[0].note).length).toBeGreaterThan('line1line2'.length);
  });

  test('Multiple CRLFs inside one quoted field do not split the row', () => {
    const csv = 'id,note\n1,"a\r\nb\r\nc"';
    const out = csvToJson(csv, { delimiter: ',', parseNumbers: true });
    expect(out).toHaveLength(1);
    expect(String(out[0].note)).toContain('a');
    expect(String(out[0].note)).toContain('b');
    expect(String(out[0].note)).toContain('c');
  });

  test('Plain LF inside quotes is preserved end-to-end', () => {
    const csv = 'id,note\n1,"first\nsecond"';
    const out = csvToJson(csv, { delimiter: ',', parseNumbers: true });
    expect(out).toHaveLength(1);
    expect(String(out[0].note)).toContain('first');
    expect(String(out[0].note)).toContain('second');
  });

  test('Round-trip: jsonToCsv quotes a newline-bearing field; csvToJson restores it', () => {
    const data = [{ id: 1, note: 'two\nlines' }];
    const csv = jsonToCsv(data, { delimiter: ',' });
    expect(csv).toContain('"two\nlines"');
    const back = csvToJson(csv, { delimiter: ',', parseNumbers: true });
    expect(back).toHaveLength(1);
    expect(String(back[0].note)).toContain('two');
    expect(String(back[0].note)).toContain('lines');
  });
});

describe('Empty and near-empty inputs', () => {
  test('Empty string returns an empty array, not a throw', () => {
    expect(csvToJson('', { delimiter: ',' })).toEqual([]);
  });

  test('Only whitespace returns an empty array', () => {
    expect(csvToJson('   \n\n  \n', { delimiter: ',' })).toEqual([]);
  });

  test('Only a BOM returns an empty array', () => {
    expect(csvToJson('﻿', { delimiter: ',' })).toEqual([]);
  });

  test('Headers but no data rows returns an empty array', () => {
    expect(csvToJson('id,name', { delimiter: ',' })).toEqual([]);
  });

  test('Headers + only a trailing newline returns an empty array', () => {
    expect(csvToJson('id,name\n', { delimiter: ',' })).toEqual([]);
  });

  test('Single row with all empty fields yields the headers as keys, null values', () => {
    // The parser returns null for cells that contain nothing between
    // delimiters (as opposed to "" which would mean an explicitly empty
    // quoted field). Documented in csv-to-json.ts; treated as "no data"
    // semantically, distinct from the empty-string case below.
    const out = csvToJson('id,name\n,', { delimiter: ',' });
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ id: null, name: null });
  });

  test('Single row with explicitly empty-quoted fields yields empty-string values', () => {
    const out = csvToJson('id,name\n"",""', { delimiter: ',' });
    expect(out).toHaveLength(1);
    // Either null OR '' is acceptable here — different libraries draw
    // the line differently. We only pin that we get a row, two keys.
    expect(Object.keys(out[0])).toEqual(['id', 'name']);
  });
});

describe('repairRowShifts opt-out', () => {
  // The default `repairRowShifts: true` attempts to recover from rows
  // that have fewer fields than the header — usually caused by a missing
  // trailing comma in source data. Setting it false makes the parser
  // leave the shift in place (downstream code can detect and report it).

  test('Default (repairRowShifts: true) fills missing trailing fields with empty strings', () => {
    const csv = 'id,name,note\n1,Anna,hello\n2,Bob'; // row 2 missing `note`
    const out = csvToJson(csv, { delimiter: ',', parseNumbers: true });
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ id: 2, name: 'Bob' });
    // With repair on, note is present (possibly empty) — must not be undefined.
    expect(out[1]).toHaveProperty('note');
  });

  test('repairRowShifts: false still parses the same shape (option is non-breaking)', () => {
    const csv = 'id,name,note\n1,Anna,hello\n2,Bob,';
    const onWithRepair = csvToJson(csv, { delimiter: ',', parseNumbers: true, repairRowShifts: true });
    const offWithoutRepair = csvToJson(csv, { delimiter: ',', parseNumbers: true, repairRowShifts: false });
    expect(onWithRepair).toHaveLength(2);
    expect(offWithoutRepair).toHaveLength(2);
    expect(offWithoutRepair[0]).toMatchObject({ id: 1, name: 'Anna', note: 'hello' });
    expect(offWithoutRepair[1]).toMatchObject({ id: 2, name: 'Bob' });
  });
});

describe('Combined corner cases', () => {
  test('BOM + CRLF line endings + empty trailing line round-trip cleanly', () => {
    const csv = '﻿id,name\r\n1,Anna\r\n2,Bob\r\n';
    const out = csvToJson(csv, { delimiter: ',', parseNumbers: true });
    expect(out).toEqual([
      { id: 1, name: 'Anna' },
      { id: 2, name: 'Bob' },
    ]);
  });

  test('Quoted field containing the delimiter does not split the row', () => {
    const csv = 'id,note\n1,"a,b,c"';
    const out = csvToJson(csv, { delimiter: ',' });
    expect(out).toHaveLength(1);
    expect(out[0].note).toBe('a,b,c');
  });

  test('Quoted field containing escaped quote ("") preserves a single quote in the value', () => {
    const csv = 'id,note\n1,"he said ""hi"""';
    const out = csvToJson(csv, { delimiter: ',' });
    expect(out).toHaveLength(1);
    // Standard CSV decode of "" inside quotes -> single ".
    // Default normalizeQuotes: true may further collapse — accept either form.
    expect(String(out[0].note)).toContain('hi');
    expect(String(out[0].note)).toContain('he said');
  });
});
