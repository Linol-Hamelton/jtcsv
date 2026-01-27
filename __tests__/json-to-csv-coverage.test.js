const { jsonToCsv, preprocessData, deepUnwrap, saveAsCsv } = require('../json-to-csv');
const { ValidationError, ConfigurationError, LimitError, SecurityError, FileSystemError } = require('../errors');

// Mock console to avoid output in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Mock fs for file reading tests
jest.mock('fs', () => {
  const mockFs = {
    promises: {
      mkdir: jest.fn(),
      writeFile: jest.fn()
    }
  };
  return mockFs;
});

// Mock path module
jest.mock('path', () => {
  const actualPath = jest.requireActual('path');
  return {
    ...actualPath,
    resolve: jest.fn((p) => p),
    normalize: jest.fn((p) => p),
    dirname: jest.fn((p) => '/test/dir'),
    extname: jest.fn((p) => {
      const lastDot = p.lastIndexOf('.');
      return lastDot === -1 ? '' : p.substring(lastDot);
    })
  };
});

const fs = require('fs');
const path = require('path');

describe('JSON to CSV Coverage Tests', () => {
  describe('jsonToCsv edge cases', () => {
    test('should handle non-object options gracefully', () => {
      const data = [{ id: 1, name: 'John' }];
      
      // This should throw ConfigurationError because validateInput is called before safeExecute
      expect(() => jsonToCsv(data, 'not an object'))
        .toThrow(ConfigurationError);
    });

    test('should handle schema validation with createSchemaValidators', () => {
      const data = [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 }
      ];
      
      const schema = {
        id: { type: 'number', required: true },
        name: { type: 'string', required: true },
        age: { type: 'number', required: false }
      };
      
      const result = jsonToCsv(data, { schema });
      expect(typeof result).toBe('string');
      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('age');
    });

    test('should handle schema validation errors', () => {
      const data = [
        { id: 'not a number', name: 'John' }
      ];
      
      const schema = {
        id: { type: 'number', required: true },
        name: { type: 'string', required: true }
      };
      
      // This should throw ValidationError when schema validation fails
      expect(() => jsonToCsv(data, { schema }))
        .toThrow(ValidationError);
    });
  });

  describe('deepUnwrap edge cases', () => {
    test('should handle circular references', () => {
      const obj = { name: 'Test' };
      obj.self = obj; // Create circular reference
      
      const result = deepUnwrap(obj);
      expect(result).toBe('[Circular Reference]');
    });

    test('should handle unstringifiable objects', () => {
      // Create an object that cannot be stringified
      // We need to mock JSON.stringify to throw an error
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn(() => {
        throw new Error('Cannot stringify');
      });
      
      try {
        const obj = { name: 'Test' };
        const result = deepUnwrap(obj);
        expect(result).toBe('[Unstringifiable Object]');
      } finally {
        JSON.stringify = originalStringify;
      }
    });

    test('should handle maximum depth', () => {
      const nested = { level1: { level2: { level3: { level4: { level5: 'deep' } } } } };
      
      // With maxDepth = 0, we should get [Too Deep] immediately for objects
      const result = deepUnwrap(nested, 0, 0);
      expect(result).toBe('[Too Deep]');
    });

    test('should handle empty arrays', () => {
      const result = deepUnwrap([]);
      expect(result).toBe('');
    });

    test('should handle empty objects', () => {
      const result = deepUnwrap({});
      expect(result).toBe('');
    });

    test('should handle null and undefined', () => {
      expect(deepUnwrap(null)).toBe('');
      expect(deepUnwrap(undefined)).toBe('');
    });

    test('should handle primitive values', () => {
      expect(deepUnwrap(42)).toBe('42');
      expect(deepUnwrap('test')).toBe('test');
      expect(deepUnwrap(true)).toBe('true');
    });
  });

  describe('preprocessData edge cases', () => {
    test('should handle non-array input', () => {
      const result = preprocessData('not an array');
      expect(result).toEqual([]);
    });

    test('should handle null/undefined items', () => {
      const data = [null, undefined, { id: 1 }];
      const result = preprocessData(data);
      expect(result).toEqual([{}, {}, { id: 1 }]);
    });

    test('should handle non-object items', () => {
      const data = ['string', 42, true, { id: 1 }];
      const result = preprocessData(data);
      expect(result).toEqual([{}, {}, {}, { id: 1 }]);
    });
  });

  describe('saveAsCsv edge cases', () => {
    beforeEach(() => {
      fs.promises.mkdir.mockReset();
      fs.promises.writeFile.mockReset();
      path.resolve.mockImplementation((p) => p);
      path.normalize.mockImplementation((p) => p);
      path.dirname.mockImplementation((p) => '/test/dir');
      path.extname.mockImplementation((p) => {
        const lastDot = p.lastIndexOf('.');
        return lastDot === -1 ? '' : p.substring(lastDot);
      });
    });

    test('should handle ENOSPC error (no space left on device)', async () => {
      const data = [{ id: 1, name: 'John' }];
      const error = new Error('No space left');
      error.code = 'ENOSPC';
      fs.promises.writeFile.mockRejectedValue(error);
      
      await expect(saveAsCsv(data, './output.csv'))
        .rejects
        .toThrow(FileSystemError);
    });

    test('should handle other file system errors', async () => {
      const data = [{ id: 1, name: 'John' }];
      const error = new Error('Unknown error');
      error.code = 'UNKNOWN';
      fs.promises.writeFile.mockRejectedValue(error);
      
      await expect(saveAsCsv(data, './output.csv'))
        .rejects
        .toThrow(FileSystemError);
    });
  });

  describe('validateFilePath edge cases', () => {
    // Note: validateFilePath is not exported, so we test it indirectly through saveAsCsv
    test('should reject file paths without .csv extension', async () => {
      const data = [{ id: 1, name: 'John' }];
      
      await expect(saveAsCsv(data, './output.txt'))
        .rejects
        .toThrow(ValidationError);
    });

    test('should reject empty file paths', async () => {
      const data = [{ id: 1, name: 'John' }];
      
      await expect(saveAsCsv(data, ''))
        .rejects
        .toThrow(ValidationError);
    });

    test('should reject non-string file paths', async () => {
      const data = [{ id: 1, name: 'John' }];
      
      await expect(saveAsCsv(data, 123))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
