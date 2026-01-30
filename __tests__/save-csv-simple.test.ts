import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { saveAsCsv, jsonToCsv, ValidationError, LimitError } from '../index';

// Simple test without complex mocks
describe('saveAsCsv Simple Tests', () => {
  // Mock console to avoid output in tests
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('jsonToCsv should return string for valid data', () => {
    const testData = [{ id: 1, name: 'Test' }];
    const result = jsonToCsv(testData);
    
    expect(typeof result).toBe('string');
    expect(result).toContain('id');
    expect(result).toContain('name');
    expect(result).toContain('1');
    expect(result).toContain('Test');
  });

  test('jsonToCsv should return empty string for empty array', () => {
    const result = jsonToCsv([]);
    expect(result).toBe('');
  });

  test('jsonToCsv should handle options correctly', () => {
    const testData = [{ id: 1, name: 'Test' }];
    const result = jsonToCsv(testData, { delimiter: ',', includeHeaders: false });
    
    expect(typeof result).toBe('string');
    expect(result).not.toContain('id,name'); // No headers
    expect(result).toContain('1,Test');
  });

  test('jsonToCsv should throw ValidationError for non-array input', () => {
    expect(() => jsonToCsv(null)).toThrow('Input data must be an array');
    expect(() => jsonToCsv(undefined)).toThrow('Input data must be an array');
    expect(() => jsonToCsv('string')).toThrow('Input data must be an array');
    expect(() => jsonToCsv(123)).toThrow('Input data must be an array');
    expect(() => jsonToCsv({})).toThrow('Input data must be an array');
  });

  test('jsonToCsv should respect maxRecords limit', () => {
    // Create data that exceeds custom limit
    const data = Array.from({ length: 11 }, (_, i) => ({ id: i }));
    
    // Should throw when limit is exceeded
    expect(() => jsonToCsv(data, { maxRecords: 10 })).toThrow('Data size exceeds maximum limit of 10 records');
    
    // Should not throw when within limit
    expect(() => jsonToCsv(data, { maxRecords: 20 })).not.toThrow();
  });
});
