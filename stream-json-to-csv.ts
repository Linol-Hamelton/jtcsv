/**
 * Stream JSON to CSV Converter - TypeScript Module
 * 
 * A streaming implementation for converting JSON data to CSV format
 * with memory-efficient processing for large files.
 */

import {
  ValidationError,
  SecurityError,
  LimitError,
  ConfigurationError,
  safeExecuteSync,
  safeExecuteAsync,
  ErrorCode
} from './errors';

import { Transform, Readable, Writable, TransformCallback } from 'stream';
import { pipeline } from 'stream/promises';
import { JsonToCsvStreamOptions, AnyObject, AnyArray } from './src/types';

// Import schema validator from utils
import { createSchemaValidators } from './src/utils/schema-validator';

/**
 * Creates a transform stream that converts JSON objects to CSV rows
 * 
 * @param options - Configuration options
 * @returns Transform stream
 * 
 * @example
 * const { createJsonToCsvStream } = require('./stream-json-to-csv');
 * 
 * const transformStream = createJsonToCsvStream({
 *   delimiter: ',',
 *   renameMap: { id: 'ID', name: 'Full Name' }
 * });
 * 
 * // Pipe JSON objects to CSV
 * jsonReadableStream.pipe(transformStream).pipe(csvWritableStream);
 */
export function createJsonToCsvStream(options: JsonToCsvStreamOptions = {}): Transform {
  return safeExecuteSync(() => {
    const {
      delimiter = ';',
      includeHeaders = true,
      renameMap = {},
      template = {},
      maxRecords = Infinity,
      transform: customTransform,
      schema,
      addBOM = true,
      preventCsvInjection = true,
      rfc4180Compliant = true,
      flatten = false,
      flattenSeparator = '.',
      flattenMaxDepth = 5,
      arrayHandling = 'stringify'
    } = options;
    
    // Validate options
    if (typeof delimiter !== 'string' || delimiter.length !== 1) {
      throw new ConfigurationError('Delimiter must be a single character string');
    }
    
    if (typeof includeHeaders !== 'boolean') {
      throw new ConfigurationError('includeHeaders must be a boolean');
    }
    
    if (renameMap && typeof renameMap !== 'object') {
      throw new ConfigurationError('renameMap must be an object');
    }
    
    if (maxRecords !== Infinity && (typeof maxRecords !== 'number' || maxRecords <= 0)) {
      throw new ConfigurationError('maxRecords must be a positive number or Infinity');
    }
    
    // Create schema validator if schema is provided
    // TODO: Fix schema validator types
    const schemaValidator = schema ? (createSchemaValidators as any)(schema) : null;
    
    let headers: string[] = [];
    let headersWritten = false;
    let recordCount = 0;
    
    // Create transform stream
    const transformStream = new Transform({
      objectMode: true,
      
      transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
        try {
          // Check max records limit
          if (recordCount >= maxRecords) {
            // Skip remaining records
            return callback();
          }
          
          // Validate chunk is an object
          if (typeof chunk !== 'object' || chunk === null) {
            throw new ValidationError(`Expected object but got ${typeof chunk}`);
          }
          
          let row: AnyObject = chunk;
          
          // Apply schema validation if provided
          if (schemaValidator) {
            const validationResult = schemaValidator.validate(row);
            if (!validationResult.valid) {
              throw new ValidationError(`Schema validation failed: ${validationResult.errors?.join(', ')}`);
            }
            // Apply schema transformations if any
            row = schemaValidator.transform(row) || row;
          }
          
          // Apply custom transform if provided
          if (customTransform) {
            row = customTransform(row);
          }
          
          // Flatten nested objects if enabled
          if (flatten) {
            row = flattenObject(row, flattenSeparator, flattenMaxDepth, arrayHandling);
          }
          
          // Determine headers on first row
          if (!headersWritten) {
            headers = determineHeaders(row, template, renameMap);
            
            // Write BOM if enabled
            if (addBOM && includeHeaders) {
              this.push('\uFEFF');
            }
            
            // Write headers if enabled
            if (includeHeaders) {
              const headerRow = formatCsvRow(headers, delimiter, rfc4180Compliant);
              this.push(headerRow);
            }
            
            headersWritten = true;
          }
          
          // Convert row to CSV
          const values = headers.map(header => {
            let value = row[header];
            
            // Handle undefined/null values
            if (value === undefined || value === null) {
              return '';
            }
            
            // Handle arrays based on arrayHandling option
            if (Array.isArray(value)) {
              switch (arrayHandling) {
                case 'stringify':
                  value = JSON.stringify(value);
                  break;
                case 'join':
                  value = value.join(', ');
                  break;
                case 'expand':
                  // For expand, we would need to handle differently
                  // For now, join with semicolon
                  value = value.join('; ');
                  break;
              }
            }
            
            // Convert to string
            const stringValue = String(value);
            
            // Prevent CSV injection if enabled
            if (preventCsvInjection && isPotentialFormula(stringValue)) {
              return escapeCsvInjection(stringValue);
            }
            
            return stringValue;
          });
          
          const csvRow = formatCsvRow(values, delimiter, rfc4180Compliant);
          this.push(csvRow);
          
          recordCount++;
          callback();
        } catch (error: any) {
          callback(error);
        }
      },
      
      flush(callback: TransformCallback) {
        // Nothing to flush
        callback();
      }
    });
    
    return transformStream;
  }, 'STREAM_CREATION_ERROR', { function: 'createJsonToCsvStream' });
}

