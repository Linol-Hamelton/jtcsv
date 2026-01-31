/**
 * Stream CSV to JSON Converter - TypeScript Module
 * 
 * A streaming implementation for converting CSV data to JSON format
 * with memory-efficient processing for large files.
 */

import {
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  safeExecuteSync,
  safeExecuteAsync,
  ErrorCode
} from './errors';

import { Transform, Readable, Writable, TransformCallback } from 'stream';
import { pipeline } from 'stream/promises';
import { CsvToJsonStreamOptions, AnyObject, AnyArray } from './src/types';

// Import schema validator from utils
import { createSchemaValidators } from './src/utils/schema-validator';
import { createBomStripStream, detectBom, stripBomFromString } from './src/utils/bom-utils';

/**
 * Creates a transform stream that converts CSV chunks to JSON objects
 * 
 * @param options - Configuration options
 * @returns Transform stream
 * 
 * @example
 * const { createCsvToJsonStream } = require('./stream-csv-to-json');
 * 
 * const transformStream = createCsvToJsonStream({
 *   delimiter: ',',
 *   parseNumbers: true,
 *   parseBooleans: true
 * });
 */
export function createCsvToJsonStream(options: CsvToJsonStreamOptions = {}): Transform {
  return safeExecuteSync(() => {
    const {
      delimiter,
      autoDetect = true,
      candidates = [';', ',', '\t', '|'],
      hasHeaders = true,
      renameMap = {},
      trim = true,
      parseNumbers = false,
      parseBooleans = false,
      maxRows = Infinity,
      transform: customTransform,
      schema,
      useFastPath = true,
      fastPathMode = 'objects',
      onError = 'throw',
      errorHandler
    } = options;
    
    // Validate options
    if (delimiter !== undefined && typeof delimiter !== 'string') {
      throw new ConfigurationError('Delimiter must be a string');
    }

    if (delimiter && delimiter.length !== 1) {
      throw new ConfigurationError('Delimiter must be a single character');
    }
    
    if (typeof hasHeaders !== 'boolean') {
      throw new ConfigurationError('hasHeaders must be a boolean');
    }
    
    if (renameMap && typeof renameMap !== 'object') {
      throw new ConfigurationError('renameMap must be an object');
    }
    
    if (maxRows !== Infinity && (typeof maxRows !== 'number' || maxRows <= 0)) {
      throw new ConfigurationError('maxRows must be a positive number or Infinity');
    }

    if (customTransform !== undefined && typeof customTransform !== 'function') {
      throw new ConfigurationError('transform must be a function');
    }

    if (schema && typeof schema !== 'object') {
      throw new ConfigurationError('schema must be an object');
    }

    if (onError !== undefined && !['skip', 'warn', 'throw'].includes(onError)) {
      throw new ConfigurationError('onError must be "skip", "warn", or "throw"');
    }

    if (errorHandler !== undefined && typeof errorHandler !== 'function') {
      throw new ConfigurationError('errorHandler must be a function');
    }
    
    // Create schema validator if schema is provided
    // TODO: Fix schema validator types
    const schemaValidators = schema ? createSchemaValidators(schema) : null;
    
    let buffer = '';
    let headers: string[] = [];
    let headersProcessed = false;
    let rowCount = 0;
    let inputLineNumber = 0;
    let finalDelimiter = delimiter;

    const normalizeValue = (value: any): any => {
      let normalized = value;
      if (trim && typeof normalized === 'string') {
        normalized = normalized.trim();
      }
      if (typeof normalized === 'string') {
        if (normalized === '') {
          return null;
        }
        if (normalized[0] === "'" && normalized.length > 1) {
          const candidate = normalized.slice(1);
          const leading = trim ? candidate.trimStart() : candidate;
          const firstChar = leading[0];
          if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@') {
            normalized = candidate;
          }
        }
      }
      if (parseNumbers && typeof normalized === 'string' && normalized.trim() !== '' && !isNaN(Number(normalized))) {
        normalized = Number(normalized);
      }
      if (parseBooleans && normalized !== null && normalized !== undefined) {
        const lowerValue = String(normalized).toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'false') {
          normalized = lowerValue === 'true';
        }
      }
      return normalized;
    };

    const handleRowError = (error: Error, line: string, lineNumber: number): boolean => {
      if (error instanceof LimitError) {
        throw error;
      }
      if (errorHandler) {
        errorHandler(error, line, lineNumber);
      }
      if (onError === 'warn') {
        if (process.env['NODE_ENV'] !== 'test') {
          console.warn(`[jtcsv] Line ${lineNumber}: ${error.message}`);
        }
        return true;
      }
      if (onError === 'skip') {
        return true;
      }
      throw error;
    };
    
    // Create transform stream
    const transformStream = new Transform({
      readableObjectMode: true,
      writableObjectMode: false,
      
      transform(chunk: Buffer | string, encoding: BufferEncoding, callback: TransformCallback) {
        try {
          // Convert chunk to string
          const chunkStr = chunk.toString();
          buffer += chunkStr;
          
          // Process complete lines
          const lines = buffer.split('\n');
          
          // Keep last incomplete line in buffer
          buffer = lines.pop() || '';
          
          // Process complete lines
          for (const line of lines) {
            if (line.trim() === '') {
              continue; // Skip empty lines
            }
            inputLineNumber += 1;
            
            // Check max rows limit
            if (rowCount >= maxRows) {
              throw new LimitError(
                `CSV size exceeds maximum limit of ${maxRows} rows`,
                maxRows,
                rowCount + 1
              );
            }
            
            try {
              // Auto-detect delimiter on first line if needed
              if (!finalDelimiter && autoDetect && !headersProcessed) {
                finalDelimiter = autoDetectDelimiterFromLine(line, candidates);
              }
              
              if (!finalDelimiter) {
                finalDelimiter = ';'; // Default fallback
              }
              
              // Parse CSV line
              const values = parseCsvLine(line, finalDelimiter, trim, inputLineNumber);
              
              // Process headers
              if (!headersProcessed) {
                if (hasHeaders) {
                  headers = values;
                  headersProcessed = true;
                  continue;
                } else {
                  // Generate default headers
                  headers = values.map((_, index) => `column${index + 1}`);
                  headersProcessed = true;
                }
              }
              
              // Apply rename map to headers
              const finalHeaders = headers.map(header => renameMap[header] || header);
              
              // Handle field count mismatch
              if (values.length !== finalHeaders.length) {
                throw ParsingError.fieldCountMismatch(
                  finalHeaders.length,
                  values.length,
                  inputLineNumber,
                  line
                );
              }
              
              // Create JSON object
              const row: AnyObject = {};
              for (let j = 0; j < finalHeaders.length; j++) {
                const value = normalizeValue(values[j]);
                row[finalHeaders[j]] = value;
              }
              
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
                this.push(transformed);
              } else {
                this.push(row);
              }
              
              rowCount++;
            } catch (error: any) {
              if (!headersProcessed && hasHeaders) {
                throw error;
              }
              if (handleRowError(error as Error, line, inputLineNumber)) {
                continue;
              }
            }
          }
          
          callback();
        } catch (error: any) {
          callback(error);
        }
      },
      
      flush(callback: TransformCallback) {
        // Process any remaining data in buffer
        if (buffer.trim() !== '') {
          try {
            // Check max rows limit
            if (rowCount >= maxRows) {
              throw new LimitError(
                `CSV size exceeds maximum limit of ${maxRows} rows`,
                maxRows,
                rowCount + 1
              );
            }
            if (rowCount < maxRows) {
              inputLineNumber += 1;
              // Auto-detect delimiter if needed
              if (!finalDelimiter && autoDetect && !headersProcessed) {
                finalDelimiter = autoDetectDelimiterFromLine(buffer, candidates);
              }
              
              if (!finalDelimiter) {
                finalDelimiter = ';';
              }
              
              const values = parseCsvLine(buffer, finalDelimiter, trim, inputLineNumber);
              
              if (!headersProcessed) {
                if (hasHeaders) {
                  headers = values;
                  headersProcessed = true;
                } else {
                  headers = values.map((_, index) => `column${index + 1}`);
                  headersProcessed = true;
                }
              } else {
                const finalHeaders = headers.map(header => renameMap[header] || header);
                
                if (values.length !== finalHeaders.length) {
                  throw ParsingError.fieldCountMismatch(
                    finalHeaders.length,
                    values.length,
                    inputLineNumber,
                    buffer
                  );
                }
                
                const row: AnyObject = {};
                for (let j = 0; j < finalHeaders.length; j++) {
                  const value = normalizeValue(values[j]);
                  row[finalHeaders[j]] = value;
                }

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
                  this.push(transformed);
                } else {
                  this.push(row);
                }
              }
            }
          } catch (error: any) {
            if (!headersProcessed && hasHeaders) {
              callback(error);
              return;
            }
            try {
              if (handleRowError(error as Error, buffer, inputLineNumber)) {
                callback();
                return;
              }
            } catch (handledError: any) {
              callback(handledError);
              return;
            }
          }
        }
        
        callback();
      }
    });
    
    return transformStream;
  }, 'STREAM_CREATION_ERROR', { function: 'createCsvToJsonStream' });
}

