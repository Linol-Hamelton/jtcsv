// Add imports at the top of the file
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  csvToJson,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter
} from '../csv-to-json';

import {
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError
} from '../errors';

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
      readFile: jest.fn()
    },
    readFileSync: jest.fn()
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
    extname: jest.fn((p) => {
      const lastDot = p.lastIndexOf('.');
      return lastDot === -1 ? '' : p.substring(lastDot);
    })
  };
});

import fs from 'fs';
import path from 'path';

describe('CSV to JSON Functions', () => {
  describe('csvToJson', () => {
    test('should convert simple CSV to JSON', () => {
      const csv = 'id;name;email\n1;John;john@example.com\n2;Jane;jane@example.com';
      const result = csvToJson(csv, { delimiter: ';' });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
      expect(result[1]).toEqual({ id: '2', name: 'Jane', email: 'jane@example.com' });
    });

    test('should use custom delimiter', () => {
      const csv = 'id,name,email\n1,John,john@example.com';
      const result = csvToJson(csv, { delimiter: ',' });
      
      expect(result[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
    });

    test('should parse numbers when parseNumbers option is true', () => {
      const csv = 'id;age;price\n1;30;99.99\n2;25;49.50';
      const result = csvToJson(csv, { delimiter: ';', parseNumbers: true });
      
      expect(result[0].id).toBe(1);
      expect(result[0].age).toBe(30);
      expect(result[0].price).toBe(99.99);
      expect(result[1].id).toBe(2);
      expect(result[1].age).toBe(25);
      expect(result[1].price).toBe(49.50);
    });

    test('should parse booleans when parseBooleans option is true', () => {
      const csv = 'id;active;verified\n1;true;false\n2;false;true';
      const result = csvToJson(csv, { delimiter: ';', parseBooleans: true });
      
      expect(result[0].active).toBe(true);
      expect(result[0].verified).toBe(false);
      expect(result[1].active).toBe(false);
      expect(result[1].verified).toBe(true);
    });

    test('should handle CSV without headers', () => {
      const csv = '1;John;john@example.com\n2;Jane;jane@example.com';
      const result = csvToJson(csv, { delimiter: ';', hasHeaders: false });
      
      expect(result[0]).toEqual({ column1: '1', column2: 'John', column3: 'john@example.com' });
      expect(result[1]).toEqual({ column1: '2', column2: 'Jane', column3: 'jane@example.com' });
    });

    test('should rename headers using renameMap', () => {
      const csv = 'id;name;email\n1;John;john@example.com';
      const result = csvToJson(csv, { 
        delimiter: ';', 
        renameMap: { id: 'ID', name: 'Full Name', email: 'Email Address' }
      });
      
      expect(result[0]).toEqual({ 
        'ID': '1', 
        'Full Name': 'John', 
        'Email Address': 'john@example.com' 
      });
    });

    test('should handle empty CSV', () => {
      expect(csvToJson('')).toEqual([]);
      expect(csvToJson('   ')).toEqual([]);
    });

    test('should handle quoted values', () => {
      const csv = `id;text
1;"Hello, World!"
2;"He said "Hi""`;
      const result = csvToJson(csv, { delimiter: ';' });
      
      expect(result[0].text).toBe('Hello, World!');
      expect(result[1].text).toBe('He said "Hi"');
    });

    test('should handle newlines in quoted values', () => {
      const csv = 'id;text\n1;"Line 1\nLine 2"';
      const result = csvToJson(csv, { delimiter: ';' });
      
      expect(result[0].text).toBe('Line 1\nLine 2');
    });

    test('should throw ParsingError for malformed CSV', () => {
      const csv = 'id;name\n1;"John'; // Unclosed quote
      
      expect(() => csvToJson(csv, { delimiter: ';' }))
        .toThrow(ParsingError);
    });

    test('should throw ValidationError for non-string input', () => {
      expect(() => csvToJson(null)).toThrow(ValidationError);
      expect(() => csvToJson(123)).toThrow(ValidationError);
      expect(() => csvToJson({})).toThrow(ValidationError);
    });

    test('should respect maxRows limit when specified', () => {
      // Create CSV with 11 rows (10 data rows + header)
      const rows = ['id;name'];
      for (let i = 1; i <= 11; i++) {
        rows.push(`${i};User${i}`);
      }
      const csv = rows.join('\n');
      
      // Should throw when limit is exceeded
      expect(() => csvToJson(csv, { delimiter: ';', maxRows: 10 }))
        .toThrow('CSV size exceeds maximum limit of 10 rows');
      
      // Should not throw when within limit
      expect(() => csvToJson(csv, { delimiter: ';', maxRows: 20 }))
        .not.toThrow();
      
      // Should not throw when no limit specified (default unlimited)
      expect(() => csvToJson(csv, { delimiter: ';' }))
        .not.toThrow();
    });

    test('should process large CSV without limit by default', () => {
      // Create CSV with 100 rows (1 header + 99 data rows) to test no default limit
      const rows = ['id;name'];
      for (let i = 1; i <= 99; i++) { // Use 99 data rows for test
        rows.push(`${i};User${i}`);
      }
      const csv = rows.join('\n');
      
      // Should process without error (no default limit)
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result.length).toBe(99); // 99 data rows
    });

    test('should auto-detect comma delimiter', () => {
      const csv = 'id,name,email\n1,John,john@example.com\n2,Jane,jane@example.com';
      const result = csvToJson(csv); // No delimiter specified
      
      expect(result[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
      expect(result[1]).toEqual({ id: '2', name: 'Jane', email: 'jane@example.com' });
    });

    test('should auto-detect semicolon delimiter', () => {
      const csv = 'id;name;email\n1;John;john@example.com\n2;Jane;jane@example.com';
      const result = csvToJson(csv); // No delimiter specified
      
      expect(result[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
      expect(result[1]).toEqual({ id: '2', name: 'Jane', email: 'jane@example.com' });
    });

    test('should auto-detect tab delimiter', () => {
      const csv = 'id\tname\temail\n1\tJohn\tjohn@example.com\n2\tJane\tjane@example.com';
      const result = csvToJson(csv); // No delimiter specified
      
      expect(result[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
      expect(result[1]).toEqual({ id: '2', name: 'Jane', email: 'jane@example.com' });
    });

    test('should use specified delimiter when provided', () => {
      const csv = 'id,name,email\n1,John,john@example.com';
      const result = csvToJson(csv, { delimiter: ';' }); // Wrong delimiter specified
      
      // Should parse incorrectly because we specified wrong delimiter
      expect(result[0]).toEqual({ 'id,name,email': '1,John,john@example.com' });
    });

    test('should respect autoDetect=false option', () => {
      const csv = 'id,name,email\n1,John,john@example.com';
      const result = csvToJson(csv, { 
        delimiter: ';', 
        autoDetect: false 
      });
      
      // Should use specified delimiter even though it's wrong
      expect(result[0]).toEqual({ 'id,name,email': '1,John,john@example.com' });
    });

    test('should use custom candidates for auto-detection', () => {
      const csv = 'id|name|email\n1|John|john@example.com';
      const result = csvToJson(csv, { 
        candidates: ['|', '#', '~'] 
      });
      
      expect(result[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
    });

    test('autoDetectDelimiter function should work independently', () => {
      const { autoDetectDelimiter } = require("../index");
      
      expect(autoDetectDelimiter('a,b,c')).toBe(',');
      expect(autoDetectDelimiter('a;b;c')).toBe(';');
      expect(autoDetectDelimiter('a\tb\tc')).toBe('\t');
      expect(autoDetectDelimiter('a|b|c')).toBe('|');
      
      // Test with custom candidates
      expect(autoDetectDelimiter('a#b#c', ['#', '@'])).toBe('#');
    });
  });

  describe('readCsvAsJson', () => {
    beforeEach(() => {
      fs.promises.readFile.mockReset();
      path.resolve.mockImplementation((p) => p);
      path.normalize.mockImplementation((p) => p);
      path.extname.mockImplementation((p) => {
        const lastDot = p.lastIndexOf('.');
        return lastDot === -1 ? '' : p.substring(lastDot);
      });
    });

    test('should read CSV file and convert to JSON', async () => {
      const csvContent = 'id;name;email\n1;John;john@example.com';
      fs.promises.readFile.mockResolvedValue(csvContent);
      
      const result = await readCsvAsJson('test.csv', { delimiter: ';' });
      
      expect(fs.promises.readFile).toHaveBeenCalledWith('test.csv', 'utf8');
      expect(result[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
    });

    test('should throw ValidationError for non-csv file', async () => {
      await expect(readCsvAsJson('data.txt'))
        .rejects
        .toThrow(ValidationError);
      
      expect(fs.promises.readFile).not.toHaveBeenCalled();
    });

    test('should throw SecurityError for path traversal', async () => {
      await expect(readCsvAsJson('../../../etc/passwd.csv'))
        .rejects
        .toThrow(SecurityError);
      
      expect(fs.promises.readFile).not.toHaveBeenCalled();
    });

    test('should throw FileSystemError for file not found', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.promises.readFile.mockRejectedValue(error);
      
      await expect(readCsvAsJson('nonexistent.csv'))
        .rejects
        .toThrow(FileSystemError);
    });

    test('should propagate parsing errors', async () => {
      const csvContent = 'id;name\n1;"John'; // Malformed CSV
      fs.promises.readFile.mockResolvedValue(csvContent);
      
      await expect(readCsvAsJson('test.csv', { delimiter: ';' }))
        .rejects
        .toThrow(ParsingError);
    });
  });

  describe('readCsvAsJsonSync', () => {
    beforeEach(() => {
      fs.readFileSync.mockReset();
      path.resolve.mockImplementation((p) => p);
      path.normalize.mockImplementation((p) => p);
      path.extname.mockImplementation((p) => {
        const lastDot = p.lastIndexOf('.');
        return lastDot === -1 ? '' : p.substring(lastDot);
      });
    });

    test('should read CSV file synchronously and convert to JSON', () => {
      const csvContent = 'id;name;email\n1;John;john@example.com';
      fs.readFileSync.mockReturnValue(csvContent);
      
      const result = readCsvAsJsonSync('test.csv', { delimiter: ';' });
      
      expect(fs.readFileSync).toHaveBeenCalledWith('test.csv', 'utf8');
      expect(result[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
    });

    test('should throw ValidationError for non-csv file', () => {
      expect(() => readCsvAsJsonSync('data.txt'))
        .toThrow(ValidationError);
      
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('should throw SecurityError for path traversal', () => {
      expect(() => readCsvAsJsonSync('../../../etc/passwd.csv'))
        .toThrow(SecurityError);
      
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('should throw FileSystemError for file not found', () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      fs.readFileSync.mockImplementation(() => {
        throw error; 
      });
      
      expect(() => readCsvAsJsonSync('nonexistent.csv'))
        .toThrow(FileSystemError);
    });

    test('should propagate parsing errors', () => {
      const csvContent = 'id;name\n1;"John'; // Malformed CSV
      fs.readFileSync.mockReturnValue(csvContent);
      
      expect(() => readCsvAsJsonSync('test.csv', { delimiter: ';' }))
        .toThrow(ParsingError);
    });
  });

  describe('Integration: CSV ↔ JSON roundtrip', () => {
    test('should convert JSON to CSV and back to JSON', () => {
      const originalData = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ];
      
      // Import jsonToCsv from the main module
      const { jsonToCsv } = require("../index");
      
      // Convert JSON to CSV
      const csv = jsonToCsv(originalData, { delimiter: ';' });
      
      // Convert CSV back to JSON
      const result = csvToJson(csv, { delimiter: ';', parseNumbers: true });
      
      // Should get the same data back (with numbers parsed)
      expect(result).toEqual(originalData);
    });

    test('should handle complex data with preprocessing', () => {
      const originalData = [
        { 
          id: 1, 
          user: { name: 'John', age: 30 },
          tags: ['admin', 'user']
        }
      ];
      
      // Import jsonToCsv and preprocessData from the main module
      const { jsonToCsv, preprocessData } = require("../index");
      
      // Preprocess data (unwrap nested objects)
      const processedData = preprocessData(originalData);
      
      // Convert to CSV
      const csv = jsonToCsv(processedData, { delimiter: ';' });
      
      // Convert back to JSON
      const result = csvToJson(csv, { delimiter: ';', parseNumbers: true });
      
      // Should get processed data back
      expect(result[0].id).toBe(1);
      expect(result[0].user).toBe('{"name":"John","age":30}');
      expect(result[0].tags).toBe('admin, user');
    });
  });
});
