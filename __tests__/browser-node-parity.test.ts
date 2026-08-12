/**
 * Parity between the Node parser and the browser parser.
 *
 * jtcsv ships one library for two runtimes, so `csvToJson` must mean the
 * same thing in both. It did not: the browser parser split rows with
 * `line.split(delimiter)` and had no notion of quoting at all, so every
 * RFC 4180 quoting rule produced silently wrong data — no error, just
 * mangled fields. It also coerced numbers and booleans unconditionally
 * while ignoring `parseNumbers`, so the same CSV yielded different types
 * depending on where it ran.
 *
 * The Node parser is the reference implementation — it has the test suite
 * behind it — so these cases assert the browser agrees with it exactly.
 * A divergence here means the two halves of the library disagree about
 * what a CSV is, which is a bug in whichever side moved.
 *
 * Cases are objects rather than tuples on purpose: with array rows Jest
 * injects its `done` callback into any parameter the row does not supply,
 * which silently arrives as the `options` argument.
 */
import { describe, test, expect } from '@jest/globals';
import type { CsvToJsonOptions } from '../src/types';
import { csvToJson as nodeCsvToJson } from '../index';
import { csvToJson as browserCsvToJson } from '../src/browser/csv-to-json-browser';

interface Case {
  name: string;
  csv: string;
  options: CsvToJsonOptions;
}

const CASES: Case[] = [
  // --- shape and separators -------------------------------------------
  { name: 'plain row', csv: 'a,b\n1,2', options: {} },
  { name: 'semicolon auto-detected', csv: 'a;b\n1;2', options: {} },
  { name: 'explicit delimiter', csv: 'a|b\n1|2', options: { delimiter: '|' } },
  { name: 'CRLF line endings', csv: 'a,b\r\n1,2\r\n', options: {} },
  { name: 'trailing newline', csv: 'a,b\n1,2\n', options: {} },
  { name: 'blank line in the middle', csv: 'a,b\n1,2\n\n3,4', options: {} },
  { name: 'header only', csv: 'a,b', options: {} },
  { name: 'empty input', csv: '', options: {} },

  // --- RFC 4180 quoting: every one of these used to be mangled --------
  { name: 'delimiter inside quotes', csv: 'a,b\n"x,y",2', options: {} },
  { name: 'newline inside quotes', csv: 'a,b\n"x\ny",2', options: {} },
  { name: 'delimiter and newline inside quotes', csv: 'a,b\n"x,\ny",2', options: {} },
  { name: 'escaped quote ("")', csv: 'a,b\n"he said ""hi""",2', options: {} },
  { name: 'quoted empty field', csv: 'a,b\n"",2', options: {} },
  { name: 'quoted field with padding', csv: 'a,b\n" x ",2', options: {} },
  { name: 'quoted header cells', csv: '"a b","c d"\n"1 2","3 4"', options: {} },

  // --- emptiness and whitespace ---------------------------------------
  { name: 'unquoted empty field', csv: 'a,b\n,2', options: {} },
  { name: 'whitespace around values', csv: 'a,b\n 1 , 2 ', options: {} },
  { name: 'all fields empty', csv: 'a,b\n,', options: {} },

  // --- row length mismatches ------------------------------------------
  { name: 'row shorter than header', csv: 'a,b,c\n1,2', options: {} },
  { name: 'row longer than header', csv: 'a,b\n1,2,3', options: {} },

  // --- type coercion ---------------------------------------------------
  { name: 'no coercion by default', csv: 'a,b\n1,2.5', options: {} },
  { name: 'parseNumbers: true', csv: 'a,b\n1,2.5', options: { parseNumbers: true } },
  { name: 'parseNumbers: false', csv: 'a,b\n1,2.5', options: { parseNumbers: false } },
  {
    name: 'quoted number with parseNumbers',
    csv: 'a,b\n"1",2',
    options: { parseNumbers: true, delimiter: ',' }
  },
  { name: 'booleans stay strings', csv: 'a,b\ntrue,false', options: {} },
  {
    name: 'booleans stay strings with parseNumbers',
    csv: 'a,b\ntrue,false',
    options: { parseNumbers: true }
  },
  { name: 'negative and decimal', csv: 'a,b\n-3,4.25', options: { parseNumbers: true } },
  {
    name: 'numeric-looking text is not a number',
    csv: 'a,b\n1abc,2',
    options: { parseNumbers: true }
  }
];

describe('browser parser matches the Node parser', () => {
  test.each(CASES)('$name', ({ csv, options }) => {
    expect(browserCsvToJson(csv, options)).toEqual(nodeCsvToJson(csv, options));
  });
});

describe('browser parser honours RFC 4180 quoting', () => {
  test('keeps a delimiter inside a quoted field', () => {
    expect(browserCsvToJson('a,b\n"x,y",2')).toEqual([{ a: 'x,y', b: '2' }]);
  });

  test('keeps a newline inside a quoted field as one record', () => {
    const rows = browserCsvToJson('a,b\n"line one\nline two",2');
    expect(rows).toHaveLength(1);
    expect(rows[0].a).toBe('line one\nline two');
  });

  test('unescapes a doubled quote to a single literal quote', () => {
    expect(browserCsvToJson('a,b\n"he said ""hi""",2')).toEqual([
      { a: 'he said "hi"', b: '2' }
    ]);
  });

  test('treats a quoted empty field as null, like an unquoted one', () => {
    expect(browserCsvToJson('a,b\n"",2')).toEqual(browserCsvToJson('a,b\n,2'));
  });

  test('raises ParsingError on an unclosed quote instead of returning junk', () => {
    expect(() => browserCsvToJson('a,b\n"never closed,2')).toThrow(/[Uu]nclosed/);
  });
});

describe('browser parser respects parseNumbers', () => {
  test('leaves numeric strings alone by default', () => {
    expect(browserCsvToJson('a,b\n1,2')).toEqual([{ a: '1', b: '2' }]);
  });

  test('converts only when asked', () => {
    expect(browserCsvToJson('a,b\n1,2', { parseNumbers: true })).toEqual([
      { a: 1, b: 2 }
    ]);
  });
});

describe('browser parser enforces maxRows', () => {
  // Previously it sliced the input silently, so callers got a truncated
  // result with no indication anything had been dropped. Node throws.
  test('throws once the row count is exceeded', () => {
    expect(() => browserCsvToJson('a,b\n1,2\n3,4\n5,6', { maxRows: 2 })).toThrow();
  });

  test('stays quiet within the limit', () => {
    expect(browserCsvToJson('a,b\n1,2\n3,4', { maxRows: 2 })).toHaveLength(2);
  });
});
