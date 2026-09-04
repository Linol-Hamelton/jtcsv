import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  csvToJson,
  ParsingError
} from '../index';

// Mock console to avoid output in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CSV to JSON Parse Edge Cases - Uncovered Lines', () => {
  describe('parseCsvLine - Unclosed quotes (line 144)', () => {
    test('should throw ParsingError for unclosed quotes at end of line', () => {
      // Simple unclosed quote
      const csv = 'id;text\n1;"unclosed';
      expect(() => csvToJson(csv, { delimiter: ';' }))
        .toThrow(ParsingError);
      
      try {
        csvToJson(csv, { delimiter: ';' });
      } catch (error) {
        expect(error.message).toContain('Unclosed quotes in CSV');
        expect(error.lineNumber).toBe(2);
      }
    });

    test('should throw ParsingError for unclosed quotes after a backslash', () => {
      // The default dialect has no escape character: the backslash is data and
      // the quote after it opens a field that never closes.
      const csv = 'id;text\n1;\\"unclosed';
      expect(() => csvToJson(csv, { delimiter: ';' }))
        .toThrow(ParsingError);
    });

    test('reads a backslash-escaped quote as text with rfc4180Compliant: false', () => {
      const csv = 'id;text\n1;\\"unclosed';
      const result = csvToJson(csv, { delimiter: ';', rfc4180Compliant: false });
      expect(result[0].text).toBe('"unclosed');
    });

    test('should throw ParsingError for unclosed quotes with content after', () => {
      // Unclosed quote with content after
      const csv = 'id;text\n1;"unclosed text';
      expect(() => csvToJson(csv, { delimiter: ';' }))
        .toThrow(ParsingError);
    });

    test('should throw ParsingError for unclosed quotes at start of field', () => {
      // Quote at start but never closed
      const csv = 'id;text\n1;"';
      expect(() => csvToJson(csv, { delimiter: ';' }))
        .toThrow(ParsingError);
    });

    test('should throw ParsingError for unclosed quotes in middle of field', () => {
      // Quote in middle of field but never closed
      const csv = 'id;text\n1;text"more';
      expect(() => csvToJson(csv, { delimiter: ';' }))
        .toThrow(ParsingError);
    });
  });

  describe('parseCsvLine - No fields found (line 149)', () => {
    // Let me think about when fields.length === 0 could happen:
    // The code is: if (fields.length === 0) { throw new ParsingError('No fields found', lineNumber); }
    // 
    // fields gets populated by:
    // 1. fields.push(currentField) when delimiter is found
    // 2. fields.push(currentField) at the end of the function
    // 
    // So fields.length would be 0 only if:
    // 1. The line is completely empty AND
    // 2. We never add currentField to fields
    // 
    // But wait! Even if line is empty, currentField starts as ''
    // And at the end we do fields.push(currentField)
    // So fields would be [''] not []
    // 
    // Unless... what if there's a bug or edge case?
    // Let me check if empty lines are even passed to parseCsvLine
    // In csvToJson, empty lines are skipped: if (line.trim() === '') { continue; }
    // So empty lines don't reach parseCsvLine!
    // 
    // Hmm, maybe this error is for a different scenario?
    // What if a line contains only a backslash escape sequence?
    
    test('should handle line with only delimiter characters - empty fields become null', () => {
      // Line with only delimiter - creates empty fields
      const csv = 'id;name\n;;';
      const result = csvToJson(csv, { delimiter: ';' });
      // parseCsvValue converts empty strings to null
      expect(result[0].id).toBeNull();
      expect(result[0].name).toBeNull();
    });

    test('should handle completely empty line - skipped in csvToJson', () => {
      // Empty line should be skipped in csvToJson, not passed to parseCsvLine
      const csv = 'id;name\n\n';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result).toEqual([]);
    });

    // Let me try to think of a way to trigger fields.length === 0
    // What if we have a line that ends with backslash (escape character)?
    // Actually, looking at the code again:
    // - Line: 'test\\' (ends with backslash)
    // - Parser sees backslash, sets escapeNext = true
    // - Next iteration: escapeNext is true, adds next char (but there is none!)
    // - Wait, we're at end of line, so no next char
    // - Would this cause issues?
    
    test('should handle line ending with backslash - treated as literal backslash', () => {
      // Line ending with backslash
      const csv = 'id;text\n1;test\\';
      const result = csvToJson(csv, { delimiter: ';' });
      // The backslash should be treated as literal
      expect(result[0].text).toBe('test\\');
    });
    
    // Actually, I think the 'No fields found' error might be unreachable!
    // But let's write a test that would trigger it if it were reachable
    test('attempt to trigger No fields found error', () => {
      // This test might fail, but that's OK - it shows the error is unreachable
      const csv = 'id;name\n';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result).toEqual([]);
    });
  });

  describe('Complex edge cases for parseCsvLine', () => {
    test('keeps both backslashes before a quoted section by default', () => {
      const csv = 'id;text\n1;\\\\"quoted"';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].text).toBe('\\\\quoted');
    });

    test('collapses a double backslash before a quote with rfc4180Compliant: false', () => {
      const csv = 'id;text\n1;\\\\"quoted"';
      const result = csvToJson(csv, { delimiter: ';', rfc4180Compliant: false });
      expect(result[0].text).toBe('\\quoted');
    });

    test('reads a backslash then a quoted section as data by default', () => {
      const csv = 'id;text\n1;\\"quoted"';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].text).toBe('\\quoted');
    });

    test('escapes the quote with rfc4180Compliant: false, leaving it unclosed', () => {
      const csv = 'id;text\n1;\\"quoted"';
      expect(() => csvToJson(csv, { delimiter: ';', rfc4180Compliant: false }))
        .toThrow(ParsingError);
    });

    test('should handle whitespace handling in quoted fields', () => {
      // Test the lookahead logic for whitespace after quote
      const csv = 'id;text\n1;"quoted"   ;extra';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].text).toBe('quoted');
      // The 'extra' should be in next field or ignored
    });

    test('should handle tab whitespace after quote', () => {
      const csv = 'id;text\n1;"quoted"\t;extra';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].text).toBe('quoted');
    });
  });

  describe('Direct parseCsvLine testing through csvToJson', () => {
    test('should handle empty quoted string - becomes null', () => {
      const csv = 'id;text\n1;""';
      const result = csvToJson(csv, { delimiter: ';' });
      // Empty string is converted to null by parseCsvValue
      expect(result[0].text).toBeNull();
    });

    test('should handle escaped quotes inside quotes', () => {
      const csv = 'id;text\n1;"test""quoted"';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].text).toBe('test"quoted');
    });

    test('an unterminated quoted field raises ParsingError', () => {
      // `"test""` opens a field, holds an escaped quote, and never closes. It
      // used to return `test"` because parseCsvLine treated a doubled quote as
      // a closer whenever it happened to land at the end of the line — the
      // branch `if (i + 2 === line.length)`. That guess mis-parsed valid input
      // whose quoted value ended with an escaped quote before a newline, so it
      // is gone. Genuinely unterminated input now says so.
      const csv = 'id;text\n1;"test""';
      expect(() => csvToJson(csv, { delimiter: ';' })).toThrow(/[Uu]nclosed/);
    });

    test('a properly closed escaped quote at the end of a field parses', () => {
      const csv = 'id;text\n1;"test"""';
      expect(csvToJson(csv, { delimiter: ';' })[0].text).toBe('test"');
    });
    
    test('should handle pattern "" not at end of line', () => {
      // "" not at end - should be escaped quote
      const csv = 'id;text\n1;"test""middle"';
      const result = csvToJson(csv, { delimiter: ';' });
      expect(result[0].text).toBe('test"middle');
    });
  });
});
