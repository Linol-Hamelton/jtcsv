import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
/**
 * TSV parser tests (English version)
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

import TsvParser from '../src/formats/tsv-parser';
import { Transform } from 'stream';

describe('TsvParser', () => {
  describe('jsonToTsv', () => {
    test('converts array of objects to TSV', () => {
      const data = [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 }
      ];
      
      const tsv = TsvParser.jsonToTsv(data);
      const lines = tsv.split(/\r?\n/).filter(line => line.trim() !== '');
      
      expect(lines[0]).toBe('id\tname\tage');
      expect(lines[1]).toBe('1\tJohn\t30');
      expect(lines[2]).toBe('2\tJane\t25');
    });

    test('works with options', () => {
      const data = [{ id: 1, name: 'John' }];
      const tsv = TsvParser.jsonToTsv(data, {
        includeHeaders: false
      });
      
      const lines = tsv.split(/\r?\n/).filter(line => line.trim() !== '');
      expect(lines[0]).toBe('1\tJohn');
    });
  });

  describe('tsvToJson', () => {
    test('converts TSV string to array of objects', () => {
      const tsv = 'id\tname\tage\n1\tJohn\t30\n2\tJane\t25';
      const result = TsvParser.tsvToJson(tsv, {
        parseNumbers: true
      });
      
      expect(result).toEqual([
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 }
      ]);
    });

    test('parses numbers and boolean values', () => {
      const tsv = 'id\tactive\tscore\n1\ttrue\t95.5\n2\tfalse\t85.0';
      const result = TsvParser.tsvToJson(tsv, {
        parseBooleans: true,
        parseNumbers: true
      });
      
      expect(result).toEqual([
        { id: 1, active: true, score: 95.5 },
        { id: 2, active: false, score: 85.0 }
      ]);
    });
  });

  describe('isTsv', () => {
    test('detects TSV by tab presence', () => {
      const tsvSample = 'id\tname\tage\n1\tJohn\t30';
      expect(TsvParser.isTsv(tsvSample)).toBe(true);
    });

    test('detects non-TSV when more commas', () => {
      const csvSample = 'id,name,age\n1,John,30';
      expect(TsvParser.isTsv(csvSample)).toBe(false);
    });
  });

  describe('performance with large data', () => {
    test('handles 5,000 objects efficiently', () => {
      // Generate 5,000 objects
      const data = [];
      for (let i = 0; i < 5000; i++) {
        data.push({
          id: i,
          name: `User${i}`,
          email: `user${i}@example.com`,
          score: Math.random() * 100,
          active: Math.random() > 0.5
        });
      }
      
      const startTime = Date.now();
      const tsv = TsvParser.jsonToTsv(data, {
        parseNumbers: true,
        parseBooleans: true
      });
      const serializeTime = Date.now() - startTime;
      
      const parseStart = Date.now();
      const restored = TsvParser.tsvToJson(tsv, {
        parseBooleans: true,
        parseNumbers: true
      });
      const parseTime = Date.now() - parseStart;
      
      // Instead of comparing entire arrays (which would produce huge output on failure),
      // compare key properties
      expect(restored.length).toBe(data.length);
      
      // Check first and last items
      expect(restored[0]).toEqual(data[0]);
      expect(restored[restored.length - 1]).toEqual(data[data.length - 1]);
      
      // Check a few random items
      const sampleIndices = [100, 1000, 2500, 4000];
      for (const idx of sampleIndices) {
        expect(restored[idx]).toEqual(data[idx]);
      }
      
      console.log('\nTSV Performance:');
      console.log(`  Objects: ${data.length}`);
      console.log(`  Serialization: ${serializeTime}ms`);
      console.log(`  Parsing: ${parseTime}ms`);
      console.log(`  Total: ${serializeTime + parseTime}ms`);
      console.log(`  Speed: ${Math.round(data.length / ((serializeTime + parseTime) / 1000))} objects/sec`);
      
      // Should be fast enough
      expect(serializeTime + parseTime).toBeLessThan(1000);
    });
  });
});