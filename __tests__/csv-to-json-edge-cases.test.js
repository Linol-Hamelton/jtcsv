const { 
  csvToJson, 
  readCsvAsJson, 
  readCsvAsJsonSync, 
  autoDetectDelimiter,
  ValidationError,
  ConfigurationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError
} = require('../index');

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
const mockFs = {
  promises: {
    readFile: jest.fn()
  },
  readFileSync: jest.fn()
};

jest.mock('fs', () => mockFs);

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

const fs = require('fs');
const path = require('path');

describe('CSV to JSON Edge Cases Coverage', () => {
  describe('validateCsvInput edge cases', () => {
    test('should throw ConfigurationError for non-object options', () => {
      expect(() => csvToJson('test', 'not an object'))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for non-string delimiter', () => {
      expect(() => csvToJson('test', { delimiter: 123 }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for multi-character delimiter', () => {
      expect(() => csvToJson('test', { delimiter: ';;' }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for non-boolean autoDetect', () => {
      expect(() => csvToJson('test', { autoDetect: 'not a boolean' }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for non-array candidates', () => {
      expect(() => csvToJson('test', { candidates: 'not an array' }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for zero maxRows', () => {
      expect(() => csvToJson('test', { maxRows: 0 }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for negative maxRows', () => {
      expect(() => csvToJson('test', { maxRows: -1 }))
        .toThrow(ConfigurationError);
    });

    test('should throw ConfigurationError for non-number maxRows', () => {
      expect(() => csvToJson('test', { maxRows: 'not a number' }))
        .toThrow(ConfigurationError);
    });
  });

  describe('parseCsvLine edge cases', () => {
    test('should handle escaped backslashes', () => {
      const csv = 'id;text\n1;test\\\\backslash';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].text).toBe('test\\backslash');
    });

    test('should handle quotes inside quoted fields', () => {
      const csv = 'id;text\n1;"He said ""Hello"" world"';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].text).toBe('He said "Hello" world');
    });

    test('should handle whitespace before delimiter after quotes', () => {
      const csv = 'id;text\n1;"Hello"   ;extra';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].id).toBe('1');
      expect(result[0].text).toBe('Hello');
    });

    test('should throw ParsingError for unclosed quotes', () => {
      const csv = 'id;text\n1;"Unclosed quote';
      expect(() => csvToJson(csv, { delimiter: ';' }))
        .toThrow(ParsingError);
    });

    test('should throw ParsingError for empty line', () => {
      const csv = '';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result).toEqual([]);
    });
  });

  describe('autoDetectDelimiter edge cases', () => {
    test('should handle empty CSV string', () => {
      expect(autoDetectDelimiter('')).toBe(';');
    });

    test('should handle null input', () => {
      expect(autoDetectDelimiter(null)).toBe(';');
    });

    test('should handle undefined input', () => {
      expect(autoDetectDelimiter(undefined)).toBe(';');
    });

    test('should handle CSV with only empty lines', () => {
      expect(autoDetectDelimiter('\n\n\n')).toBe(';');
    });

    test('should handle CSV with whitespace lines', () => {
      expect(autoDetectDelimiter('   \n  \n \n')).toBe(';');
    });

    test('should handle tie in delimiter detection', () => {
      // Both comma and semicolon appear once
      const csv = 'a,b;c';
      // Should return ';' as default when tie
      expect(autoDetectDelimiter(csv)).toBe(';');
    });

    test('should handle no delimiter found', () => {
      const csv = 'a b c'; // No delimiter in candidates
      expect(autoDetectDelimiter(csv)).toBe(';');
    });

    test('should handle custom candidates with no matches', () => {
      const csv = 'a,b,c'; // Only commas, but custom candidates don't include comma
      expect(autoDetectDelimiter(csv, ['|', '#'])).toBe(';');
    });
  });

  describe('csvToJson edge cases', () => {
    test('should handle CSV with only headers', () => {
      const csv = 'id;name;email';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result).toEqual([]);
    });

    test('should handle CSV with empty data rows', () => {
      const csv = 'id;name;email\n\n\n';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result).toEqual([]);
    });

    test('should handle mismatched field count (more fields than headers)', () => {
      const csv = 'id;name\n1;John;extra';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].id).toBe('1');
      expect(result[0].name).toBe('John');
      // Extra field should be ignored
    });

    test('should handle mismatched field count (fewer fields than headers)', () => {
      const csv = 'id;name;email\n1;John';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].id).toBe('1');
      expect(result[0].name).toBe('John');
      // When field is missing, it should be undefined (not null)
      expect(result[0].email).toBeUndefined();
    });

    test('should show warning for large files in non-test environment', () => {
      // Temporarily change NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Create CSV with >1M lines
        const lines = ['id;name'];
        for (let i = 0; i < 1000001; i++) {
          lines.push(`${i};User${i}`);
        }
        const csv = lines.join('\n');
        
        csvToJson(csv, { delimiter: ';' });
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    test('should not show warning for large files when maxRows is specified', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Create CSV with >1M lines
      const lines = ['id;name'];
      for (let i = 0; i < 1000001; i++) {
        lines.push(`${i};User${i}`);
      }
      const csv = lines.join('\n');
      
      // Should throw LimitError instead of warning
      expect(() => csvToJson(csv, { delimiter: ';', maxRows: 1000000 }))
        .toThrow(LimitError);
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    test('should handle parseNumbers with decimal numbers', () => {
      const csv = 'id;price\n1;99.99\n2;49.50';
      const result = csvToJson(csv, { delimiter: ';', parseNumbers: true });
      expect(result[0].price).toBe(99.99);
      expect(result[1].price).toBe(49.50);
    });

    test('should handle parseNumbers with negative numbers', () => {
      const csv = 'id;value\n1;-10\n2;-3.14';
      const result = csvToJson(csv, { delimiter: ';', parseNumbers: true });
      expect(result[0].value).toBe(-10);
      expect(result[1].value).toBe(-3.14);
    });

    test('should handle parseBooleans with mixed case', () => {
      const csv = 'id;active\n1;TRUE\n2;False\n3;tRuE';
      const result = csvToJson(csv, { delimiter: ';', parseBooleans: true });
      expect(result[0].active).toBe(true);
      expect(result[1].active).toBe(false);
      expect(result[2].active).toBe(true);
    });

    test('should handle Excel formula protection', () => {
      const csv = "id;formula\n1;'=A1+B1";
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].formula).toBe('=A1+B1');
    });
  });

  describe('readCsvAsJson edge cases', () => {
    beforeEach(() => {
      fs.promises.readFile.mockReset();
      path.resolve.mockImplementation((p) => p);
      path.normalize.mockImplementation((p) => p);
      path.extname.mockImplementation((p) => {
        const lastDot = p.lastIndexOf('.');
        return lastDot === -1 ? '' : p.substring(lastDot);
      });
    });

    test('should handle permission denied error', async () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      fs.promises.readFile.mockRejectedValue(error);
      
      await expect(readCsvAsJson('test.csv'))
        .rejects
        .toThrow(FileSystemError);
    });

    test('should handle path is a directory error', async () => {
      const error = new Error('Is a directory');
      error.code = 'EISDIR';
      fs.promises.readFile.mockRejectedValue(error);
      
      await expect(readCsvAsJson('test.csv'))
        .rejects
        .toThrow(FileSystemError);
    });

    test('should handle generic file system errors', async () => {
      const error = new Error('Unknown error');
      error.code = 'UNKNOWN';
      fs.promises.readFile.mockRejectedValue(error);
      
      await expect(readCsvAsJson('test.csv'))
        .rejects
        .toThrow(FileSystemError);
    });

    test('should handle file path without .csv extension', async () => {
      await expect(readCsvAsJson('data.txt'))
        .rejects
        .toThrow(ValidationError);
    });

    test('should handle empty file path', async () => {
      await expect(readCsvAsJson(''))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('readCsvAsJsonSync edge cases', () => {
    beforeEach(() => {
      fs.readFileSync.mockReset();
      path.resolve.mockImplementation((p) => p);
      path.normalize.mockImplementation((p) => p);
      path.extname.mockImplementation((p) => {
        const lastDot = p.lastIndexOf('.');
        return lastDot === -1 ? '' : p.substring(lastDot);
      });
    });

    test('should handle permission denied error', () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      fs.readFileSync.mockImplementation(() => {
        throw error;
      });
      
      expect(() => readCsvAsJsonSync('test.csv'))
        .toThrow(FileSystemError);
    });

    test('should handle path is a directory error', () => {
      const error = new Error('Is a directory');
      error.code = 'EISDIR';
      fs.readFileSync.mockImplementation(() => {
        throw error;
      });
      
      expect(() => readCsvAsJsonSync('test.csv'))
        .toThrow(FileSystemError);
    });

    test('should handle generic file system errors', () => {
      const error = new Error('Unknown error');
      error.code = 'UNKNOWN';
      fs.readFileSync.mockImplementation(() => {
        throw error;
      });
      
      expect(() => readCsvAsJsonSync('test.csv'))
        .toThrow(FileSystemError);
    });

    test('should handle file path without .csv extension', () => {
      expect(() => readCsvAsJsonSync('data.txt'))
        .toThrow(ValidationError);
    });

    test('should handle empty file path', () => {
      expect(() => readCsvAsJsonSync(''))
        .toThrow(ValidationError);
    });
  });

  describe('Integration edge cases', () => {
    test('should handle CSV with carriage returns', () => {
      const csv = 'id;name;email\r\n1;John;john@example.com\r\n2;Jane;jane@example.com';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('John');
      expect(result[1].name).toBe('Jane');
    });

    test('should handle CSV with mixed line endings', () => {
      const csv = 'id;name;email\n1;John;john@example.com\r\n2;Jane;jane@example.com';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('John');
      expect(result[1].name).toBe('Jane');
    });

    test('should handle CSV with trailing delimiter', () => {
      const csv = 'id;name;email;\n1;John;john@example.com;\n2;Jane;jane@example.com;';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].id).toBe('1');
      expect(result[0].name).toBe('John');
      expect(result[0].email).toBe('john@example.com');
      // Trailing empty field should be parsed as null
    });

    test('should handle auto-detect with empty strings', () => {
      const csv = 'id,name,email\n1,,john@example.com\n2,Jane,';
      const result = csvToJson(csv); // Auto-detect
      expect(result[0].id).toBe('1');
      // Empty string should be parsed as null (not empty string)
      expect(result[0].name).toBeNull();
      expect(result[0].email).toBe('john@example.com');
      expect(result[1].id).toBe('2');
      expect(result[1].name).toBe('Jane');
      expect(result[1].email).toBeNull();
    });
  });
});


