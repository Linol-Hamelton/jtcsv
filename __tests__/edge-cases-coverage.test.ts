import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { jsonToCsv, preprocessData, deepUnwrap, ConfigurationError } from '../index';

// Mock console to avoid output in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Edge Cases Coverage Tests', () => {
  describe('ConfigurationError Coverage', () => {
    test('should throw ConfigurationError for non-string delimiter', () => {
      expect(() => jsonToCsv([], { delimiter: 123 }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for multi-character delimiter', () => {
      expect(() => jsonToCsv([], { delimiter: ';;' }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for non-object renameMap', () => {
      expect(() => jsonToCsv([], { renameMap: 'not an object' }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for zero maxRecords', () => {
      expect(() => jsonToCsv([], { maxRecords: 0 }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for negative maxRecords', () => {
      expect(() => jsonToCsv([], { maxRecords: -1 }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for non-number maxRecords', () => {
      expect(() => jsonToCsv([], { maxRecords: 'not a number' }))
        .toThrow(ConfigurationError);
    });
  });

  describe('Template Headers Coverage', () => {
    test('should apply template ordering correctly', () => {
      const data = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ];
      
      const template = { email: '', name: '', id: '' }; // Reverse order
      const result = jsonToCsv(data, { template, rfc4180Compliant: false });
      
      const lines = result.split('\n');
      expect(lines[0]).toBe('email;name;id');
    });

    test('should apply renameMap with template', () => {
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ];
      
      const renameMap = { id: 'ID', name: 'Full Name' };
      const template = { name: '', id: '' }; // Specific order
      const result = jsonToCsv(data, { renameMap, template, rfc4180Compliant: false });
      
      const lines = result.split('\n');
      expect(lines[0]).toBe('Full Name;ID');
    });
  });

  describe('deepUnwrap Coverage', () => {
    test('should return [Too Deep] when max depth is reached', () => {
      const nested = { 
        level1: { 
          level2: 'value' 
        } 
      };
      
      // With maxDepth=0, should return [Too Deep] immediately
      const result = deepUnwrap(nested, 0, 0);
      expect(result).toBe('[Too Deep]');
    });

    test('should handle circular references', () => {
      const obj = { name: 'John' };
      obj.self = obj; // Circular reference
      
      const result = deepUnwrap(obj);
      expect(result).toBe('[Circular Reference]');
    });
  });

  describe('preprocessData Coverage', () => {
    test('should return empty array for non-array input', () => {
      expect(preprocessData(null)).toEqual([]);
      expect(preprocessData(undefined)).toEqual([]);
      expect(preprocessData('string')).toEqual([]);
      expect(preprocessData(123)).toEqual([]);
      expect(preprocessData({})).toEqual([]);
    });

    test('should return empty object for non-object items', () => {
      const data = [null, undefined, 'string', 123];
      const result = preprocessData(data);
      
      expect(result.length).toBe(4);
      expect(result[0]).toEqual({});
      expect(result[1]).toEqual({});
      expect(result[2]).toEqual({});
      expect(result[3]).toEqual({});
    });
  });

  describe('saveAsCsv Coverage', () => {
    let mockFs;

    beforeEach(() => {
      jest.resetModules();

      // Mock fs and path for saveAsCsv tests
      jest.doMock('fs', () => ({
        promises: {
          writeFile: jest.fn(),
          mkdir: jest.fn()
        }
      }));
      
      jest.doMock('path', () => ({
        resolve: jest.fn((p) => `/absolute/${p}`),
        normalize: jest.fn((p) => p),
        dirname: jest.fn((p) => '/absolute/dir'),
        extname: jest.fn((p) => '.csv')
      }));
      
      mockFs = require('fs');
    });
    
    afterEach(() => {
      jest.dontMock('fs');
      jest.dontMock('path');
      jest.resetModules();
    });

    test('should handle directory does not exist error', async () => {
      const mockedIndex = require('../index');

      const error = new Error('Directory not found');
      error.code = 'ENOENT';
      mockFs.promises.mkdir.mockRejectedValue(error);
      
      await expect(mockedIndex.saveAsCsv([{ id: 1 }], 'test.csv'))
        .rejects
        .toThrow(expect.objectContaining({
          name: 'FileSystemError',
          code: 'FILE_SYSTEM_ERROR'
        }));
    });

    test('should not log to console in non-test environment', async () => {
      // Temporarily set NODE_ENV to something other than 'test'
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const mockedIndex = require('../index');

        mockFs.promises.mkdir.mockResolvedValue();
        mockFs.promises.writeFile.mockResolvedValue();
        
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        
        await mockedIndex.saveAsCsv([{ id: 1 }], 'test.csv');
        
        // The saveAsCsv function should not log to console by design
        // It should return the path instead (clean API without side effects)
        expect(consoleLogSpy).not.toHaveBeenCalled();
        
        consoleLogSpy.mockRestore();
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});
