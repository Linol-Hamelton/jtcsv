const { saveAsCsv, validateFilePath, jsonToCsv, preprocessData } = require('../index');

// Mock console to avoid output in tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Mock the entire fs module
jest.mock('fs', () => {
  const mockFs = {
    promises: {
      writeFile: jest.fn().mockResolvedValue(),
      mkdir: jest.fn().mockResolvedValue()
    }
  };
  return mockFs;
});

// Mock path module to avoid issues
jest.mock('path', () => {
  const actualPath = jest.requireActual('path');
  return {
    ...actualPath,
    // Simple implementations for tests
    dirname: jest.fn((p) => '.'),
    resolve: jest.fn((p) => p),
    normalize: jest.fn((p) => p),
    extname: jest.fn((p) => {
      // Simple extension extraction
      const lastDot = p.lastIndexOf('.');
      return lastDot === -1 ? '' : p.substring(lastDot);
    })
  };
});

const fs = require('fs');
const path = require('path');

describe('saveAsCsv Security', () => {
  const testData = [{ id: 1, name: 'Test' }];
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to simple implementations
    fs.promises.writeFile.mockResolvedValue();
    fs.promises.mkdir.mockResolvedValue();
    
    path.dirname.mockImplementation((p) => '.');
    path.resolve.mockImplementation((p) => p);
    path.normalize.mockImplementation((p) => p);
    path.extname.mockImplementation((p) => {
      const lastDot = p.lastIndexOf('.');
      return lastDot === -1 ? '' : p.substring(lastDot);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      
      // Get the actual arguments
      const callArgs = fs.promises.writeFile.mock.calls[0];
      
      // First arg should be the file path
      expect(callArgs[0]).toBe(filePath);
      
      // Second arg should be a string (CSV content)
      expect(typeof callArgs[1]).toBe('string');
      
      // Should contain expected data
      expect(callArgs[1]).toContain('id');
      expect(callArgs[1]).toContain('name');
      expect(callArgs[1]).toContain('1');
      expect(callArgs[1]).toContain('Test');
      
      // Third arg should be encoding
      expect(callArgs[2]).toBe('utf8');
      
      // mkdir should have been called
      expect(fs.promises.mkdir).toHaveBeenCalledWith('.', { recursive: true });
    });

    test('should use options when saving', async () => {
      const filePath = 'test.csv';
      const options = { delimiter: ',', includeHeaders: false };
      
      await saveAsCsv(testData, filePath, options);
      
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      const callArgs = fs.promises.writeFile.mock.calls[0];
      
      // Should be a string
      expect(typeof callArgs[1]).toBe('string');
      
      // With no headers, should not contain header row
      const csvContent = callArgs[1];
      expect(csvContent).not.toContain('id,name');
      expect(csvContent).toContain('1,Test');
      
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

      const processedData = preprocessData(complexData);
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