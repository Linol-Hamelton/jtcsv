/**
 * Parity across every engine that can parse a CSV.
 *
 * jtcsv reaches the same bytes through five code paths — the synchronous fast
 * path, the synchronous standard path, csvToJsonAsync, the streaming
 * transform, and the browser build — and which one runs is mostly invisible to
 * the caller. The fast path, in particular, turns itself off as soon as the
 * input contains an escaped quote, so a file gains or loses an engine because
 * of its content.
 *
 * That made divergences very cheap to introduce and very hard to notice. Every
 * case below is one that was actually wrong before this suite existed:
 *
 *   - `O'Brien` threw "Unclosed quotes" on the standard and streaming paths,
 *     because `'` was treated as a quote character. Combined with an escaped
 *     quote elsewhere in the file — which disables the fast path — that meant
 *     ordinary input failed on default options.
 *   - `C:\Users\Dmitry` arrived as `C:UsersDmitry` in Node and intact in the
 *     browser: the Node tokenizer treated a backslash as an escape character,
 *     which RFC 4180 does not define.
 *   - "Infinity" and, with trim: false, "  12" became numbers on the standard
 *     path and stayed strings everywhere else.
 *   - The apostrophe that preventCsvInjection writes in front of a formula was
 *     stripped when reading in Node but not in the browser, so jsonToCsv ->
 *     csvToJson round-tripped in one runtime and not the other.
 *   - parseBooleans did nothing at all in the browser, and trim was ignored
 *     there.
 *   - A short row produced every header key holding undefined in Node and only
 *     the keys it had in the browser.
 *
 * The last one is why the comparison is a hand-built snapshot rather than
 * toEqual: Jest treats `{ a: 1, b: undefined }` and `{ a: 1 }` as equal, so
 * key presence has to be asserted explicitly or the difference stays invisible.
 */
import { describe, test, expect } from '@jest/globals';
import { Readable } from 'stream';
import type { CsvToJsonOptions } from '../src/types';
import {
  csvToJson as nodeCsvToJson,
  csvToJsonAsync,
  createCsvToJsonStream,
} from '../index';
import { csvToJson as browserCsvToJson } from '../src/browser/csv-to-json-browser';

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const QUOTE = String.fromCharCode(34);
const APOSTROPHE = String.fromCharCode(39);
const BACKSLASH = String.fromCharCode(92);

interface Case {
  name: string;
  csv: string;
  options?: CsvToJsonOptions;
  /** Streaming rejects a row whose field count differs from the header. */
  ragged?: boolean;
}

const CASES: Case[] = [
  // --- the bugs this suite was written for ----------------------------
  {
    name: 'an apostrophe in ordinary data',
    csv: 'name' + LF + 'O' + APOSTROPHE + 'Brien',
  },
  {
    name: 'an apostrophe alongside an escaped quote',
    csv: 'name,quote' + LF + 'O' + APOSTROPHE + 'Brien,'
      + QUOTE + 'he said ' + QUOTE + QUOTE + 'hi' + QUOTE + QUOTE + QUOTE,
  },
  {
    name: 'a Windows path keeps its separators',
    csv: 'path' + LF + 'C:' + BACKSLASH + 'Users' + BACKSLASH + 'Dmitry',
  },
  {
    name: 'a backslash inside a quoted field',
    csv: 'path' + LF + QUOTE + 'C:' + BACKSLASH + 'tmp' + QUOTE,
  },
  {
    name: 'the preventCsvInjection apostrophe is unescaped',
    csv: 'formula' + LF + APOSTROPHE + '=SUM(A1:A2)',
  },
  {
    name: 'a formula prefix that is not a formula stays put',
    csv: 'text' + LF + APOSTROPHE + 'quoted words',
  },

  // --- quoting --------------------------------------------------------
  {
    name: 'an escaped quote',
    csv: 'a' + LF + QUOTE + 'he said ' + QUOTE + QUOTE + 'hi' + QUOTE + QUOTE + QUOTE,
  },
  { name: 'a quoted delimiter', csv: 'a,b' + LF + QUOTE + 'x,y' + QUOTE + ',2' },
  {
    name: 'a quoted newline',
    csv: 'a,b' + LF + QUOTE + 'line1' + LF + 'line2' + QUOTE + ',2',
  },
  { name: 'an empty quoted field', csv: 'a,b' + LF + QUOTE + QUOTE + ',2' },
  { name: 'an empty bare field', csv: 'a,b' + LF + ',2' },
  { name: 'CRLF line endings', csv: 'a,b' + CR + LF + '1,2' + CR + LF },

  // --- value coercion -------------------------------------------------
  { name: 'plain integers with parseNumbers', csv: 'n' + LF + '42', options: { parseNumbers: true } },
  { name: 'exponent notation', csv: 'n' + LF + '1e5', options: { parseNumbers: true } },
  { name: 'a leading plus', csv: 'n' + LF + '+5', options: { parseNumbers: true } },
  { name: 'a leading dot', csv: 'n' + LF + '.5', options: { parseNumbers: true } },
  { name: 'Infinity stays a string', csv: 'n' + LF + 'Infinity', options: { parseNumbers: true } },
  { name: 'NaN stays a string', csv: 'n' + LF + 'NaN', options: { parseNumbers: true } },
  {
    name: 'leading whitespace with trim off',
    csv: 'n' + LF + '  12',
    options: { trim: false, parseNumbers: true },
  },
  { name: 'lowercase booleans', csv: 'b' + LF + 'true', options: { parseBooleans: true } },
  { name: 'uppercase booleans', csv: 'b' + LF + 'FALSE', options: { parseBooleans: true } },
  { name: 'booleans left alone when not asked for', csv: 'b' + LF + 'true' },
  { name: 'trim on by default', csv: 'a' + LF + '  x  ' },
  { name: 'trim explicitly off', csv: 'a' + LF + '  x  ', options: { trim: false } },

  // --- shape ----------------------------------------------------------
  { name: 'a short row keeps every header key', csv: 'a,b,c' + LF + '1', ragged: true },
  { name: 'a long row drops the extra field', csv: 'a,b' + LF + '1,2,3', ragged: true },
  { name: 'a header-only file', csv: 'a,b' },
];