/**
 * Creates a collector stream that accumulates JSON objects
 * 
 * @param options - Stream options
 * @returns Transform stream that collects JSON data
 */
export function createJsonCollectorStream(
  options: CsvToJsonStreamOptions = {}
): Transform {
  return safeExecuteSync(() => {
    const collectedData: AnyArray = [];
    
    const transformStream = new Transform({
      writableObjectMode: true,
      readableObjectMode: false,
      
      transform(chunk: AnyObject, encoding: BufferEncoding, callback: TransformCallback) {
        collectedData.push(chunk);
        (transformStream as any)._collectedData = collectedData;
        callback();
      },
      
      flush(callback: TransformCallback) {
        this.push(JSON.stringify(collectedData, null, 2));
        (transformStream as any)._collectedData = collectedData;
        callback();
      }
    });

    (transformStream as any)._collectedData = collectedData;
    
    // Pipe through CSV to JSON converter if options provided
    if (Object.keys(options).length > 0) {
      const csvToJsonStream = createCsvToJsonStream(options);
      csvToJsonStream.pipe(transformStream);
      return csvToJsonStream;
    }
    
    return transformStream;
  }, 'STREAM_CREATION_ERROR', { function: 'createJsonCollectorStream' });
}

/**
 * Streams CSV data to JSON format
 * 
 * @param csv - CSV string to convert
 * @param options - Conversion options
 * @returns Promise with JSON array
 */
