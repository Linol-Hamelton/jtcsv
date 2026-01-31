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
      addBOM = false,
      preventCsvInjection = true,
      rfc4180Compliant = true,
      flatten = false,
      flattenSeparator = '.',
      flattenMaxDepth = 5,
      arrayHandling = 'stringify'
    } = options;
    
    // Validate options
    if (typeof delimiter !== 'string') {
      throw new ConfigurationError('Delimiter must be a string');
    }
    
    if (delimiter.length !== 1) {
      throw new ConfigurationError('Delimiter must be a single character');
    }
    
    if (typeof includeHeaders !== 'boolean') {
      throw new ConfigurationError('includeHeaders must be a boolean');
    }
    
    if (renameMap && typeof renameMap !== 'object') {
      throw new ConfigurationError('renameMap must be an object');
    }

    if (template && typeof template !== 'object') {
      throw new ConfigurationError('template must be an object');
    }
    
    if (maxRecords !== Infinity && (typeof maxRecords !== 'number' || maxRecords <= 0)) {
      throw new ConfigurationError('maxRecords must be a positive number or Infinity');
    }

    if (customTransform !== undefined && typeof customTransform !== 'function') {
      throw new ConfigurationError('transform must be a function');
    }

    if (schema && typeof schema !== 'object') {
      throw new ConfigurationError('schema must be an object');
    }
    
    // Create schema validator if schema is provided
    // TODO: Fix schema validator types
    const schemaValidators = schema ? createSchemaValidators(schema) : null;
    
    let headers: string[] = [];
    let outputHeaders: string[] = [];
    let headersWritten = false;
    let recordCount = 0;
    
    // Create transform stream
    const transformStream = new Transform({
      objectMode: true,
      
      transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
        try {
          // Check max records limit
          if (recordCount >= maxRecords) {
            throw new LimitError(
              `Data size exceeds maximum limit of ${maxRecords} records`,
              maxRecords,
              recordCount + 1
            );
          }
          
          // Validate chunk is an object
          if (typeof chunk !== 'object' || chunk === null) {
            throw new ValidationError('Input data must be objects');
          }
          
          let row: AnyObject = chunk;
          
          // Apply schema validation if provided
          if (schemaValidators && Object.keys(schemaValidators).length > 0) {
            for (const [field, validator] of Object.entries(schemaValidators)) {
              const typedValidator = validator as any;
              const value = row[field];
              if (typeof typedValidator.validate === 'function' && !typedValidator.validate(value)) {
                throw new ValidationError(`Invalid value for field "${field}"`);
              }
              if (typeof typedValidator.format === 'function') {
                row[field] = typedValidator.format(value);
              }
            }
          }
          
          // Apply custom transform if provided
          if (customTransform) {
            let transformed: AnyObject;
            try {
              transformed = customTransform(row);
            } catch (error: any) {
              throw new ValidationError(`Transform function error: ${error.message}`);
            }
            if (!transformed || typeof transformed !== 'object') {
              throw new ValidationError('Transform function must return an object');
            }
            row = transformed;
          }
          
          // Flatten nested objects if enabled
          if (flatten) {
            row = flattenObject(row, flattenSeparator, flattenMaxDepth, arrayHandling);
          }
          
          // Determine headers on first row
          if (!headersWritten) {
            const resolvedHeaders = determineHeaders(row, template, renameMap);
            headers = resolvedHeaders.headers;
            outputHeaders = resolvedHeaders.outputHeaders;
            
            // Write BOM if enabled
            if (addBOM && includeHeaders) {
              this.push('\uFEFF');
            }
            
            // Write headers if enabled
            if (includeHeaders) {
              const headerRow = formatCsvRow(outputHeaders, delimiter, rfc4180Compliant);
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
        try {
          if (!headersWritten && includeHeaders) {
            const templateKeys = Object.keys(template || {});
            if (templateKeys.length > 0) {
              headers = templateKeys;
              outputHeaders = headers.map(header => renameMap[header] || header);
              
              if (addBOM) {
                this.push('\uFEFF');
              }
              const headerRow = formatCsvRow(outputHeaders, delimiter, rfc4180Compliant);
              this.push(headerRow);
              headersWritten = true;
            }
          }
          callback();
        } catch (error: any) {
          callback(error);
        }
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
    
    const readable = new Readable({
      objectMode,
      
      read() {
        if (index < items.length) {
          (this as any)._index = index + 1;
          this.push(items[index]);
          index++;
        } else {
          (this as any)._index = index;
          this.push(null);
        }
      }
    });
    (readable as any)._index = index;
    return readable;
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
        (transformStream as any)._collectedData = collectedData;
        callback();
      },
      
      flush(callback: TransformCallback) {
        this.push(collectedData);
        (transformStream as any)._collectedData = collectedData;
        callback();
      }
    });

    (transformStream as any)._collectedData = collectedData;
    
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
  options?: JsonToCsvStreamOptions
): Promise<string>;
export async function streamJsonToCsv(
  readableStream: Readable,
  writableStream: Writable,
  options?: JsonToCsvStreamOptions
): Promise<void>;
export async function streamJsonToCsv(
  dataOrStream: AnyArray | AnyObject | Readable,
  outputOrOptions: Writable | JsonToCsvStreamOptions = {},
  options: JsonToCsvStreamOptions = {}
): Promise<string | void> {
  return safeExecuteAsync(async () => {
    const isReadableStream = dataOrStream instanceof Readable
      || (dataOrStream && typeof (dataOrStream as Readable).pipe === 'function');
    const isWritableStream = outputOrOptions instanceof Writable
      || (outputOrOptions && typeof (outputOrOptions as Writable).write === 'function');

    if (isReadableStream && isWritableStream) {
      const jsonToCsvStream = createJsonToCsvStream(options);
      await pipeline(
        dataOrStream as Readable,
        jsonToCsvStream,
        outputOrOptions as Writable
      );
      return;
    }

    const streamOptions = (outputOrOptions as JsonToCsvStreamOptions) || {};
    const readableStream = createJsonReadableStream(dataOrStream as AnyArray | AnyObject);
    const jsonToCsvStream = createJsonToCsvStream(streamOptions);
    const collectorStream = createCsvCollectorStream();
    
    await pipeline(
      readableStream,
      jsonToCsvStream,
      collectorStream
    );
    
    return (collectorStream as any)._collectedData || '';
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

    const fs = require('fs');
    const path = require('path');
    let safePath = filePath;
    
    // Validate file path if requested
    if (validatePath) {
      if (typeof filePath !== 'string' || filePath.trim().length === 0) {
        throw new ValidationError('File path must be a non-empty string');
      }
      const normalized = path.normalize(filePath.trim());
      const traversalPattern = /(^|[\\/])\.\.([\\/]|$)/;
      if (traversalPattern.test(normalized)) {
        throw new SecurityError('Directory traversal detected in file path');
      }
      if (path.extname(normalized).toLowerCase() !== '.csv') {
        throw new ValidationError('File must have .csv extension');
      }
      safePath = normalized;
    }

    const resolvedOptions = {
      ...streamOptions,
      addBOM: streamOptions.addBOM !== undefined ? streamOptions.addBOM : true
    };
    const jsonToCsvStream = createJsonToCsvStream(resolvedOptions);
    const dir = path.dirname(safePath);
    await fs.promises.mkdir(dir, { recursive: true });
    const writableStream = fs.createWriteStream(safePath);
    
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
): { headers: string[]; outputHeaders: string[] } {
  // Start with template keys if provided
  let headers = Object.keys(template);
  
  // If no template, use row keys
  if (headers.length === 0) {
    headers = Object.keys(row);
  } else {
    const extraKeys = Object.keys(row).filter((key) => !headers.includes(key));
    headers = headers.concat(extraKeys);
  }
  
  // Apply rename map
  const outputHeaders = headers.map(header => renameMap[header] || header);
  
  return { headers, outputHeaders };
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
  let idx = 0;
  while (idx < value.length) {
    const code = value.charCodeAt(idx);
    if (code === 32 || code === 9 || code === 10 || code === 13 || code === 0xfeff) {
      idx++;
      continue;
    }
    break;
  }
  if (idx < value.length && (value[idx] === '"' || value[idx] === "'")) {
    idx++;
    while (idx < value.length) {
      const code = value.charCodeAt(idx);
      if (code === 32 || code === 9) {
        idx++;
        continue;
      }
      break;
    }
  }
  if (idx >= value.length) {
    return false;
  }
  const char = value[idx];
  return char === '=' || char === '+' || char === '-' || char === '@';
}

/**
 * Escapes CSV injection characters
 */
function escapeCsvInjection(value: string): string {
  // Prefix with apostrophe to prevent formula execution in Excel
  return `'${value}`;
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
