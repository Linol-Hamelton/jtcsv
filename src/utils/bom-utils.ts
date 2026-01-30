/**
 * BOM (Byte Order Mark) Utilities for jtcsv
 * 
 * Provides functions to detect and strip BOM characters from UTF-8, UTF-16 LE/BE,
 * and UTF-32 encoded strings/buffers.
 * 
 * @module bom-utils
 */

import { Transform } from 'stream';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

/**
 * BOM signatures for different encodings
 */
export const BOM_SIGNATURES = {
  'utf-8': Buffer.from([0xEF, 0xBB, 0xBF]),
  'utf-16le': Buffer.from([0xFF, 0xFE]),
  'utf-16be': Buffer.from([0xFE, 0xFF]),
  'utf-32le': Buffer.from([0xFF, 0xFE, 0x00, 0x00]),
  'utf-32be': Buffer.from([0x00, 0x00, 0xFE, 0xFF])
} as const;

export type Encoding = keyof typeof BOM_SIGNATURES;

export interface BomDetectionResult {
  encoding: Encoding;
  bomLength: number;
  hasBom: boolean;
}

export interface ReadFileWithBomResult {
  data: Buffer | string;
  encoding: string;
  hadBom: boolean;
  bomInfo: BomDetectionResult | null;
}

export interface NormalizeCsvInputOptions {
  encoding?: string;
  normalizeLineEndings?: boolean;
}

/**
 * Detects if a buffer or string starts with a BOM
 * 
 * @param input - Input to check for BOM
 * @returns Detection result or null if no BOM found
 */
export function detectBom(input: Buffer | string | null | undefined): BomDetectionResult | null {
  if (!input) {
    return null;
  }
  
  let buffer: Buffer;
  if (typeof input === 'string') {
    buffer = Buffer.from(input, 'utf8');
  } else if (Buffer.isBuffer(input)) {
    buffer = input;
  } else {
    return null;
  }
  
  // Check each BOM signature
  for (const [encoding, signature] of Object.entries(BOM_SIGNATURES)) {
    if (buffer.length >= signature.length) {
      if (buffer.slice(0, signature.length).equals(signature)) {
        return {
          encoding: encoding as Encoding,
          bomLength: signature.length,
          hasBom: true
        };
      }
    }
  }
  
  return null;
}

/**
 * Strips BOM from a buffer or string
 * 
 * @param input - Input to strip BOM from
 * @returns Input without BOM
 */
export function stripBom(input: Buffer | string | null | undefined): Buffer | string {
  if (!input) {
    return input as any;
  }
  
  const bomInfo = detectBom(input);
  if (!bomInfo) {
    return input;
  }
  
  if (Buffer.isBuffer(input)) {
    return input.slice(bomInfo.bomLength);
  }
  
  if (typeof input === 'string') {
    // Convert to buffer, strip BOM, then convert back to string
    const buffer = Buffer.from(input, 'utf8');
    const strippedBuffer = buffer.slice(bomInfo.bomLength);
    
    // Determine correct encoding for conversion
    let encoding: BufferEncoding = 'utf8';
    if (bomInfo.encoding === 'utf-16le') {
      encoding = 'utf16le';
    } else if (bomInfo.encoding === 'utf-16be') {
      encoding = 'utf16le'; // Node.js uses utf16le for both LE and BE, conversion handled by Buffer
    }
    
    return strippedBuffer.toString(encoding);
  }
  
  return input;
}

/**
 * Strips BOM from a string (optimized for strings)
 * 
 * @param str - String to strip BOM from
 * @returns String without BOM
 */
export function stripBomFromString(str: string): string {
  if (typeof str !== 'string') {
    return str as any;
  }
  
  // Check for UTF-8 BOM (most common)
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  
  // Check for UTF-8 BOM bytes as characters
  if (str.length >= 3 && 
      str.charCodeAt(0) === 0xEF && 
      str.charCodeAt(1) === 0xBB && 
      str.charCodeAt(2) === 0xBF) {
    return str.slice(3);
  }
  
  return str;
}

/**
 * Creates a transform stream that strips BOM from incoming data
 * 
 * @returns Transform stream
 */
export function createBomStripStream(): Transform {
  let bomStripped = false;
  
  return new Transform({
    transform(chunk: Buffer, encoding: string, callback: (error?: Error | null, data?: Buffer) => void) {
      if (!bomStripped) {
        const bomInfo = detectBom(chunk);
        if (bomInfo) {
          // Strip BOM from first chunk
          chunk = chunk.slice(bomInfo.bomLength);
          bomStripped = true;
        } else {
          bomStripped = true; // No BOM found, but we've checked
        }
      }
      
      this.push(chunk);
      callback();
    }
  });
}

/**
 * Reads a file and automatically handles BOM
 * 
 * @param filePath - Path to file
 * @param options - Read options
 * @returns Promise with file data and BOM info
 */