export async function streamCsvToJson(
  csv: string,
  options?: CsvToJsonStreamOptions
): Promise<AnyArray>;
export async function streamCsvToJson(
  readableStream: Readable,
  writableStream: Writable,
  options?: CsvToJsonStreamOptions
): Promise<void>;
export async function streamCsvToJson(
  csvOrStream: string | Readable,
  outputOrOptions: Writable | CsvToJsonStreamOptions = {},
  options: CsvToJsonStreamOptions = {}
): Promise<AnyArray | void> {
  return safeExecuteAsync(async () => {
    const isReadableStream = (value: any): value is Readable =>
      value instanceof Readable || (value && typeof value.pipe === 'function');
    const isWritableStream = (value: any): value is Writable =>
      value instanceof Writable || (value && typeof value.write === 'function');

    if (isReadableStream(csvOrStream) && isWritableStream(outputOrOptions)) {
      const csvToJsonStream = createCsvToJsonStream(options);
      await pipeline(
        csvOrStream,
        csvToJsonStream,
        outputOrOptions
      );
      return;
    }

    const streamOptions = (outputOrOptions as CsvToJsonStreamOptions) || {};
    // Create readable stream from CSV string
    const readableStream = new Readable({
      read() {
        this.push(csvOrStream as string);
        this.push(null);
      }
    });
    
    const csvToJsonStream = createCsvToJsonStream(streamOptions);
    const collectorStream = createJsonCollectorStream();
    
    await pipeline(
      readableStream,
      csvToJsonStream,
      collectorStream
    );
    
    return ((collectorStream as any)._collectedData as AnyArray) || [];
  }, 'STREAM_PROCESSING_ERROR', { function: 'streamCsvToJson' });
}

