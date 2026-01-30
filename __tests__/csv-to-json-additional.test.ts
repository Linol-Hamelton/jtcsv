import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  csvToJson,
  csvToJsonIterator,
  TransformHooks,
  createDelimiterCache,
  getDelimiterCacheStats,
  clearDelimiterCache
} from '../csv-to-json';
import { ParsingError, LimitError } from '../errors';

describe('csv-to-json additional coverage', () => {
  test('rejects invalid cache and hook options', () => {
    const csv = 'id,name\n1,John';

    expect(() => csvToJson(csv, { useCache: 'yes' }))
      .toThrow('useCache must be a boolean');
    expect(() => csvToJson(csv, { cache: {} }))
      .toThrow('cache must be an instance of DelimiterCache');
    expect(() => csvToJson(csv, { useFastPath: 'no' }))
      .toThrow('useFastPath must be a boolean');
    expect(() => csvToJson(csv, { fastPathMode: 'fast' }))
      .toThrow('fastPathMode must be "objects", "compact", or "stream"');
    expect(() => csvToJson(csv, { hooks: 'bad' }))
      .toThrow('hooks must be an object');
    expect(() => csvToJson(csv, { hooks: { beforeConvert: true } }))
      .toThrow('hooks.beforeConvert must be a function');
    expect(() => csvToJson(csv, { hooks: { afterConvert: true } }))
      .toThrow('hooks.afterConvert must be a function');
    expect(() => csvToJson(csv, { hooks: { perRow: true } }))
      .toThrow('hooks.perRow must be a function');
    expect(() => csvToJson(csv, { hooks: { transformHooks: {} } }))
      .toThrow('hooks.transformHooks must be an instance of TransformHooks');
  });

  test('applies hooks and compact mode', () => {
    const csv = 'id,name\n1,John\n2,Jane';
    const hooks = {
      beforeConvert: (input) => input.replace('John', 'Jack'),
      perRow: (row, index) => ({ ...row, index }),
      afterConvert: (rows) => rows.filter((row) => row.id === '2')
    };

    const result = csvToJson(csv, { delimiter: ',', hooks });

    expect(result).toEqual([{ id: '2', name: 'Jane', index: 1 }]);

    const compact = csvToJson(csv, {
      delimiter: ',',
      fastPathMode: 'compact'
    });

    expect(compact[0]).toEqual(['1', 'John']);
  });

  test('uses provided TransformHooks instance', () => {
    const csv = 'id,name\n1,John';
    const hooksInstance = new TransformHooks();
    hooksInstance.perRow((row) => ({ ...row, tagged: true }));

    const result = csvToJson(csv, {
      delimiter: ',',
      hooks: { transformHooks: hooksInstance }
    });

    expect(result).toEqual([{ id: '1', name: 'John', tagged: true }]);
  });

  test('returns async iterator for stream fastPathMode', async () => {
    const csv = 'id,name\n1,John\n2,Jane';
    const iterator = csvToJson(csv, {
      delimiter: ',',
      fastPathMode: 'stream'
    });

    const rows = [];
    for await (const row of iterator) {
      rows.push(row);
    }

    expect(rows).toEqual([
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' }
    ]);
  });

  test('uses standard engine when useFastPath=false', () => {
    const csv = 'id,name\n1,John';
    const result = csvToJson(csv, { delimiter: ',', useFastPath: false });
    expect(result).toEqual([{ id: '1', name: 'John' }]);
  });

  test('warns about extra fields in development', () => {
    const csv = 'id,name\n1,John,Extra';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'development';
      const result = csvToJson(csv, { delimiter: ',' });
      expect(result).toEqual([{ id: '1', name: 'John' }]);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
      warnSpy.mockRestore();
    }
  });

  test('iterator yields nothing for blank input', async () => {
    const iterator = csvToJsonIterator('   ', { delimiter: ',' });
    const rows = [];
    for await (const row of iterator) {
      rows.push(row);
    }
    expect(rows).toHaveLength(0);
  });

  test('iterator generates headers when missing', async () => {
    const csv = '1,John';
    const rows = [];
    for await (const row of csvToJsonIterator(csv, { delimiter: ',', hasHeaders: false })) {
      rows.push(row);
    }
    expect(rows[0]).toEqual({ column1: '1', column2: 'John' });
  });

  test('iterator enforces maxRows and warns about extra fields', async () => {
    const csv = 'id,name\n1,John,Extra\n2,Jane';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'development';
      const rows = [];
      for await (const row of csvToJsonIterator(csv, { delimiter: ',', maxRows: 10 })) {
        rows.push(row);
      }
      expect(rows).toHaveLength(2);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
      warnSpy.mockRestore();
    }

    await expect(async () => {
      const rows = [];
      for await (const row of csvToJsonIterator(csv, { delimiter: ',', maxRows: 1 })) {
        rows.push(row);
      }
    }).rejects.toThrow(LimitError);
  });

  test('iterator converts FAST_PATH_UNCLOSED_QUOTES to ParsingError', async () => {
    const csv = 'id,name\n1,"John';

    await expect(async () => {
      for await (const _row of csvToJsonIterator(csv, { delimiter: ',' })) {
        // drain
      }
    }).rejects.toThrow(ParsingError);
  });

  test('delimiter cache stats can be reset', () => {
    const csv = 'id,name\n1,John';
    createDelimiterCache(10);

    csvToJson(csv);
    const before = getDelimiterCacheStats();

    clearDelimiterCache();
    const after = getDelimiterCacheStats();

    expect(before.totalRequests).toBeGreaterThan(0);
    expect(after.size).toBe(0);
    expect(after.totalRequests).toBe(0);
  });
});