/**
 * Creates a readable stream from JSON data
 * 
 * @param data - JSON data (array or object)
 * @param options - Stream options
 * @returns Readable stream
 */
export function createJsonReadableStream(
  data: AnyArray | AnyObject,
  options: { objectMode?: boolean } = {}
): Readable {
  return safeExecuteSync(() => {
    const { objectMode = true } = options;
    
    if (!Array.isArray(data) && (typeof data !== 'object' || data === null)) {
      throw new ValidationError('Data must be an array or object');
    }
    
    const items = Array.isArray(data) ? data : [data];
    let index = 0;
    
    return new Readable({
      objectMode,
      
      read() {
        if (index < items.length) {
          this.push(items[index]);
          index++;
        } else {
          this.push(null);
        }
      }
    });
  }, 'STREAM_CREATION_ERROR', { function: 'createJsonReadableStream' });
}

/**
 * Creates a collector stream that accumulates CSV output
 * 
 * @param options - Stream options
 * @returns Transform stream that collects CSV data
 */
export function createCsvCollectorStream(
  options: JsonToCsvStreamOptions = {}
): Transform {
  return safeExecuteSync(() => {
    let collectedData = '';
    
    const transformStream = new Transform({
      writableObjectMode: false,
      readableObjectMode: false,
      
      transform(chunk: Buffer | string, encoding: BufferEncoding, callback: TransformCallback) {
        collectedData += chunk.toString();
        callback();
      },
      
      flush(callback: TransformCallback) {
        this.push(collectedData);
        callback();
      }
    });
    
    // Pipe through JSON to CSV converter if options provided
    if (Object.keys(options).length > 0) {
      const jsonToCsvStream = createJsonToCsvStream(options);
      jsonToCsvStream.pipe(transformStream);
      return jsonToCsvStream;
    }
    
    return transformStream;
  }, 'STREAM_CREATION_ERROR', { function: 'createCsvCollectorStream' });
}

/**
 * Streams JSON data to CSV format
 * 
 * @param data - JSON data to convert
 * @param options - Conversion options
 * @returns Promise with CSV string
 */
export async function streamJsonToCsv(
  data: AnyArray | AnyObject,
  options: JsonToCsvStreamOptions = {}
): Promise<string> {
  return safeExecuteAsync(async () => {
    const readableStream = createJsonReadableStream(data);
    const jsonToCsvStream = createJsonToCsvStream(options);
    const collectorStream = createCsvCollectorStream();
    
    await pipeline(
      readableStream,
      jsonToCsvStream,
      collectorStream
    );
    
    // Get collected data from collector stream
    return new Promise((resolve, reject) => {
      let result = '';
      
      collectorStream.on('data', (chunk: Buffer | string) => {
        result += chunk.toString();
      });
      
      collectorStream.on('end', () => {
        resolve(result);
      });
      
      collectorStream.on('error', reject);
    });
  }, 'STREAM_PROCESSING_ERROR', { function: 'streamJsonToCsv' });
}

/**
 * Asynchronous version with worker thread support
 */
