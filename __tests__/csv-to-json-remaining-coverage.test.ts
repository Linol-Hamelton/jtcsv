import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
describe('csv-to-json remaining coverage', () => {
  afterEach(() => {
    jest.dontMock('../src/engines/fast-path-engine');
    jest.resetModules();
  });

  test('returns empty array when fast path yields no rows', () => {
    const parseRows = jest.fn();

    jest.doMock('../src/engines/fast-path-engine', () => {
      return jest.fn().mockImplementation(() => ({
        parseRows,
        iterateRows: jest.fn(function* () {})
      }));
    });

    const { csvToJson } = require("../csv-to-json");
    const result = csvToJson('id,name\n1,John');

    expect(parseRows).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('skips empty fields arrays in fast path parse', () => {
    const parseRows = jest.fn((csv, options, callback) => {
      callback(['id']);
      callback([]);
      callback(['1']);
    });

    jest.doMock('../src/engines/fast-path-engine', () => {
      return jest.fn().mockImplementation(() => ({
        parseRows,
        iterateRows: jest.fn(function* () {})
      }));
    });

    const { csvToJson } = require("../csv-to-json");
    const result = csvToJson('id\n1');

    expect(result).toEqual([{ id: '1' }]);
  });

  test('iterator uses hooks and respects useFastPath=false', async () => {
    let seenOptions;
    const iterateRows = jest.fn(function* (csv, options) {
      seenOptions = options;
      yield ['id'];
      yield [];
      yield ['1'];
    });

    jest.doMock('../src/engines/fast-path-engine', () => {
      return jest.fn().mockImplementation(() => ({
        parseRows: jest.fn(),
        iterateRows
      }));
    });

    const { csvToJsonIterator } = require("../csv-to-json");

    const hooks = {
      beforeConvert: (data) => data,
      afterConvert: () => {},
      perRow: (row, index) => ({ ...row, idx: index })
    };

    const results = [];
    for await (const row of csvToJsonIterator('id\n1', { hooks, useFastPath: false })) {
      results.push(row);
    }

    expect(seenOptions.forceEngine).toBe('STANDARD');
    expect(results).toEqual([{ id: '1', idx: 0 }]);
  });
});
