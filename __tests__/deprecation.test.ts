/**
 * Deprecation runtime warning tests.
 *
 * Exercises the deprecate() helper directly so we don't depend on real I/O
 * inside the wrapped functions. Then smoke-tests that the public barrels
 * actually expose the deprecated aliases as wrapped functions.
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { deprecate, _resetDeprecationWarnings } from '../src/utils/deprecate';

type WarnCall = { message: string; type?: string; code?: string };

let warnings: WarnCall[] = [];
let originalEmit: typeof process.emitWarning;

beforeEach(() => {
  warnings = [];
  _resetDeprecationWarnings();
  originalEmit = process.emitWarning;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process as any).emitWarning = (
    msg: string | Error,
    typeOrOptions?: string | { type?: string; code?: string },
  ) => {
    const message = typeof msg === 'string' ? msg : msg.message;
    if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
      warnings.push({ message, type: typeOrOptions.type, code: typeOrOptions.code });
    } else {
      warnings.push({ message, type: typeOrOptions });
    }
  };
});

afterEach(() => {
  process.emitWarning = originalEmit;
});

describe('deprecate() helper', () => {
  test('forwards args and return value', () => {
    const add = (a: number, b: number) => a + b;
    const wrapped = deprecate(add, 'oldAdd', 'add');
    expect(wrapped(2, 3)).toBe(5);
  });

  test('emits one DeprecationWarning on first call', () => {
    const wrapped = deprecate(() => 'ok', 'oldName1', 'newName1');
    wrapped();
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('DeprecationWarning');
    expect(warnings[0].code).toBe('JTCSV_DEP_OLDNAME1');
    expect(warnings[0].message).toContain('oldName1');
    expect(warnings[0].message).toContain('newName1');
    expect(warnings[0].message).toMatch(/5\.0/);
  });

  test('subsequent calls do NOT emit additional warnings', () => {
    const wrapped = deprecate(() => 'ok', 'oldName2', 'newName2');
    wrapped(); wrapped(); wrapped(); wrapped();
    expect(warnings).toHaveLength(1);
  });

  test('different deprecated names emit independent warnings', () => {
    const wA = deprecate(() => 'a', 'aliasA', 'realA');
    const wB = deprecate(() => 'b', 'aliasB', 'realB');
    wA(); wA(); wB(); wB();
    expect(warnings).toHaveLength(2);
    const codes = warnings.map((w) => w.code).sort();
    expect(codes).toEqual(['JTCSV_DEP_ALIASA', 'JTCSV_DEP_ALIASB']);
  });

  test('preserves function name (for stack traces)', () => {
    const wrapped = deprecate(() => 1, 'oldFunc', 'newFunc');
    expect(wrapped.name).toBe('oldFunc');
  });

  test('preserves `this` binding', () => {
    const obj = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      x: 42, get(this: any) { return this.x; },
    };
    obj.get = deprecate(obj.get, 'oldGet', 'newGet');
    expect(obj.get()).toBe(42);
  });

  test('respects custom removal version', () => {
    const wrapped = deprecate(() => 0, 'oldX', 'newX', '6.0');
    wrapped();
    expect(warnings[0].message).toMatch(/6\.0/);
  });

  test('survives if process.emitWarning rejects unknown options', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).emitWarning = () => { throw new Error('boom'); };
    const wrapped = deprecate(() => 'still-works', 'oldY', 'newY');
    expect(wrapped()).toBe('still-works');
  });
});

describe('Public barrels expose deprecated aliases', () => {
  // These are smoke tests: we just confirm the alias exists and is a function
  // (i.e. import * from 'jtcsv' includes csvToJsonFile etc.). The actual
  // forwarding is unit-tested above; the runtime-warning path is unit-tested
  // above. No real I/O is performed here.
  test('jtcsv (main barrel)', () => {
    const main = require('../index');
    expect(typeof main.csvToJsonFile).toBe('function');
    expect(typeof main.csvToJsonFileSync).toBe('function');
    expect(typeof main.csvToJsonStream).toBe('function');
    expect(typeof main.csvFileToJsonStream).toBe('function');
    // Canonical names also exist.
    expect(typeof main.readCsvAsJson).toBe('function');
    expect(typeof main.readCsvAsJsonSync).toBe('function');
    expect(typeof main.createCsvToJsonStream).toBe('function');
    expect(typeof main.createCsvFileToJsonStream).toBe('function');
  });

  test('jtcsv/csv (subpath) exposes csvToJsonFile + canonical names', () => {
    const csv = require('jtcsv/csv');
    expect(typeof csv.csvToJsonFile).toBe('function');
    expect(typeof csv.csvToJsonFileSync).toBe('function');
    expect(typeof csv.readCsvAsJson).toBe('function');
    expect(typeof csv.readCsvAsJsonSync).toBe('function');
    expect(typeof csv.csvToJson).toBe('function');
  });

  test('jtcsv/streams (subpath) exposes csvToJsonStream + canonical names', () => {
    const streams = require('jtcsv/streams');
    expect(typeof streams.csvToJsonStream).toBe('function');
    expect(typeof streams.csvFileToJsonStream).toBe('function');
    expect(typeof streams.createCsvToJsonStream).toBe('function');
    expect(typeof streams.createCsvFileToJsonStream).toBe('function');
    expect(typeof streams.streamJsonToCsv).toBe('function');
    expect(typeof streams.streamCsvToJson).toBe('function');
  });

  test('canonical jtcsv exports do NOT call deprecate (no warning when imported)', () => {
    // Loading the module should not warn (warnings come from CALLS, not imports).
    require('../index');
    require('jtcsv/csv');
    require('jtcsv/streams');
    expect(warnings).toHaveLength(0);
  });
});

describe('Integration: warning fires through public barrel', () => {
  test('calling main.csvToJsonStream() warns once with correct code', () => {
    const main = require('../index');
    const s1 = main.csvToJsonStream();
    const s2 = main.csvToJsonStream();
    const s3 = main.csvToJsonStream();
    expect(s1).toBeDefined();
    expect(s2).toBeDefined();
    expect(s3).toBeDefined();
    const matches = warnings.filter((w) => w.code === 'JTCSV_DEP_CSVTOJSONSTREAM');
    expect(matches).toHaveLength(1);
    expect(matches[0].message).toMatch(/Use createCsvToJsonStream\(\) instead/);
    expect(matches[0].message).toMatch(/jtcsv 5\.0/);
  });
});