export async function streamJsonToCsvAsync(
  data: AnyArray | AnyObject,
  options: JsonToCsvStreamOptions & {
    useWorkers?: boolean;
    workerCount?: number;
    chunkSize?: number;
    onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
  } = {}
): Promise<string> {
  return safeExecuteAsync(async () => {
    const { useWorkers = false, workerCount, chunkSize, onProgress, ...streamOptions } = options;
    
    // For now, use the standard streaming version
    // TODO: Implement worker thread support for large datasets
    return streamJsonToCsv(data, streamOptions);
  }, 'STREAM_PROCESSING_ERROR', { function: 'streamJsonToCsvAsync' });
}

/**
 * Saves JSON stream as CSV file
 * 
 * @param readableStream - Readable stream of JSON objects
 * @param filePath - Path to save CSV file
 * @param options - Conversion options
 * @returns Promise<void>
 */
export async function saveJsonStreamAsCsv(
  readableStream: Readable,
  filePath: string,
  options: JsonToCsvStreamOptions & { validatePath?: boolean } = {}
): Promise<void> {
  return safeExecuteAsync(async () => {
    const { validatePath = true, ...streamOptions } = options;
    
    // Validate file path if requested
    if (validatePath) {
      // TODO: Implement file path validation
    }
    
    const jsonToCsvStream = createJsonToCsvStream(streamOptions);
    const fs = require('fs');
    const writableStream = fs.createWriteStream(filePath);
    
    await pipeline(
      readableStream,
      jsonToCsvStream,
      writableStream
    );
    
    return;
  }, 'FILE_SYSTEM_ERROR', { function: 'saveJsonStreamAsCsv' });
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Determines headers from data, template, and rename map
 */
function determineHeaders(
  row: AnyObject,
  template: AnyObject,
  renameMap: Record<string, string>
): string[] {
  // Start with template keys if provided
  let headers = Object.keys(template);
  
  // If no template, use row keys
  if (headers.length === 0) {
    headers = Object.keys(row);
  }
  
  // Apply rename map
  headers = headers.map(header => renameMap[header] || header);
  
  return headers;
}

/**
 * Formats a CSV row with proper quoting
 */
function formatCsvRow(
  values: string[],
  delimiter: string,
  rfc4180Compliant: boolean
): string {
  const escapedValues = values.map(value => {
    if (rfc4180Compliant) {
      // RFC 4180 compliant escaping
      if (value.includes('"') || value.includes(delimiter) || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    } else {
      // Simple escaping
      if (value.includes(delimiter) || value.includes('\n')) {
        return `"${value}"`;
      }
      return value;
    }
  });
  
  return escapedValues.join(delimiter) + '\n';
}

/**
 * Checks if a string is a potential CSV injection
 */
function isPotentialFormula(value: string): boolean {
  const formulaPatterns = [
    /^[=+\-@]/,
    /^[\t ]*[=+\-@]/,
    /^[\t ]*["'][=+\-@]/
  ];
  
  return formulaPatterns.some(pattern => pattern.test(value));
}

/**
 * Escapes CSV injection characters
 */
function escapeCsvInjection(value: string): string {
  // Prefix with tab character to prevent formula execution in Excel
  return `\t${value}`;
}

/**
 * Flattens nested objects
 */
function flattenObject(
  obj: AnyObject,
  separator: string,
  maxDepth: number,
  arrayHandling: string
): AnyObject {
  const result: AnyObject = {};
  
  function flatten(current: any, prefix: string, depth: number) {
    if (depth > maxDepth) {
      return;
    }
    
    if (Array.isArray(current)) {
      switch (arrayHandling) {
        case 'stringify':
          result[prefix] = JSON.stringify(current);
          break;
        case 'join':
          result[prefix] = current.join(', ');
          break;
        case 'expand':
          // For expand, we would create multiple columns
          // For now, join with separator
          result[prefix] = current.join(separator);
          break;
      }
    } else if (typeof current === 'object' && current !== null) {
      for (const [key, value] of Object.entries(current)) {
        const newPrefix = prefix ? `${prefix}${separator}${key}` : key;
        flatten(value, newPrefix, depth + 1);
      }
    } else {
      result[prefix] = current;
    }
  }
  
  flatten(obj, '', 0);
  return result;
}