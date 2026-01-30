import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  JtcsvError,
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  createErrorMessage,
  handleError,
  safeExecute,
  safeExecuteAsync,
  safeExecuteSync
} from '../errors';
import {
  csvToJson,
  csvToJsonIterator,
  createDelimiterCache,
  getDelimiterCacheStats,
  clearDelimiterCache
} from '../csv-to-json';
import DelimiterCache from '../src/core/delimiter-cache';
import { TransformHooks, predefinedHooks } from '../src/core/transform-hooks';
import FastPathEngine from '../src/engines/fast-path-engine';
import PluginManager from '../src/core/plugin-system';
import NdjsonParser from '../src/formats/ndjson-parser';
import TsvParser from '../src/formats/tsv-parser';
import { createCsvToJsonStream } from '../stream-csv-to-json';
import { createJsonToCsvStream } from '../stream-json-to-csv';
import { saveAsJson, saveAsJsonSync } from '../json-save';

const collectAsync = async (iter) => {
  const results = [];
  for await (const item of iter) {
    results.push(item);
  }
  return results;
};

describe('errors.js coverage', () => {
  test('error classes expose names and codes', () => {
    const base = new JtcsvError('base');
    const validation = new ValidationError('bad');
    const security = new SecurityError('nope');
    const fsError = new FileSystemError('fs', new Error('orig'));
    const fsErrorDefault = new FileSystemError('fs default');
    const parsing = new ParsingError('parse', 2, 3);
    const limit = new LimitError('limit', 10, 11);
    const config = new ConfigurationError('config');

    expect(base.name).toBe('JtcsvError');
    expect((base as any).code).toBe('JTCSV_ERROR');
    expect((validation as any).code).toBe('VALIDATION_ERROR');
    expect((security as any).code).toBe('SECURITY_ERROR');
    expect(fsError.originalError).toBeTruthy();
    expect(fsErrorDefault.originalError).toBeNull();
    expect((parsing as any).lineNumber).toBe(2);
    expect(parsing.column).toBe(3);
    expect(limit.limit).toBe(10);
    expect(limit.actual).toBe(11);
    expect((config as any).code).toBe('CONFIGURATION_ERROR');
  });

  test('JtcsvError handles missing captureStackTrace', () => {
    const original = Error.captureStackTrace;
    Error.captureStackTrace = undefined;
    const err = new JtcsvError('no stack helper');
    expect(err.message).toBe('no stack helper');
    Error.captureStackTrace = original;
  });

  test('createErrorMessage uses fallback', () => {
    expect(createErrorMessage('NOPE', 'details')).toBe('Unknown error: details');
  });

  test('handleError logs in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new JtcsvError('boom');

    expect(() => handleError(err, { function: 'unit' })).toThrow('boom');
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  test('handleError skips logging outside development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new JtcsvError('no log');

    try {
      handleError(err, { function: 'prod' });
    } catch (error) {
      // expected
    }

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  test('safeExecuteAsync wraps unknown errors', async () => {
    await expect(
      safeExecuteAsync(async () => {
        throw new Error('kaboom');
      }, 'PARSE_FAILED', { function: 'test' })
    ).rejects.toThrow(JtcsvError);
  });

  test('safeExecuteSync rethrows known errors', () => {
    expect(() => safeExecuteSync(() => {
      throw new ValidationError('bad');
    }, 'INVALID_INPUT')).toThrow(ValidationError);
  });

  test('safeExecute detects promise', async () => {
    const result = await safeExecute(() => Promise.resolve('ok'), 'UNKNOWN_ERROR');
    expect(result).toBe('ok');
  });
});

describe('delimiter cache and exports', () => {
  test('DelimiterCache handles object keys and stats', () => {
    const cache = new DelimiterCache(2);
    const csvObj = new String('a,b');
    cache.set(csvObj, [','], ',');
    expect(cache.get(csvObj, [','])).toBe(',');

    const detected = DelimiterCache.autoDetectDelimiter('a,b', [','], cache);
    expect(detected).toBe(',');
  });

  test('csv-to-json cache helpers', () => {
    const cache = createDelimiterCache(1);
    cache.set('a;b', [';'], ';');
    const statsBefore = getDelimiterCacheStats();
    expect(statsBefore.totalRequests).toBeGreaterThanOrEqual(0);
    clearDelimiterCache();
    const statsAfter = getDelimiterCacheStats();
    expect(statsAfter.totalRequests).toBe(0);
  });
});

describe('csv-to-json edge branches', () => {
  test('csvToJson handles options null and parse numbers/booleans', () => {
    const csv = 'id;active\n1;true';
    const result = csvToJson(csv, null);
    expect(result[0].id).toBe('1');
  });

  test('csvToJson parses numbers and booleans with trim', () => {
    const csv = 'id;active\n42;FALSE';
    const result = csvToJson(csv, {
      delimiter: ';',
      autoDetect: false,
      trim: true,
      parseNumbers: true,
      parseBooleans: true
    });
    expect(result[0].id).toBe(42);
    expect(result[0].active).toBe(false);
  });

  test('csvToJson respects trim false and delimiter fallback', () => {
    const csv = ' head1 ;head2 \n1;2';
    const result = csvToJson(csv, { autoDetect: false, delimiter: undefined, trim: false });
    const keys = Object.keys(result[0]);
    expect(keys[0]).toBe(' head1 ');
  });

  test('csvToJson uses stream mode shortcut', async () => {
    const csv = 'a;b\n1;2';
    const iter = csvToJson(csv, { fastPathMode: 'stream' });
    const items = await collectAsync(iter);
    expect(items).toHaveLength(1);
  });

  test('csvToJsonIterator uses cache toggle and stream mode', async () => {
    const csv = 'a;b\n1;2';
    const iter = csvToJsonIterator(csv, {
      autoDetect: false,
      delimiter: ';',
      trim: false,
      useCache: false,
      fastPathMode: 'stream'
    });
    const items = await collectAsync(iter);
    expect(items[0].a).toBe('1');
  });

  test('csvToJson reports line number for unclosed quotes', () => {
    const csv = 'name,desc\n"oops';
    expect(() => csvToJson(csv, { autoDetect: false, delimiter: ',' }))
      .toThrow(/Unclosed quotes in CSV at line/);
  });

  test('csvToJsonIterator reports line number for unclosed quotes', async () => {
    const csv = 'name,desc\n"oops';
    const iter = csvToJsonIterator(csv, { autoDetect: false, delimiter: ',' });
    await expect(collectAsync(iter)).rejects.toThrow(/Unclosed quotes in CSV at line/);
  });

  test('csvToJsonIterator handles error without line number', async () => {
    jest.resetModules();
    jest.doMock('../src/engines/fast-path-engine', () => {
      return function MockEngine() {
        this.parseRows = () => {};
        this.iterateRows = function* () {
          const err = new Error('Unclosed');
          (err as any).code = 'FAST_PATH_UNCLOSED_QUOTES';
          yield;
          throw err;
        };
      };
    });

    const csvModule = require("../csv-to-json");
    const iter = csvModule.csvToJsonIterator('a,b\n"bad', { autoDetect: false, delimiter: ',' });
    await expect(collectAsync(iter)).rejects.toThrow();
    jest.dontMock('../src/engines/fast-path-engine');
  });

  test('csvToJsonIterator uses delimiter fallback', async () => {
    const csv = 'a;b\n1;2';
    const iter = csvToJsonIterator(csv, { autoDetect: false, delimiter: undefined });
    const items = await collectAsync(iter);
    expect(items.length).toBe(1);
  });

  test('csvToJsonIterator handles null options', async () => {
    const csv = 'a;b\n1;2';
    const iter = csvToJsonIterator(csv, null);
    const items = await collectAsync(iter);
    expect(items.length).toBe(1);
  });

  test('csvToJson uses error path without line number', () => {
    jest.resetModules();
    jest.doMock('../src/engines/fast-path-engine', () => {
      return function MockEngine() {
        this.parseRows = () => {
          const err = new Error('Unclosed');
          (err as any).code = 'FAST_PATH_UNCLOSED_QUOTES';
          throw err;
        };
        this.iterateRows = function* () {
          const err = new Error('Unclosed');
          (err as any).code = 'FAST_PATH_UNCLOSED_QUOTES';
          yield;
          throw err;
        };
      };
    });

    const csvModule = require("../csv-to-json");
    expect(() => csvModule.csvToJson('a,b\n"bad', { autoDetect: false, delimiter: ',' }))
      .toThrow('Unclosed quotes in CSV');
    jest.dontMock('../src/engines/fast-path-engine');
  });
});

describe('json-save options branches', () => {
  const outputPath = path.join(__dirname, 'options-null.json');

  afterEach(() => {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  });

  test('saveAsJson handles null options', async () => {
    await saveAsJson({ ok: true }, outputPath, null);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  test('saveAsJsonSync handles null options', () => {
    const savedPath = saveAsJsonSync({ ok: true }, outputPath, null);
    expect(savedPath).toBe(path.resolve(outputPath));
  });
});

describe('plugin system and transform hooks branches', () => {
  test('plugin validation errors and missing plugin errors', () => {
    const manager = new PluginManager();
    expect(() => manager.use('bad', { version: '1.0.0' })).toThrow('name');
    expect(() => manager.use('bad2', { name: 'x', version: '1.0.0', hooks: 'nope' }))
      .toThrow('hooks');
    expect(() => manager.use('bad3', { name: 'x', version: '1.0.0', hooks: { a: 1 } }))
      .toThrow('Hook handler');
    expect(() => manager.use('bad4', { name: 'x', version: '1.0.0', middlewares: {} }))
      .toThrow('middlewares');
    expect(() => manager.use('bad5', { name: 'x', version: '1.0.0', middlewares: [1] }))
      .toThrow('Middleware 0');
    expect(() => manager.setPluginEnabled('missing', true)).toThrow(/не найден/);
    expect(() => manager.removePlugin('missing')).toThrow(/не найден/);
  });

  test('plugin warnings for slow hooks and middlewares', async () => {
    const manager = new PluginManager();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const nowSpy = jest.spyOn(Date, 'now');
    let ticks = 0;
    nowSpy.mockImplementation(() => {
      ticks += 200;
      return ticks;
    });

    manager.registerHook('before:test', async (data) => data, 'slow');
    await manager.executeHooks('before:test', { ok: true }, {});
    manager.registerMiddleware(async (ctx, next) => {
      await next();
    }, 'slow-mw');
    await manager.executeMiddlewares({});

    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    nowSpy.mockRestore();
  });

  test('predefined hooks return data for non-array inputs', () => {
    const hooks = [
      predefinedHooks.filter(() => true),
      predefinedHooks.map((v) => v),
      predefinedHooks.sort(() => 0),
      predefinedHooks.limit(1),
      predefinedHooks.addMetadata({ a: 1 }),
      predefinedHooks.transformKeys((k) => k),
      predefinedHooks.transformValues((v) => v),
      predefinedHooks.validate(() => true),
      predefinedHooks.deduplicate()
    ];

    for (const hook of hooks) {
      const result = hook('not-array', {});
      expect(result).toBe('not-array');
    }
  });

  test('predefined validate captures thrown errors', () => {
    const errors = [];
    const hook = predefinedHooks.validate(() => {
      throw new Error('nope');
    }, (...args) => errors.push(args));
    const result = hook([{ id: 1 }]);
    expect(result).toEqual([]);
    expect(errors.length).toBe(1);
  });

  test('predefined validate skips onError when clean', () => {
    const onError = jest.fn();
    const hook = predefinedHooks.validate(() => true, onError);
    const result = hook([{ id: 1 }]);
    expect(result).toEqual([{ id: 1 }]);
    expect(onError).not.toHaveBeenCalled();
  });

  test('TransformHooks applyAll handles non-array and perRow hooks', () => {
    const hooks = new TransformHooks();
    expect(() => hooks.applyAll('nope')).toThrow('Data must be an array');
    hooks.perRow((row) => ({ ...row, ok: true }));
    const result = hooks.applyAll([{ a: 1 }]);
    expect(result[0].ok).toBe(true);
  });

  test('TransformHooks applyAll runs without perRow hooks', () => {
    const hooks = new TransformHooks();
    const result = hooks.applyAll([{ a: 1 }]);
    expect(result).toEqual([{ a: 1 }]);
  });
});

describe('FastPathEngine internal branches', () => {
  test('simple emitters and generators cover CRLF and escapes', () => {
    const engine = new FastPathEngine();
    const rows = [];
    engine._emitSimpleRows('a,b\r\nc,d\r\n', ',', (row) => rows.push(row));
    expect(rows.length).toBe(2);

    const escapedRows = [];
    engine._emitSimpleRowsEscaped('a\\\\,b\n', ',', (row) => escapedRows.push(row));
    engine._emitSimpleRowsEscaped('a\\\n', ',', (row) => escapedRows.push(row));
    engine._emitSimpleRowsEscaped('a\\x,b\n', ',', (row) => escapedRows.push(row));
    engine._emitSimpleRowsEscaped('a\\\r\n', ',', (row) => escapedRows.push(row));
    engine._emitSimpleRowsEscaped('a\\', ',', (row) => escapedRows.push(row));
    expect(escapedRows.length).toBeGreaterThan(0);

    const genRows = Array.from(engine._simpleEscapedRowsGenerator('a\\\\,b\r\n', ','));
    const genRowsEsc = Array.from(engine._simpleEscapedRowsGenerator('a\\x,b\n', ','));
    const genRowsCr = Array.from(engine._simpleEscapedRowsGenerator('a\\\r\n', ','));
    expect(genRows.length).toBeGreaterThan(0);
    expect(genRowsEsc.length).toBeGreaterThan(0);
    expect(genRowsCr.length).toBeGreaterThan(0);
  });

  test('quote-aware generators handle escaped quotes and errors', () => {
    const engine = new FastPathEngine();
    const csv = '"a""b",c\n';
    const rows = Array.from(engine._quoteAwareRowsGenerator(csv, ',', true));
    expect(rows[0][0]).toContain('"');

    const escapedCsv = '"a""\n';
    const escapedRows = Array.from(engine._quoteAwareEscapedRowsGenerator(escapedCsv, ',', true));
    expect(escapedRows.length).toBe(1);

    const errorCsv = '"a\n';
    expect(() => Array.from(engine._quoteAwareRowsGenerator(errorCsv, ',', false)))
      .toThrow('Unclosed quotes');
  });

  test('escaped quote-aware generator handles backslashes and CRLF', () => {
    const engine = new FastPathEngine();
    const csv = 'a\\\\\r\nb\\\n"c""\n';
    const rows = Array.from(engine._quoteAwareEscapedRowsGenerator(csv, ',', true));
    expect(rows.length).toBeGreaterThan(0);
  });

  test('quote-aware generators cover whitespace and inline quotes', () => {
    const engine = new FastPathEngine();
    const weirdCsv = '"a"" ,b\n';
    const rows = Array.from(engine._quoteAwareRowsGenerator(weirdCsv, ',', true));
    expect(rows.length).toBe(1);

    const escapedRows = Array.from(engine._quoteAwareEscapedRowsGenerator(weirdCsv, ',', true));
    expect(escapedRows.length).toBe(1);

    const closingCsv = '"a" ,b\n';
    const closeRows = Array.from(engine._quoteAwareEscapedRowsGenerator(closingCsv, ',', false));
    expect(closeRows.length).toBe(1);

    const inlineCsv = '"a"b",c\n';
    const inlineRows = Array.from(engine._quoteAwareEscapedRowsGenerator(inlineCsv, ',', false));
    expect(inlineRows.length).toBe(1);

    const trailingBackslash = Array.from(engine._quoteAwareEscapedRowsGenerator('a\\', ',', false));
    expect(trailingBackslash.length).toBe(1);
  });

  test('compileRowEmitter and iterateRows use defaults', () => {
    const engine = new FastPathEngine();
    const structure = { delimiter: ',', hasBackslashes: false, hasEscapedQuotes: false, recommendedEngine: 'UNKNOWN' };
    const emitter = engine.compileRowEmitter(structure);
    const out = [];
    emitter('a,b\n', (row) => out.push(row));
    expect(out.length).toBe(1);

    const rows = Array.from(engine.iterateRows('a\\,b\n', { forceEngine: 'UNKNOWN' }));
    expect(rows.length).toBe(1);
  });

  test('compileRowEmitter and iterateRows cover quote-aware paths', () => {
    const engine = new FastPathEngine();
    const quoteStructure = { delimiter: ',', hasBackslashes: true, hasEscapedQuotes: true, recommendedEngine: 'QUOTE_AWARE' };
    const emitter = engine.compileRowEmitter(quoteStructure);
    const out = [];
    emitter('"a","b"\n', (row) => out.push(row));
    expect(out.length).toBe(1);

    const standardStructure = { delimiter: ',', hasBackslashes: false, hasEscapedQuotes: true, recommendedEngine: 'STANDARD' };
    const emitterStandard = engine.compileRowEmitter(standardStructure);
    const outStandard = [];
    emitterStandard('"a","b"\n', (row) => outStandard.push(row));
    expect(outStandard.length).toBe(1);

    const rows = Array.from(engine.iterateRows('a,b\n', { forceEngine: 'UNKNOWN' }));
    expect(rows.length).toBe(1);
  });

  test('simple row emitter handles backslashes and plain rows', () => {
    const engine = new FastPathEngine();
    const emitterEscaped = engine._createSimpleRowEmitter({ delimiter: ',', hasBackslashes: true });
    const rowsEscaped = [];
    emitterEscaped('a\\,b\n', (row) => rowsEscaped.push(row));
    expect(rowsEscaped.length).toBe(1);

    const emitterPlain = engine._createSimpleRowEmitter({ delimiter: ',', hasBackslashes: false });
    const rowsPlain = [];
    emitterPlain('a,b\n', (row) => rowsPlain.push(row));
    expect(rowsPlain.length).toBe(1);
  });
});

describe('NDJSON parser branches', () => {
  test('parseStream handles string input with onError', async () => {
    const errors = [];
    const input = '{"a":1}\n{bad}\n';
    const results = [];
    for await (const obj of NdjsonParser.parseStream(input, {
      onError: (err, line, lineNumber) => errors.push({ err, line, lineNumber })
    })) {
      results.push(obj);
    }
    expect(results.length).toBe(1);
    expect(errors.length).toBe(1);
  });

  test('parseStream handles reader input without getReader', async () => {
    let released = false;
    const reader = {
      read: async () => ({ done: true, value: null }),
      releaseLock: () => {
        released = true; 
      }
    };
    const items = [];
    for await (const obj of NdjsonParser.parseStream(reader)) {
      items.push(obj);
    }
    expect(items).toEqual([]);
    expect(released).toBe(true);
  });

  test('parseStream handles reader chunks with errors', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode('{"a":1}\n{bad}\n'),
      encoder.encode('{"b":2}\n')
    ];
    let index = 0;
    const reader = {
      read: async () => {
        if (index < chunks.length) {
          return { done: false, value: chunks[index++] };
        }
        return { done: true, value: null };
      },
      releaseLock: jest.fn()
    };
    const errors = [];
    const results = [];
    for await (const obj of NdjsonParser.parseStream(reader, {
      onError: (err, line, lineNumber) => errors.push({ err, line, lineNumber })
    })) {
      results.push(obj);
    }
    expect(results.length).toBe(2);
    expect(errors.length).toBe(1);
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  test('parseStream handles trailing buffer on done', async () => {
    const encoder = new TextEncoder();
    let done = false;
    const reader = {
      read: async () => {
        if (!done) {
          done = true;
          return { done: false, value: encoder.encode('{bad}') };
        }
        return { done: true, value: null };
      },
      releaseLock: jest.fn()
    };
    const errors = [];
    const results = [];
    for await (const obj of NdjsonParser.parseStream(reader, {
      onError: (err, line, lineNumber) => errors.push({ err, line, lineNumber })
    })) {
      results.push(obj);
    }
    expect(results.length).toBe(0);
    expect(errors.length).toBe(1);
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  test('parseStream handles ReadableStream input', async () => {
    const encoder = new TextEncoder();
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"a":1}\n{bad}\n'));
        controller.close();
      }
    });
    const errors = [];
    const results = [];
    for await (const obj of NdjsonParser.parseStream(input, {
      onError: (err, line, lineNumber) => errors.push({ err, line, lineNumber })
    })) {
      results.push(obj);
    }
    expect(results.length).toBe(1);
    expect(errors.length).toBe(1);
  });

  test('createCsvToNdjsonStream covers missing fields', async () => {
    const stream = NdjsonParser.createCsvToNdjsonStream({ hasHeaders: true, delimiter: ',' });
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    const readPromise = (async () => {
      let output = '';
       
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        output += value;
      }
      return output;
    })();

    await writer.write('a,b\n1\n');
    await writer.close();

    const output = await readPromise;
    expect(output).toContain('"b":""');
  });

  test('getStats handles stream input', async () => {
    const encoder = new TextEncoder();
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"a":1}\n'));
        controller.enqueue(encoder.encode('{bad}\n{"b":2}'));
        controller.close();
      }
    });
    const stats = await NdjsonParser.getStats(input);
    expect(stats.totalLines).toBeGreaterThan(0);
    expect(stats.errorLines).toBeGreaterThan(0);
  });
});

