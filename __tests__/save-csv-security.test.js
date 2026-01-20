const { saveAsCsv, validateFilePath, jsonToCsv } = require('../json-to-csv');

// Mock console to avoid output in tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock fs module
jest.mock('fs', () => {
  const mockWriteFile = jest.fn().mockResolvedValue();
  const mockMkdir = jest.fn().mockResolvedValue();
  return {
    promises: {
      writeFile: mockWriteFile,
      mkdir: mockMkdir
    }
  };
});

// Mock path module - simpler version
jest.mock('path', () => {
  return {
    dirname: jest.fn().mockReturnValue('.'),
    resolve: jest.fn((path) => path),
    normalize: jest.fn((path) => path),
    extname: jest.fn((path) => {
      const match = path.match(/\.([^.]+)$/);
      return match ? '.' + match[1] : '';
    })
  };
});

// Get the mock after jest.mock
const fs = require('fs');
const path = require('path');

describe('saveAsCsv Security', () => {
  const testData = [{ id: 1, name: 'Test' }];
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset path mocks
    path.dirname.mockReturnValue('.');
    path.resolve.mockImplementation((p) => p);
    path.normalize.mockImplementation((p) => p);
    path.extname.mockImplementation((p) => {
      const match = p.match(/\.([^.]+)$/);
      return match ? '.' + match[1] : '';
    });
    
    // Reset fs mocks
    fs.promises.writeFile.mockResolvedValue();
    fs.promises.mkdir.mockResolvedValue();
  });

  describe('validateFilePath', () => {
    test('should accept valid file paths', () => {
      const validPaths = [
        'data.csv',
        './output.csv',
        'folder/data.csv',
        'C:\\data.csv',
        '/tmp/data.csv'
      ];

      validPaths.forEach(filePath => {
        expect(() => validateFilePath(filePath)).not.toThrow();
      });
    });

    test('should reject path traversal attempts', () => {
      const maliciousPaths = [
        '../../../etc/passwd.csv',
        '../config.csv',
        '..\\windows\\system32\\file.csv',
        'C:\\..\\Windows\\System32\\config.csv',
        '/etc/../etc/passwd.csv',
        'folder/../../secret.csv'
      ];

      maliciousPaths.forEach(filePath => {
        expect(() => validateFilePath(filePath)).toThrow(
          'Directory traversal detected'
        );
      });
    });

    test('should require .csv extension', () => {
      const invalidExtensions = [
        'data.txt',
        'output.json',
        'file',
        'data.csv.bak',
        'test.'
      ];

      invalidExtensions.forEach(filePath => {
        expect(() => validateFilePath(filePath)).toThrow(
          'File must have .csv extension'
        );
      });
    });

    test('should reject empty paths', () => {
      expect(() => validateFilePath('')).toThrow(
        'File path must be a non-empty string'
      );
      expect(() => validateFilePath('   ')).toThrow(
        'File path must be a non-empty string'
      );
    });

    test('should reject non-string paths', () => {
      expect(() => validateFilePath(null)).toThrow(
        'File path must be a non-empty string'
      );
      expect(() => validateFilePath(123)).toThrow(
        'File path must be a non-empty string'
      );
      expect(() => validateFilePath({})).toThrow(
        'File path must be a non-empty string'
      );
    });
  });

  describe('saveAsCsv', () => {
    test('should save CSV to file', async () => {
      const filePath = 'test.csv';
      
      await saveAsCsv(testData, filePath);
      
      // Check that writeFile was called
      expect(fs.promises.writeFile).toHaveBeenCalled();
      
      // Get the actual arguments
      const callArgs = fs.promises.writeFile.mock.calls[0];
      expect(callArgs[0]).toBe(filePath);
      expect(typeof callArgs[1]).toBe('string'); // Should be a string, not object
      expect(callArgs[2]).toBe('utf8');
      
      expect(fs.promises.mkdir).toHaveBeenCalledWith('.', { recursive: true });
    });

    test('should use options when saving', async () => {
      const filePath = 'test.csv';
      const options = { delimiter: ',', includeHeaders: false };
      
      await saveAsCsv(testData, filePath, options);
      
      expect(fs.promises.writeFile).toHaveBeenCalled();
      const callArgs = fs.promises.writeFile.mock.calls[0];
      expect(callArgs[0]).toBe(filePath);
      expect(typeof callArgs[1]).toBe('string');
      expect(callArgs[2]).toBe('utf8');
      
      expect(fs.promises.mkdir).toHaveBeenCalledWith('.', { recursive: true });
    });

    test('should throw error on path traversal', async () => {
      const maliciousPath = '../../../etc/passwd.csv';
      
      await expect(saveAsCsv(testData, maliciousPath))
        .rejects
        .toThrow('Directory traversal detected');
      
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
      expect(fs.promises.mkdir).not.toHaveBeenCalled();
    });

    test('should throw error on invalid extension', async () => {
      await expect(saveAsCsv(testData, 'data.txt'))
        .rejects
        .toThrow('File must have .csv extension');
      
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
      expect(fs.promises.mkdir).not.toHaveBeenCalled();
    });

    test('should propagate write errors', async () => {
      const error = new Error('Disk full');
      fs.promises.writeFile.mockRejectedValueOnce(error);
      
      await expect(saveAsCsv(testData, 'test.csv'))
        .rejects
        .toThrow('Disk full');
      
      expect(fs.promises.mkdir).toHaveBeenCalledWith('.', { recursive: true });
    });
  });

  describe('Integration Tests', () => {
    test('should handle complex data with preprocessing', async () => {
      const complexData = [
        {
          id: 1,
          user: { name: 'John', profile: { age: 30 } },
          tags: ['admin', 'user']
        },
        {
          id: 2,
          user: { name: 'Jane', profile: { age: 25 } },
          tags: ['user']
        }
      ];

      const processedData = require('../json-to-csv').preprocessData(complexData);
      const filePath = 'complex.csv';
      
      await saveAsCsv(processedData, filePath);
      
      expect(fs.promises.writeFile).toHaveBeenCalled();
      const callArgs = fs.promises.writeFile.mock.calls[0];
      expect(typeof callArgs[1]).toBe('string');
      expect(fs.promises.mkdir).toHaveBeenCalledWith('.', { recursive: true });
    });

    test('should handle empty data gracefully', async () => {
      await saveAsCsv([], 'empty.csv');
      
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        'empty.csv',
        '',
        'utf8'
      );
      expect(fs.promises.mkdir).toHaveBeenCalledWith('.', { recursive: true });
    });
  });
});