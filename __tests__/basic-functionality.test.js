const { jsonToCsv, preprocessData, deepUnwrap } = require('../json-to-csv');

describe('Basic Functionality', () => {
  describe('jsonToCsv', () => {
    test('should convert simple JSON to CSV', () => {
      const data = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ];

      const csv = jsonToCsv(data, { delimiter: ',' });
      
      expect(csv).toContain('id,name,email');
      expect(csv).toContain('1,John,john@example.com');
      expect(csv).toContain('2,Jane,jane@example.com');
    });

    test('should use custom delimiter', () => {
      const data = [{ a: 1, b: 2 }];
      const csv = jsonToCsv(data, { delimiter: '|' });
      
      expect(csv).toBe('a|b\n1|2');
    });

    test('should rename headers', () => {
      const data = [{ id: 1, name: 'John' }];
      const csv = jsonToCsv(data, {
        delimiter: ',',
        renameMap: { id: 'ID', name: 'Full Name' }
      });
      
      expect(csv).toContain('ID,Full Name');
      expect(csv).toContain('1,John');
    });

    test('should handle empty data', () => {
      expect(jsonToCsv([])).toBe('');
    });

    test('should handle missing headers', () => {
      const data = [
        { id: 1, name: 'John' },
        { id: 2, email: 'jane@example.com' }
      ];
      
      const csv = jsonToCsv(data, { delimiter: ',' });
      expect(csv).toContain('id,name,email');
      expect(csv).toContain('1,John,');
      expect(csv).toContain('2,,jane@example.com');
    });

    test('should escape special characters', () => {
      const data = [
        { text: 'Hello, World!', quote: 'He said "Hi"' }
      ];
      
      const csv = jsonToCsv(data, { delimiter: ',' });
      expect(csv).toContain('"Hello, World!"');
      expect(csv).toContain('"He said ""Hi"""');
    });

    test('should handle newlines in data', () => {
      const data = [
        { text: 'Line 1\nLine 2' }
      ];
      
      const csv = jsonToCsv(data, { delimiter: ',' });
      expect(csv).toContain('"Line 1\nLine 2"');
    });
  });

  describe('preprocessData', () => {
    test('should unwrap nested objects', () => {
      const data = [
        { user: { name: 'John', age: 30 } },
        { user: { name: 'Jane', age: 25 } }
      ];

      const processed = preprocessData(data);
      
      expect(processed[0].user).toBe('{"name":"John","age":30}');
      expect(processed[1].user).toBe('{"name":"Jane","age":25}');
    });

    test('should handle arrays', () => {
      const data = [
        { tags: ['js', 'node', 'csv'] }
      ];

      const processed = preprocessData(data);
      expect(processed[0].tags).toBe('js, node, csv');
    });

    test('should handle mixed data', () => {
      const data = [
        { 
          simple: 'value',
          nested: { a: 1, b: 2 },
          array: [1, 2, 3]
        }
      ];

      const processed = preprocessData(data);
      expect(processed[0].simple).toBe('value');
      expect(processed[0].nested).toBe('{"a":1,"b":2}');
      expect(processed[0].array).toBe('1, 2, 3');
    });
  });

  describe('deepUnwrap', () => {
    test('should handle primitive values', () => {
      expect(deepUnwrap('test')).toBe('test');
      expect(deepUnwrap(123)).toBe('123');
      expect(deepUnwrap(true)).toBe('true');
      expect(deepUnwrap(null)).toBe('');
      expect(deepUnwrap(undefined)).toBe('');
    });

    test('should handle arrays', () => {
      expect(deepUnwrap([1, 2, 3])).toBe('1, 2, 3');
      expect(deepUnwrap(['a', 'b', 'c'])).toBe('a, b, c');
      expect(deepUnwrap([])).toBe('');
    });

    test('should handle objects', () => {
      expect(deepUnwrap({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
      expect(deepUnwrap({})).toBe('');
    });

    test('should respect max depth', () => {
      const deeplyNested = { a: { b: { c: { d: { e: 'value' } } } } };
      // With maxDepth = 1, we should get [Too Deep] for nested objects
      expect(deepUnwrap(deeplyNested, 0, 1)).toBe('[Too Deep]');
      // With maxDepth = 5, we should get the stringified object
      expect(deepUnwrap(deeplyNested, 0, 5)).toBe('{"a":{"b":{"c":{"d":{"e":"value"}}}}}');
    });
  });

  describe('Input Validation', () => {
    test('should throw error for non-array input', () => {
      expect(() => jsonToCsv(null)).toThrow('Input data must be an array');
      expect(() => jsonToCsv(undefined)).toThrow('Input data must be an array');
      expect(() => jsonToCsv('string')).toThrow('Input data must be an array');
      expect(() => jsonToCsv(123)).toThrow('Input data must be an array');
      expect(() => jsonToCsv({})).toThrow('Input data must be an array');
    });

    test('should handle invalid items in array', () => {
      const data = [
        { valid: 'data' },
        null,
        undefined,
        'string',
        123,
        { another: 'object' }
      ];

      const csv = jsonToCsv(data);
      expect(csv).toContain('valid');
      expect(csv).toContain('data');
      expect(csv).toContain('another');
      expect(csv).toContain('object');
    });

    test('should respect maxRecords limit', () => {
      const largeData = Array.from({ length: 1000001 }, (_, i) => ({ id: i }));
      
      expect(() => jsonToCsv(largeData)).toThrow(
        'Data size exceeds maximum limit of 1000000 records'
      );
    });

    test('should allow custom maxRecords', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      
      // Should work with custom limit
      expect(() => jsonToCsv(data, { maxRecords: 50 })).toThrow();
      expect(() => jsonToCsv(data, { maxRecords: 200 })).not.toThrow();
    });
  });

  describe('CSV Injection Protection', () => {
    test('should escape formula injections', () => {
      const injections = [
        { formula: '=1+1' },
        { formula: '+2+2' },
        { formula: '-3+3' },
        { formula: '@SUM(A1:A10)' }
      ];

      const csv = jsonToCsv(injections, { delimiter: ',' });
      
      expect(csv).toContain("'=1+1");
      expect(csv).toContain("'+2+2");
      expect(csv).toContain("'-3+3");
      expect(csv).toContain("'@SUM(A1:A10)");
    });

    test('should not escape non-formula values', () => {
      const data = [
        { value: 'test=123' },  // = not at start
        { value: '1+1' },       // no = at start
        { value: 'SUM(A1:A10)' } // no @ at start
      ];

      const csv = jsonToCsv(data, { delimiter: ',' });
      
      expect(csv).toContain('test=123');
      expect(csv).toContain('1+1');
      expect(csv).toContain('SUM(A1:A10)');
    });
  });
});