describe('TSV parser validation branches', () => {
  test('validateTsv detects inconsistent columns', () => {
    const tsv = 'a\tb\n1\n2\t3\t4';
    const result = TsvParser.validateTsv(tsv, { requireConsistentColumns: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeTruthy();
  });

  test('validateTsv uses stats fields', () => {
    const tsv = 'a\tb\n1\t2';
    const result = TsvParser.validateTsv(tsv, { requireConsistentColumns: false });
    expect(result.stats.totalColumns).toBe(2);
  });
});

describe('stream modules schema fallbacks', () => {
  test('createCsvToJsonStream with schema and no validators', async () => {
    const stream = createCsvToJsonStream({ delimiter: ',', schema: {} });
    const results = [];
    await new Promise((resolve, reject) => {
      stream.on('data', (row) => results.push(row));
      stream.on('error', reject);
      stream.on('end', resolve);
      stream.end('a,b\n1,2\n');
    });
    expect(results.length).toBe(1);
  });

  test('createJsonToCsvStream with schema and no validators', async () => {
    const stream = createJsonToCsvStream({ schema: {} });
    let output = '';
    await new Promise((resolve, reject) => {
      stream.on('data', (chunk) => {
        output += chunk; 
      });
      stream.on('error', reject);
      stream.on('end', resolve);
      stream.end({ a: 1 });
    });
    expect(output).toContain('a');
  });
});