export async function readFileWithBomHandling(
  filePath: string, 
  options: { encoding?: BufferEncoding } = {}
): Promise<ReadFileWithBomResult> {
  const buffer = await fsPromises.readFile(filePath);
  
  const bomInfo = detectBom(buffer);
  const hadBom = !!bomInfo;
  
  let data: Buffer | string;
  let encoding = options.encoding || 'utf8';
  
  if (bomInfo) {
    // Strip BOM
    data = buffer.slice(bomInfo.bomLength);
    
    // Use detected encoding if not specified
    if (!options.encoding) {
      // Convert our encoding names to Node.js BufferEncoding
      if (bomInfo.encoding === 'utf-8') {
        encoding = 'utf8';
      } else if (bomInfo.encoding === 'utf-16le') {
        encoding = 'utf16le';
      } else if (bomInfo.encoding === 'utf-16be') {
        encoding = 'utf16le'; // Node.js uses utf16le for both
      } else {
        encoding = 'utf8'; // fallback
      }
    }
  } else {
    data = buffer;
  }
  
  // Convert to string if encoding is specified
  if (options.encoding || bomInfo) {
    data = data.toString(encoding);
  }
  
  return {
    data,
    encoding,
    hadBom,
    bomInfo: bomInfo || null
  };
}

/**
 * Checks if a file has BOM (synchronous)
 * 
 * @param filePath - Path to file
 * @returns BOM info or null
 */
export function fileHasBomSync(filePath: string): BomDetectionResult | null {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(4);
  const bytesRead = fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  
  if (bytesRead < 2) {
    return null;
  }
  
  return detectBom(buffer.slice(0, bytesRead));
}

/**
 * Normalizes CSV input by stripping BOM and ensuring proper encoding
 * 
 * @param csvInput - CSV input
 * @param options - Processing options
 * @returns Normalized CSV string
 */
export function normalizeCsvInput(
  csvInput: string | Buffer, 
  options: NormalizeCsvInputOptions = {}
): string {
  if (!csvInput) {
    return '';
  }
  
  let normalized: string;
  
  if (Buffer.isBuffer(csvInput)) {
    const bomInfo = detectBom(csvInput);
    if (bomInfo) {
      normalized = csvInput.slice(bomInfo.bomLength).toString(bomInfo.encoding as BufferEncoding);
    } else {
      normalized = csvInput.toString((options.encoding as BufferEncoding) || 'utf8');
    }
  } else if (typeof csvInput === 'string') {
    normalized = stripBomFromString(csvInput);
  } else {
    throw new Error('CSV input must be a string or Buffer');
  }
  
  // Ensure proper line endings
  if (options.normalizeLineEndings !== false) {
    normalized = normalized.replace(/\r\n|\r/g, '\n');
  }
  
  return normalized;
}

/**
 * Async version of normalizeCsvInput that can handle large files
 * 
 * @param csvInput - CSV input as string, Buffer, or file path
 * @param options - Processing options
 * @returns Promise with normalized CSV string
 */
export async function normalizeCsvInputAsync(
  csvInput: string | Buffer | { filePath: string },
  options: NormalizeCsvInputOptions = {}
): Promise<string> {
  if (typeof csvInput === 'object' && 'filePath' in csvInput) {
    // Read file asynchronously
    const result = await readFileWithBomHandling(csvInput.filePath, {
      encoding: options.encoding as BufferEncoding || 'utf8'
    });
    let normalized = typeof result.data === 'string' ? result.data : result.data.toString();
    
    // Ensure proper line endings
    if (options.normalizeLineEndings !== false) {
      normalized = normalized.replace(/\r\n|\r/g, '\n');
    }
    
    return normalized;
  }
  
  // Handle string or Buffer input
  return normalizeCsvInput(csvInput as string | Buffer, options);
}

/**
 * Creates an async iterator that strips BOM from a stream
 * 
 * @param stream - Readable stream
 * @returns Async iterator yielding chunks without BOM
 */
export async function* createBomStrippingIterator(
  stream: NodeJS.ReadableStream
): AsyncIterableIterator<Buffer> {
  let bomStripped = false;
  
  for await (const chunk of stream) {
    if (!bomStripped) {
      const bomInfo = detectBom(chunk as Buffer);
      if (bomInfo) {
        // Strip BOM from first chunk
        yield (chunk as Buffer).slice(bomInfo.bomLength);
        bomStripped = true;
        continue;
      } else {
        bomStripped = true;
      }
    }
    
    yield chunk as Buffer;
  }
}

/**
 * Detects BOM asynchronously for large files
 * 
 * @param filePath - Path to file
 * @returns Promise with BOM info or null
 */
export async function detectBomAsync(filePath: string): Promise<BomDetectionResult | null> {
  const fd = await fsPromises.open(filePath, 'r');
  const buffer = Buffer.alloc(4);
  const { bytesRead } = await fd.read(buffer, 0, 4, 0);
  await fd.close();
  
  if (bytesRead < 2) {
    return null;
  }
  
  return detectBom(buffer.slice(0, bytesRead));
}

export default {
  detectBom,
  stripBom,
  stripBomFromString,
  createBomStripStream,
  readFileWithBomHandling,
  fileHasBomSync,
  normalizeCsvInput,
  normalizeCsvInputAsync,
  createBomStrippingIterator,
  detectBomAsync,
  BOM_SIGNATURES
};