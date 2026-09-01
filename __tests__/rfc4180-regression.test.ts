/**
 * RFC 4180 regressions found by driving the published package as a consumer.
 *
 * Three defects, all one family: the parser split records on newlines before
 * it understood quotes, and two "repair" layers existed to hide the damage by
 * deleting the data that broke them.
 *
 *   1. `csvToJson` threw "Unclosed quotes" on a valid record holding both an
 *      escaped quote and a newline — each feature worked on its own.
 *   2. `repairRowShifts` and `normalizeQuotes`, both on by default, then
 *      corrupted correctly parsed values: the normaliser collapsed every
 *      doubled quote and deleted any quote adjacent to a newline, so a round
 *      trip lost characters.
 *   3. The streaming transform kept the tail of `buffer.split` on a newline as
 *      the incomplete line, so a quoted newline straddling a chunk was cut in
 *      half and neither half parsed.
 *
 * Round-trip identity catches all three at once: whatever `jsonToCsv` writes,
 * `csvToJson` must read back unchanged.
 */
import { describe, test, expect } from '@jest/globals';
import { csvToJson, jsonToCsv, createCsvToJsonStream } from '../index';

const QUOTE = String.fromCharCode(34);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);

/** Values that exercise the quoting rules in the spec. */
const TRICKY: Record<string, string> = {
  'plain text': 'hello',
  'contains the delimiter': 'a,b',
  'contains a quote': 'he said ' + QUOTE + 'hi' + QUOTE,
  'contains a newline': 'line1' + LF + 'line2',
  'quote next to a newline': 'a ' + QUOTE + 'q' + QUOTE + LF + 'b',
  'delimiter, quote and newline together': 'a,b ' + QUOTE + 'q' + QUOTE + LF + 'line2',
  'wrapped in quotes': QUOTE + 'wrapped' + QUOTE,
  'doubled quotes inside': 'a ' + QUOTE + QUOTE + 'b' + QUOTE + QUOTE + ' c',
  'a single quote character': QUOTE,
  'unicode and emoji': 'Москва 🚀 naïve'
};

describe('round-trip identity', () => {
  test.each(Object.entries(TRICKY))('%s survives json -> csv -> json', (_label, value) => {
    expect(csvToJson(jsonToCsv([{ v: value }]))[0].v).toBe(value);
  });

  test('a whole row of tricky values survives together', () => {
    const row = {
      id: '1',
      note: 'a,b ' + QUOTE + 'q' + QUOTE + LF + 'line2',
      tag: QUOTE + 'quoted' + QUOTE,
      plain: 'ok'
    };
    expect(csvToJson(jsonToCsv([row]))).toEqual([row]);
  });

  test('trailing whitespace is trimmed by default, kept with trim:false', () => {
    const padded = 'value   ';
    expect(csvToJson(jsonToCsv([{ v: padded }]))[0].v).toBe('value');
    expect(csvToJson(jsonToCsv([{ v: padded }]), { trim: false })[0].v).toBe(padded);
  });

  test('serialising twice is stable', () => {
    const once = jsonToCsv([{ v: 'a ' + QUOTE + 'q' + QUOTE + LF + 'b' }]);
    expect(jsonToCsv(csvToJson(once))).toBe(once);
  });
});

describe('parser accepts hand-written RFC 4180', () => {
  const header = 'x' + CR + LF;

  test('escaped quote', () => {
    const csv = header + QUOTE + 'he said ' + QUOTE + QUOTE + 'hi' + QUOTE + QUOTE + QUOTE;
    expect(csvToJson(csv)[0].x).toBe('he said ' + QUOTE + 'hi' + QUOTE);
  });

  test('embedded newline', () => {
    expect(csvToJson(header + QUOTE + 'l1' + LF + 'l2' + QUOTE)[0].x).toBe('l1' + LF + 'l2');
  });

  test('escaped quote and newline together — this used to throw', () => {
    const csv = header + QUOTE + 'a ' + QUOTE + QUOTE + 'q' + QUOTE + QUOTE + LF + 'b' + QUOTE;
    expect(csvToJson(csv)[0].x).toBe('a ' + QUOTE + 'q' + QUOTE + LF + 'b');
  });

  test('a value that is only a quote', () => {
    expect(csvToJson(header + QUOTE.repeat(4))[0].x).toBe(QUOTE);
  });

  test('a quoted newline does not start a new record', () => {
    const csv = 'a,b' + CR + LF + QUOTE + 'l1' + LF + 'l2' + QUOTE + ',2';
    expect(csvToJson(csv)).toEqual([{ a: 'l1' + LF + 'l2', b: '2' }]);
  });

  test('the standard parser reads a value that is quoted throughout', () => {
    // v / """q""\n""w"""  — the field opens, holds two escaped quotes, a
    // newline, two more escaped quotes, and closes.
    const csv = 'v' + CR + LF + QUOTE.repeat(3) + 'q' + QUOTE.repeat(2) + LF +
                QUOTE.repeat(2) + 'w' + QUOTE.repeat(3);
    expect(csvToJson(csv, { useFastPath: false })[0].v)
      .toBe(QUOTE + 'q' + QUOTE + LF + QUOTE + 'w' + QUOTE);
  });

  // csvToJson now routes any input containing a doubled quote to the standard
  // parser, because the fast path's quote-parity heuristic is unsound there.
  test('fast path agrees with the standard parser on quoted-throughout values', () => {
    const csv = 'v' + CR + LF + QUOTE.repeat(3) + 'q' + QUOTE.repeat(2) + LF +
                QUOTE.repeat(2) + 'w' + QUOTE.repeat(3);
    expect(csvToJson(csv, { useFastPath: true })).toEqual(csvToJson(csv, { useFastPath: false }));
  });
});

describe('streaming holds records across chunk boundaries', () => {
  const drain = (stream: any): Promise<any[]> => new Promise((resolve, reject) => {
    const rows: any[] = [];
    stream.on('data', (d: any) => rows.push(typeof d === 'string' ? JSON.parse(d) : d));
    stream.on('end', () => resolve(rows));
    stream.on('error', reject);
  });

  test('a quoted newline split across two writes stays one row', async () => {
    const stream = createCsvToJsonStream();
    const done = drain(stream);
    stream.write('a,b' + LF + QUOTE + 'x');   // the quoted field is left open
    stream.write(LF + 'y' + QUOTE + ',2' + LF);
    stream.end();
    expect(await done).toEqual([{ a: 'x' + LF + 'y', b: '2' }]);
  });

  test('a record fed one character at a time still parses', async () => {
    const csv = 'a,b' + LF + QUOTE + 'multi' + LF + 'line' + QUOTE + ',2' + LF;
    const stream = createCsvToJsonStream();
    const done = drain(stream);
    for (const ch of csv) stream.write(ch);
    stream.end();
    expect(await done).toEqual([{ a: 'multi' + LF + 'line', b: '2' }]);
  });

  test('an escaped quote split across writes stays escaped', async () => {
    const stream = createCsvToJsonStream();
    const done = drain(stream);
    stream.write('a' + LF + QUOTE + 'he said ' + QUOTE);
    stream.write(QUOTE + 'hi' + QUOTE.repeat(3) + LF);
    stream.end();
    expect(await done).toEqual([{ a: 'he said ' + QUOTE + 'hi' + QUOTE }]);
  });
});