/**
 * Captures key order, key presence and values — including undefined, which
 * JSON.stringify drops and toEqual ignores.
 */
function snapshot(rows: any[]): string {
  return JSON.stringify(
    rows.map((row) =>
      Object.keys(row).map((key) => [
        key,
        row[key] === undefined ? '<undefined>' : row[key],
      ])
    )
  );
}

function attempt(run: () => any[]): string {
  try {
    return snapshot(run());
  } catch (error: any) {
    return 'threw: ' + String(error?.message).split(LF)[0];
  }
}

async function attemptAsync(run: () => Promise<any[]>): Promise<string> {
  try {
    return snapshot(await run());
  } catch (error: any) {
    return 'threw: ' + String(error?.message).split(LF)[0];
  }
}

function streamParse(csv: string, options: CsvToJsonOptions): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    const stream = createCsvToJsonStream(options as any);
    stream.on('data', (row: any) => rows.push(row));
    stream.on('end', () => resolve(rows));
    stream.on('error', reject);
    Readable.from([csv]).pipe(stream);
  });
}

describe('every engine parses a CSV the same way', () => {
  for (const testCase of CASES) {
    const options = testCase.options ?? {};

    test(testCase.name, async () => {
      const fastPath = attempt(() =>
        nodeCsvToJson(testCase.csv, { ...options, useFastPath: true }));
      const standard = attempt(() =>
        nodeCsvToJson(testCase.csv, { ...options, useFastPath: false }));
      const asynchronous = await attemptAsync(() =>
        csvToJsonAsync(testCase.csv, options));
      const browser = attempt(() => browserCsvToJson(testCase.csv, options));

      expect(standard).toBe(fastPath);
      expect(asynchronous).toBe(fastPath);
      expect(browser).toBe(fastPath);

      // Nothing here is malformed, so no engine should be rejecting it.
      expect(fastPath.startsWith('threw:')).toBe(false);
    });
  }
});

describe('the streaming transform agrees with the batch parser', () => {
  for (const testCase of CASES.filter((c) => !c.ragged)) {
    const options = testCase.options ?? {};

    test(testCase.name, async () => {
      const batch = attempt(() => nodeCsvToJson(testCase.csv, options));
      const streamed = await attemptAsync(() => streamParse(testCase.csv, options));
      expect(streamed).toBe(batch);
    });
  }
});

describe('known difference: the streaming transform is strict about field count', () => {
  // Not a tokenizer disagreement — a deliberate difference in how a ragged row
  // is handled. csvToJson reconciles the row against the header (dropping
  // extras, filling gaps with undefined); the stream raises ParsingError
  // instead, and offers no option to soften it. Recorded here so the asymmetry
  // is a decision on the record rather than something to rediscover.
  test('a short row is reconciled in batch and rejected in stream', async () => {
    const csv = 'a,b,c' + LF + '1';
    expect(Object.keys(nodeCsvToJson(csv)[0])).toEqual(['a', 'b', 'c']);
    await expect(streamParse(csv, {})).rejects.toThrow(/Field count mismatch/);
  });

  test('a long row is truncated in batch and rejected in stream', async () => {
    const csv = 'a,b' + LF + '1,2,3';
    expect(Object.keys(nodeCsvToJson(csv)[0])).toEqual(['a', 'b']);
    await expect(streamParse(csv, {})).rejects.toThrow(/Field count mismatch/);
  });
});

describe('the legacy dialect is still reachable', () => {
  test('rfc4180Compliant: false restores backslash escaping', () => {
    const csv = 'a' + LF + 'x' + BACKSLASH + BACKSLASH + 'y';
    expect(nodeCsvToJson(csv)[0].a).toBe('x' + BACKSLASH + BACKSLASH + 'y');
    expect(nodeCsvToJson(csv, { rfc4180Compliant: false })[0].a)
      .toBe('x' + BACKSLASH + 'y');
  });

  test('the legacy dialect applies on the standard path too', () => {
    const csv = 'a' + LF + 'x' + BACKSLASH + BACKSLASH + 'y';
    expect(nodeCsvToJson(csv, { rfc4180Compliant: false, useFastPath: false })[0].a)
      .toBe('x' + BACKSLASH + 'y');
  });
});

describe('jsonToCsv output survives a round trip through every engine', () => {
  // The formula case is the one that mattered: preventCsvInjection writes a
  // leading apostrophe on the way out, and reading it back has to remove it or
  // the value silently changes.
  const rows = [
    { name: 'Ada', formula: '=SUM(A1:A2)', path: 'C:' + BACKSLASH + 'tmp' },
    { name: 'O' + APOSTROPHE + 'Brien', formula: 'plain', path: 'x' },
  ];

  test('round trips', async () => {
    // Imported lazily so the parser cases above do not depend on the serialiser.
    const { jsonToCsv } = await import('../index');
    const csv = jsonToCsv(rows);

    for (const parse of [
      () => nodeCsvToJson(csv, { useFastPath: true }),
      () => nodeCsvToJson(csv, { useFastPath: false }),
      () => browserCsvToJson(csv, {}),
    ]) {
      expect(parse()).toEqual(rows);
    }
    expect(await csvToJsonAsync(csv)).toEqual(rows);
  });
});