/**
 * Asynchronous version with worker thread support
 */
export async function streamCsvToJsonAsync(
  csv: string,
  options: CsvToJsonStreamOptions & {
    useWorkers?: boolean;
    workerCount?: number;
    chunkSize?: number;
    onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
  } = {}
): Promise<AnyArray> {
  return safeExecuteAsync(async () => {
    const { useWorkers = false, workerCount, chunkSize, onProgress, ...streamOptions } = options;
    
    // For now, use the standard streaming version
    // TODO: Implement worker thread support for large datasets
    return streamCsvToJson(csv, streamOptions);
  }, 'STREAM_PROCESSING_ERROR', { function: 'streamCsvToJsonAsync' });
}

/**
 * Creates a CSV file to JSON stream pipeline
 * 
 * @param filePath - Path to CSV file
 * @param options - Conversion options
 * @returns Readable stream of JSON objects
 */
export async function createCsvFileToJsonStream(
  filePath: string,
  options: CsvToJsonStreamOptions & { validatePath?: boolean } = {}
): Promise<Readable> {
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

    try {
      await fs.promises.access(safePath);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new FileSystemError(`File not found: ${safePath}`, error);
      }
      throw error;
    }

    const fileStream = fs.createReadStream(safePath, 'utf8');
    const csvToJsonStream = createCsvToJsonStream(streamOptions);
    
    // Handle BOM stripping
    const bomStripStream = createBomStripStream();
    
    // Create pipeline
    const { pipeline } = require('stream');
    const { PassThrough } = require('stream');
    
    const outputStream = new PassThrough({ objectMode: true });
    
    pipeline(
      fileStream,
      bomStripStream,
      csvToJsonStream,
      outputStream,
      (error: any) => {
        if (error) {
          outputStream.emit('error', error);
        }
      }
    );
    
    return outputStream;
  }, 'STREAM_CREATION_ERROR', { function: 'createCsvFileToJsonStream' });
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Auto-detects delimiter from a single CSV line
 */
function autoDetectDelimiterFromLine(
  line: string,
  candidates: string[]
): string {
  let bestDelimiter = candidates[0];
  let bestScore = -1;
  
  for (const delimiter of candidates) {
    let score = 0;
    
    // Count occurrences
    for (let i = 0; i < line.length; i++) {
      if (line[i] === delimiter) {
        score++;
      }
    }
    
    // Bonus for consistent field count (check for quotes)
    const fields = line.split(delimiter);
    let hasQuotes = false;
    let consistent = true;
    
    for (const field of fields) {
      if (field.includes('"') || field.includes("'")) {
        hasQuotes = true;
      }
    }
    
    if (!hasQuotes && fields.length > 1) {
      score += 10;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
}

/**
 * Parses a single CSV line
 */
function parseCsvLine(
  line: string,
  delimiter: string,
  trim: boolean,
  lineNumber?: number
): string[] {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let quoteChar = '"';
  let escapeNext = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : '';

    if (escapeNext) {
      currentField += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (!inQuotes && char === delimiter) {
      result.push(trim ? currentField.trim() : currentField);
      currentField = '';
    } else if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar && nextChar === quoteChar) {
      currentField += char;
      if (i + 2 === line.length) {
        inQuotes = false;
      }
      i++;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
    } else {
      currentField += char;
    }
  }

  if (escapeNext) {
    currentField += '\\';
  }
  
  result.push(trim ? currentField.trim() : currentField);
  
  if (inQuotes) {
    throw ParsingError.unclosedQuotes(
      lineNumber ?? null,
      null,
      line.substring(0, 100)
    );
  }
  
  return result;
}
