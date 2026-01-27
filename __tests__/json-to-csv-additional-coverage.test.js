const { jsonToCsv, deepUnwrap, preprocessData } = require('../json-to-csv');

describe('jsonToCsv additional coverage', () => {
  test('rejects invalid preventCsvInjection option type', () => {
    const data = [{ id: 1 }];
    expect(() => jsonToCsv(data, { preventCsvInjection: 'yes' }))
      .toThrow('preventCsvInjection must be a boolean');
  });

  test('rejects invalid rfc4180Compliant option type', () => {
    const data = [{ id: 1 }];
    expect(() => jsonToCsv(data, { rfc4180Compliant: 'no' }))
      .toThrow('rfc4180Compliant must be a boolean');
  });

  test('warns on very large datasets outside test env', () => {
    const originalEnv = process.env.NODE_ENV;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      process.env.NODE_ENV = 'development';
      const data = new Array(1000001);
      data[0] = { id: 1 };
      data.forEach = (cb) => cb(data[0], 0, data);
      data[Symbol.iterator] = function* () {
        yield data[0];
      };

      jsonToCsv(data);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
      warnSpy.mockRestore();
    }
  });

  test('appends extra headers after template ordering', () => {
    const data = [{ id: 1, name: 'Alice', age: 30 }];
    const csv = jsonToCsv(data, { template: { id: null } });
    const headerRow = csv.split(/\r?\n/)[0];

    expect(headerRow).toBe('id;name;age');
  });

  test('applies renameMap with template and keeps unmapped headers', () => {
    const data = [{ id: 1, name: 'Alice' }];
    const csv = jsonToCsv(data, {
      renameMap: { id: 'ID' },
      template: { id: null, extra: null }
    });
    const rows = csv.split(/\r?\n/);

    expect(rows[0]).toBe('ID;extra;name');
    expect(rows[1]).toBe('1;;Alice');
  });

  test('does not escape formulas when preventCsvInjection is false', () => {
    const data = [{ formula: '=SUM(1,2)' }];
    const csv = jsonToCsv(data, { preventCsvInjection: false });
    const rows = csv.split(/\r?\n/);

    expect(rows[0]).toBe('formula');
    expect(rows[1]).toBe('=SUM(1,2)');
  });
});

describe('deepUnwrap edge cases', () => {
  test('returns circular marker for self-referential arrays', () => {
    const arr = [];
    arr.push(arr);
    expect(deepUnwrap(arr)).toBe('[Circular Reference]');
  });

  test('returns unstringifiable marker when JSON.stringify throws', () => {
    const obj = {
      toJSON() {
        throw new Error('boom');
      }
    };

    expect(deepUnwrap(obj)).toBe('[Unstringifiable Object]');
  });
});

describe('preprocessData inherited keys', () => {
  test('skips inherited enumerable properties', () => {
    const proto = {};
    Object.defineProperty(proto, 'inherited', {
      value: { value: 'proto' },
      enumerable: true
    });
    const item = Object.create(proto);
    item.own = { nested: 'value' };

    const [processed] = preprocessData([item]);

    expect(Object.prototype.hasOwnProperty.call(processed, 'inherited')).toBe(false);
    expect(typeof processed.own).toBe('string');
  });
});

describe('module export guard', () => {
  test('runs without a module object', () => {
    const fs = require('fs');
    const vm = require('vm');
    const { createRequire } = require('module');
    const { createInstrumenter } = require('istanbul-lib-instrument');

    const filePath = require.resolve('../json-to-csv');
    const source = fs.readFileSync(filePath, 'utf8');
    const instrumenter = createInstrumenter({ coverageVariable: '__coverage__' });
    const instrumented = instrumenter.instrumentSync(source, filePath);

    global.__coverage__ = global.__coverage__ || {};
    const moduleStub = {};
    Object.defineProperty(moduleStub, 'exports', {
      get() {
        return null;
      },
      set() {}
    });

    const context = {
      __coverage__: global.__coverage__,
      console,
      process,
      Buffer,
      setTimeout,
      clearTimeout,
      module: moduleStub,
      require: createRequire(filePath)
    };
    context.global = context;
    context.globalThis = context;

    expect(() => vm.runInNewContext(instrumented, context)).not.toThrow();
  });
});
