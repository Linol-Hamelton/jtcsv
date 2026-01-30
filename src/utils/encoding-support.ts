/**
 * Encoding detection and conversion utilities.
 * 
 * Provides basic auto‑detection of UTF‑8, UTF‑16LE, UTF‑16BE with BOM,
 * and fallback to a default encoding.
 * 
 * @example
 * import { detectEncoding, convertToUtf8 } from './encoding-support';
 * 
 * const buffer = fs.readFileSync('data.csv');
 * const encoding = detectEncoding(buffer, { fallback: 'utf8' });
 * const utf8Text = convertToUtf8(buffer, encoding);
 */

import { ValidationError } from '../errors';

export interface DetectEncodingOptions {
  fallback?: 'utf8' | 'utf16le' | 'utf16be' | string;
}

export interface AutoDetectAndConvertOptions {
  fallback?: string;
}

export interface CsvToJsonWithEncodingOptions {
  encoding?: 'auto' | 'utf8' | 'utf16le' | 'utf16be' | string;
  fallbackEncoding?: string;
  [key: string]: any;
}

/**
 * Detects encoding from buffer based on BOM.
 * 
 * @param buffer - Input buffer
 * @param options - Detection options
 * @param options.fallback - Fallback encoding if detection fails (default: 'utf8')
 * @returns Detected encoding: 'utf8', 'utf16le', 'utf16be', or fallback
 */
export function detectEncoding(buffer: Buffer, options: DetectEncodingOptions = {}): string {
  const { fallback = 'utf8' } = options;
  
  if (!Buffer.isBuffer(buffer)) {
    throw new ValidationError('Input must be a Buffer');
  }
  
  // Check BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf8';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'utf16be';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'utf16le';
  }
  
  // No BOM detected, use fallback
  return fallback;
}

/**
 * Converts buffer to UTF‑8 string using detected encoding.
 * Strips BOM if present.
 * 
 * @param buffer - Input buffer
 * @param encoding - Source encoding ('utf8', 'utf16le', 'utf16be')
 * @returns UTF‑8 string without BOM
 */
export function convertToUtf8(buffer: Buffer, encoding: string = 'utf8'): string {
  if (!Buffer.isBuffer(buffer)) {
    throw new ValidationError('Input must be a Buffer');
  }
  
  let offset = 0;
  
  // Skip BOM
  if (encoding === 'utf8' && buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    offset = 3;
  } else if (encoding === 'utf16be' && buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    offset = 2;
  } else if (encoding === 'utf16le' && buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    offset = 2;
  }
  
  const slice = buffer.slice(offset);
  return slice.toString(encoding as BufferEncoding);
}

/**
 * Auto‑detects encoding and converts buffer to UTF‑8 string.
 * 
 * @param buffer - Input buffer
 * @param options - Options
 * @param options.fallback - Fallback encoding (default: 'utf8')
 * @returns Detected encoding and converted text
 */
export function autoDetectAndConvert(
  buffer: Buffer, 
  options: AutoDetectAndConvertOptions = {}
): { encoding: string; text: string } {
  const encoding = detectEncoding(buffer, options);
  const text = convertToUtf8(buffer, encoding);
  return { encoding, text };
}

/**
 * Creates a wrapper around csvToJson that accepts Buffer or string with encoding detection.
 * 
 * @param input - CSV as Buffer or string
 * @param parseOptions - Options for csvToJson
 * @param parseOptions.encoding - Explicit encoding (default: 'auto')
 * @param parseOptions.fallbackEncoding - Fallback if auto detection fails (default: 'utf8')
 * @returns Promise with parsed JSON data
 */
export async function csvToJsonWithEncoding(
  input: Buffer | string,
  parseOptions: CsvToJsonWithEncodingOptions = {}
): Promise<any[]> {
  const { encoding = 'auto', fallbackEncoding = 'utf8', ...restOptions } = parseOptions;
  
  let text: string;
  if (Buffer.isBuffer(input)) {
    if (encoding === 'auto') {
      const detected = autoDetectAndConvert(input, { fallback: fallbackEncoding });
      text = detected.text;
    } else {
      text = convertToUtf8(input, encoding);
    }
  } else if (typeof input === 'string') {
    text = input;
  } else {
    throw new ValidationError('Input must be a Buffer or string');
  }
  
  // csvToJson will be provided by the caller or imported elsewhere
  throw new Error('csvToJson function not available. This function requires csvToJson to be provided.');
}

/**
 * Async version of csvToJsonWithEncoding
 */
export async function csvToJsonWithEncodingAsync(
  input: Buffer | string,
  parseOptions: CsvToJsonWithEncodingOptions = {}
): Promise<any[]> {
  return csvToJsonWithEncoding(input, parseOptions);
}

export default {
  detectEncoding,
  convertToUtf8,
  autoDetectAndConvert,
  csvToJsonWithEncoding,
  csvToJsonWithEncodingAsync
};