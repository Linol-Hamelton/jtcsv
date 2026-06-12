/**
 * encoding-coverage.test.ts — Test M4 (Phase 2 Week 7)
 *
 * Locks the encoding / BOM / line-ending contract of jtcsv.
 * Where a path is buggy or inconsistent, the test LOCKS the current
 * behaviour with a `/* LOCKED CURRENT *\/` comment so a future change
 * surfaces as a deliberate decision.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';

import { csvToJson, jsonToCsv } from '../index';
import {
  detectBom,
  stripBom,
  stripBomFromString,
  normalizeCsvInput,
} from '../src/utils/bom-utils';
import {
  detectEncoding,
  convertToUtf8,
  autoDetectAndConvert,
  csvToJsonWithEncoding,
} from '../src/utils/encoding-support';
import { createJsonToCsvStream, saveJsonStreamAsCsv } from '../stream-json-to-csv';
import { createCsvFileToJsonStream } from '../stream-csv-to-json';
import { readCsvAsJson, readCsvAsJsonSync } from '../csv-to-json';

const UTF8_BOM_BYTES = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF16LE_BOM_BYTES = Buffer.from([0xff, 0xfe]);
const UTF16BE_BOM_BYTES = Buffer.from([0xfe, 0xff]);

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jtcsv-enc-'));
});

afterAll(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

// ---------------------------------------------------------------------------
// csvToJson + BOM behaviour
// ---------------------------------------------------------------------------

describe('csvToJson — BOM handling', () => {
  test('1) U+FEFF BOM on header is stripped — header key is "a" not "\\uFEFFa"', () => {
    const rows = csvToJson('﻿a,b\n1,2', { delimiter: ',' });
    expect(rows).toHaveLength(1);
    const keys = Object.keys(rows[0] as object);
    expect(keys).toContain('a');
    expect(keys).not.toContain('﻿a');
    expect((rows[0] as any).a).toBe('1');
    expect((rows[0] as any).b).toBe('2');
  });

  test('2) Buffer input is REJECTED with ValidationError /* LOCKED CURRENT */', () => {
    // csvToJson() calls validateCsvInput() which requires typeof csv === 'string'.
    // Locking current behaviour: Buffer is not accepted at the top-level API.
    const buf = Buffer.concat([UTF8_BOM_BYTES, Buffer.from('a,b\n1,2', 'utf8')]);
    // The fn throws; error name comes from the JtcsvError hierarchy.
    expect(() => csvToJson(buf as unknown as string, { delimiter: ',' })).toThrow();
  });

  test('3) Mid-data \\uFEFF — current pipeline strips it via value normalization /* LOCKED CURRENT */', () => {
    // normalizeCsvInput() itself only strips a *leading* BOM, but the parser's
    // per-value trim / normalize-quotes path also removes a leading U+FEFF
    // from field values. Lock the current observable behaviour: the value
    // arrives as "1", not "﻿1".
    const rows = csvToJson('a,b\n﻿1,2', { delimiter: ',' });
    expect(rows).toHaveLength(1);
    expect((rows[0] as any).a).toBe('1');
    expect((rows[0] as any).b).toBe('2');
  });

  test('4) CRLF input → output rows contain no stray "\\r"', () => {
    const rows = csvToJson('a,b\r\n1,2\r\n3,4', { delimiter: ',' });
    expect(rows).toHaveLength(2);
    for (const row of rows as any[]) {
      for (const k of Object.keys(row)) {
        expect(k.endsWith('\r')).toBe(false);
        expect(String(row[k]).endsWith('\r')).toBe(false);
      }
    }
    expect((rows[0] as any).b).toBe('2');
    expect((rows[1] as any).b).toBe('4');
  });

  test('5) Mixed LF + CRLF — row count is correct and no stray "\\r"', () => {
    const rows = csvToJson('a,b\n1,2\r\n3,4\n5,6', { delimiter: ',' });
    expect(rows).toHaveLength(3);
    for (const row of rows as any[]) {
      for (const v of Object.values(row)) {
        expect(String(v)).not.toMatch(/\r/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// detectBom
// ---------------------------------------------------------------------------

describe('detectBom', () => {
  test('6) Buffer with UTF-8 BOM → { encoding: "utf-8", bomLength: 3, hasBom: true }', () => {
    const buf = Buffer.concat([UTF8_BOM_BYTES, Buffer.from('hi')]);
    const res = detectBom(buf);
    expect(res).not.toBeNull();
    expect(res!.encoding).toBe('utf-8');
    expect(res!.bomLength).toBe(3);
    expect(res!.hasBom).toBe(true);
  });

  test('7) Buffer with UTF-16 LE BOM (FF FE) → utf-16le info', () => {
    const buf = Buffer.concat([UTF16LE_BOM_BYTES, Buffer.from([0x68, 0x00])]);
    const res = detectBom(buf);
    expect(res).not.toBeNull();
    expect(res!.encoding).toBe('utf-16le');
    expect(res!.bomLength).toBe(2);
    expect(res!.hasBom).toBe(true);
  });

  test('8) Buffer with UTF-16 BE BOM (FE FF) → utf-16be info', () => {
    const buf = Buffer.concat([UTF16BE_BOM_BYTES, Buffer.from([0x00, 0x68])]);
    const res = detectBom(buf);
    expect(res).not.toBeNull();
    expect(res!.encoding).toBe('utf-16be');
    expect(res!.bomLength).toBe(2);
  });

  test('9) Buffer.alloc(0) and Buffer.alloc(1) → null', () => {
    // Buffer.alloc(0) is falsy via `!input` short-circuit in detectBom.
    // /* LOCKED CURRENT */ — empty buffer returns null even though it is a Buffer.
    expect(detectBom(Buffer.alloc(0))).toBeNull();
    expect(detectBom(Buffer.alloc(1))).toBeNull();
  });

  test('10) detectBom("hello") and detectBom(Buffer.from("hello")) → null', () => {
    expect(detectBom('hello')).toBeNull();
    expect(detectBom(Buffer.from('hello'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// stripBom / stripBomFromString
// ---------------------------------------------------------------------------

describe('stripBom / stripBomFromString', () => {
  test('11) stripBom(Buffer with UTF-8 BOM) returns Buffer without the 3 BOM bytes', () => {
    const buf = Buffer.concat([UTF8_BOM_BYTES, Buffer.from('hello')]);
    const out = stripBom(buf);
    expect(Buffer.isBuffer(out)).toBe(true);
    expect((out as Buffer).length).toBe(5);
    expect((out as Buffer).toString('utf8')).toBe('hello');
  });

  test('12) stripBom("\\uFEFFhello") returns "hello"', () => {
    expect(stripBom('﻿hello')).toBe('hello');
  });

  test('13) stripBom(null) / stripBom(undefined) returns the falsy input as-is /* LOCKED CURRENT */', () => {
    // Implementation returns the input untouched when it is null/undefined.
    expect(stripBom(null)).toBeNull();
    expect(stripBom(undefined)).toBeUndefined();
  });

  test('14) stripBomFromString("\\uFEFF") returns ""', () => {
    expect(stripBomFromString('﻿')).toBe('');
  });

  test('15) stripBomFromString("hello") returns "hello" unchanged', () => {
    expect(stripBomFromString('hello')).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// normalizeCsvInput
// ---------------------------------------------------------------------------

describe('normalizeCsvInput', () => {
  test('16) BOM + CRLF input → BOM gone, only LF line endings', () => {
    const out = normalizeCsvInput('﻿a,b\r\n1,2\r\n');
    expect(out.startsWith('﻿')).toBe(false);
    expect(out).not.toMatch(/\r/);
    expect(out).toBe('a,b\n1,2\n');
  });

  test('17) { normalizeLineEndings: false } preserves CRLF', () => {
    const out = normalizeCsvInput('a,b\r\n1,2\r\n', { normalizeLineEndings: false });
    expect(out).toBe('a,b\r\n1,2\r\n');
  });
});

// ---------------------------------------------------------------------------
// detectEncoding / convertToUtf8 / autoDetectAndConvert
// ---------------------------------------------------------------------------

describe('encoding-support', () => {
  test('18) detectEncoding(Buffer with UTF-8 BOM) → "utf8"', () => {
    const buf = Buffer.concat([UTF8_BOM_BYTES, Buffer.from('hi')]);
    expect(detectEncoding(buf)).toBe('utf8');
  });

  test('19) detectEncoding(Buffer with UTF-16 LE BOM) → "utf16le"', () => {
    const buf = Buffer.concat([UTF16LE_BOM_BYTES, Buffer.from([0x68, 0x00])]);
    expect(detectEncoding(buf)).toBe('utf16le');
  });

  test('20) detectEncoding(Buffer with UTF-16 BE BOM) → "utf16be"', () => {
    const buf = Buffer.concat([UTF16BE_BOM_BYTES, Buffer.from([0x00, 0x68])]);
    expect(detectEncoding(buf)).toBe('utf16be');
  });

  test('21) detectEncoding(Buffer "hello") with no BOM falls back (default "utf8")', () => {
    expect(detectEncoding(Buffer.from('hello'))).toBe('utf8');
    expect(detectEncoding(Buffer.from('hello'), { fallback: 'latin1' })).toBe('latin1');
  });

  test('22) detectEncoding("not buffer") throws ValidationError', () => {
    // ValidationError extends Error; assert via name + message.
    expect(() => detectEncoding('not a buffer' as unknown as Buffer)).toThrow(
      /must be a Buffer/i
    );
    try {
      detectEncoding('x' as unknown as Buffer);
    } catch (e: any) {
      expect(e.name).toBe('ValidationError');
    }
  });

  test('23) convertToUtf8(Buffer w/ UTF-8 BOM, "utf8") strips BOM', () => {
    const buf = Buffer.concat([UTF8_BOM_BYTES, Buffer.from('hello world', 'utf8')]);
    expect(convertToUtf8(buf, 'utf8')).toBe('hello world');
  });

  test('24) autoDetectAndConvert with UTF-16 LE BOM + utf16le bytes → { encoding, text }', () => {
    const textBytes = Buffer.from('hi', 'utf16le');
    const buf = Buffer.concat([UTF16LE_BOM_BYTES, textBytes]);
    const result = autoDetectAndConvert(buf);
    expect(result.encoding).toBe('utf16le');
    expect(result.text).toBe('hi');
  });

  test('25) csvToJsonWithEncoding(any) throws — LOCKED CURRENT (broken path)', async () => {
    // The stub at src/utils/encoding-support.ts throws an Error after the
    // detect-and-convert step. Lock the current behaviour.
    await expect(csvToJsonWithEncoding('a,b\n1,2')).rejects.toThrow(
      /csvToJson function not available/i
    );
  });
});

// ---------------------------------------------------------------------------
// readCsvAsJson / readCsvAsJsonSync — BOM file roundtrip
// ---------------------------------------------------------------------------

describe('readCsvAsJson(Sync) with UTF-8 BOM file', () => {
  let bomFilePath: string;

  beforeAll(() => {
    bomFilePath = path.join(tmpDir, 'with-bom.csv');
    const content = Buffer.concat([
      UTF8_BOM_BYTES,
      Buffer.from('a,b\n1,2\n3,4\n', 'utf8'),
    ]);
    fs.writeFileSync(bomFilePath, content);
  });

  test('26) readCsvAsJson on UTF-8 BOM file — first key is "a" not "\\uFEFFa"', async () => {
    const rows = (await readCsvAsJson(bomFilePath, { delimiter: ',', validatePath: false })) as any[];
    expect(rows).toHaveLength(2);
    const keys = Object.keys(rows[0]);
    expect(keys).toContain('a');
    expect(keys).not.toContain('﻿a');
    expect(rows[0].a).toBe('1');
    expect(rows[1].b).toBe('4');
  });

  test('27) readCsvAsJsonSync on UTF-8 BOM file — first key is "a" not "\\uFEFFa"', () => {
    const rows = readCsvAsJsonSync(bomFilePath, { delimiter: ',', validatePath: false }) as any[];
    expect(rows).toHaveLength(2);
    expect(Object.keys(rows[0])).toContain('a');
    expect(Object.keys(rows[0])).not.toContain('﻿a');
  });
});

// ---------------------------------------------------------------------------
// jsonToCsv / streams — BOM emission
// ---------------------------------------------------------------------------

describe('jsonToCsv — addBOM option has no effect (no leading \\uFEFF)', () => {
  test('28) jsonToCsv({ addBOM: true } as any) produces no leading \\uFEFF /* LOCKED CURRENT */', () => {
    const csv = jsonToCsv([{ a: 1, b: 2 }], { addBOM: true } as any);
    expect(typeof csv).toBe('string');
    expect((csv as string).charCodeAt(0)).not.toBe(0xfeff);
    expect((csv as string).startsWith('﻿')).toBe(false);
  });
});

describe('createJsonToCsvStream BOM defaults', () => {
  function collect(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      let acc = '';
      stream.on('data', (chunk) => {
        acc += chunk.toString();
      });
      stream.on('end', () => resolve(acc));
      stream.on('error', reject);
    });
  }

  test('29) createJsonToCsvStream default (addBOM:false) — no leading \\uFEFF', async () => {
    const source = Readable.from([{ a: 1, b: 2 }]);
    const out = createJsonToCsvStream({ delimiter: ',' });
    source.pipe(out);
    const csv = await collect(out);
    expect(csv.length).toBeGreaterThan(0);
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
  });

  test('30) createJsonToCsvStream({ addBOM:true }) — leading \\uFEFF present', async () => {
    const source = Readable.from([{ a: 1, b: 2 }]);
    const out = createJsonToCsvStream({ delimiter: ',', addBOM: true });
    source.pipe(out);
    const csv = await collect(out);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  test('31) saveJsonStreamAsCsv default has BOM (LOCKED inconsistency vs createJsonToCsvStream default)', async () => {
    const filePath = path.join(tmpDir, 'save-default.csv');
    const source = Readable.from([{ a: 1, b: 2 }]);
    await saveJsonStreamAsCsv(source, filePath, { delimiter: ',', validatePath: false });
    const written = fs.readFileSync(filePath);
    // /* LOCKED CURRENT */ — saveJsonStreamAsCsv defaults addBOM to TRUE,
    // diverging from createJsonToCsvStream() which defaults to FALSE.
    expect(written[0]).toBe(0xef);
    expect(written[1]).toBe(0xbb);
    expect(written[2]).toBe(0xbf);
  });
});

// ---------------------------------------------------------------------------
// createCsvFileToJsonStream — reads BOM file, first row has clean keys
// ---------------------------------------------------------------------------

describe('createCsvFileToJsonStream — BOM file', () => {
  test('32) reads BOM file — first row has no \\uFEFF in keys', async () => {
    const filePath = path.join(tmpDir, 'bom-stream.csv');
    const content = Buffer.concat([
      UTF8_BOM_BYTES,
      Buffer.from('a,b\n1,2\n3,4\n', 'utf8'),
    ]);
    fs.writeFileSync(filePath, content);

    const stream = await createCsvFileToJsonStream(filePath, {
      delimiter: ',',
      validatePath: false,
    });

    const rows: any[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (row) => rows.push(row));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    const keys = Object.keys(rows[0]);
    expect(keys).toContain('a');
    expect(keys).not.toContain('﻿a');
  });
});
