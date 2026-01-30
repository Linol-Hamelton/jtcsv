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
      fastPathMode = 'objects'
    } = options;
    
    // Validate options
    if (delimiter && (typeof delimiter !== 'string' || delimiter.length !== 1)) {
      throw new ConfigurationError('Delimiter must be a single character string');
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
    
    // Create schema validator if schema is provided
    // TODO: Fix schema validator types
    const schemaValidator = schema ? (createSchemaValidators as any)(schema) : null;
    
    let buffer = '';
    let headers: string[] = [];
    let headersProcessed = false;
    let rowCount = 0;
    let finalDelimiter = delimiter;
    
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
            
            // Check max rows limit
            if (rowCount >= maxRows) {
              break;
            }
            
            // Auto-detect delimiter on first line if needed
            if (!finalDelimiter && autoDetect && !headersProcessed) {
              finalDelimiter = autoDetectDelimiterFromLine(line, candidates);
            }
            
            if (!finalDelimiter) {
              finalDelimiter = ';'; // Default fallback
            }
            
            // Parse CSV line
            const values = parseCsvLine(line, finalDelimiter, trim);
            
            // Process headers
            if (!headersProcessed) {
              if (hasHeaders) {
                headers = values;
                headersProcessed = true;
                continue;
              } else {
                // Generate default headers
                headers = values.map((_, index) => `col${index}`);
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
                rowCount + (hasHeaders ? 2 : 1),
                line
              );
            }
            
            // Create JSON object
            const row: AnyObject = {};
            for (let j = 0; j < finalHeaders.length; j++) {
              let value: any = values[j];
              
              // Parse numbers if enabled
              if (parseNumbers && !isNaN(Number(value)) && value.trim() !== '') {
                value = Number(value);
              }
              
              // Parse booleans if enabled
              if (parseBooleans) {
                const lowerValue = String(value).toLowerCase();
                if (lowerValue === 'true' || lowerValue === 'false') {
                  value = lowerValue === 'true';
                }
              }
              
              row[finalHeaders[j]] = value;
            }
            
            // Apply schema validation if provided
            if (schemaValidator) {
              const validationResult = schemaValidator.validate(row);
              if (!validationResult.valid) {
                throw new ValidationError(`Schema validation failed: ${validationResult.errors?.join(', ')}`);
              }
              // Apply schema transformations if any
              const transformedRow = schemaValidator.transform(row) || row;
              
              // Apply custom transform if provided
              const finalRow = customTransform ? customTransform(transformedRow) : transformedRow;
              this.push(finalRow);
            } else {
              // Apply custom transform if provided
              const finalRow = customTransform ? customTransform(row) : row;
              this.push(finalRow);
            }
            
            rowCount++;
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
            if (rowCount < maxRows) {
              // Auto-detect delimiter if needed
              if (!finalDelimiter && autoDetect && !headersProcessed) {
                finalDelimiter = autoDetectDelimiterFromLine(buffer, candidates);
              }
              
              if (!finalDelimiter) {
                finalDelimiter = ';';
              }
              
              const values = parseCsvLine(buffer, finalDelimiter, trim);
              
              if (!headersProcessed) {
                if (hasHeaders) {
                  headers = values;
                  headersProcessed = true;
                } else {
                  headers = values.map((_, index) => `col${index}`);
                  headersProcessed = true;
                }
              } else {
                const finalHeaders = headers.map(header => renameMap[header] || header);
                
                if (values.length !== finalHeaders.length) {
                  throw ParsingError.fieldCountMismatch(
                    finalHeaders.length,
                    values.length,
                    rowCount + (hasHeaders ? 2 : 1),
                    buffer
                  );
                }
                
                const row: AnyObject = {};
                for (let j = 0; j < finalHeaders.length; j++) {
                  let value: any = values[j];
                  
                  if (parseNumbers && !isNaN(Number(value)) && value.trim() !== '') {
                    value = Number(value);
                  }
                  
                  if (parseBooleans) {
                    const lowerValue = String(value).toLowerCase();
                    if (lowerValue === 'true' || lowerValue === 'false') {
                      value = lowerValue === 'true';
                    }
                  }
                  
                  row[finalHeaders[j]] = value;
                }
                
                if (schemaValidator) {
                  const validationResult = schemaValidator.validate(row);
                  if (!validationResult.valid) {
                    throw new ValidationError(`Schema validation failed: ${validationResult.errors?.join(', ')}`);
                  }
                  const transformedRow = schemaValidator.transform(row) || row;
                  const finalRow = customTransform ? customTransform(transformedRow) : transformedRow;
                  this.push(finalRow);
                } else {
                  const finalRow = customTransform ? customTransform(row) : row;
                  this.push(finalRow);
                }
              }
            }
          } catch (error: any) {
            callback(error);
            return;
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
        callback();
      },
      
      flush(callback: TransformCallback) {
        this.push(JSON.stringify(collectedData, null, 2));
        callback();
      }
    });
    
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
  options: CsvToJsonStreamOptions = {}
): Promise<AnyArray> {
  return safeExecuteAsync(async () => {
    // Create readable stream from CSV string
    const readableStream = new Readable({
      read() {
        this.push(csv);
        this.push(null);
      }
    });
    
    const csvToJsonStream = createCsvToJsonStream(options);
    const collectorStream = createJsonCollectorStream();
    
    await pipeline(
      readableStream,
      csvToJsonStream,
      collectorStream
    );
    
    // Get collected data from collector stream
    return new Promise((resolve, reject) => {
      let result = '';
      
      collectorStream.on('data', (chunk: Buffer | string) => {
        result += chunk.toString();
      });
      
      collectorStream.on('end', () => {
        try {
          const parsed = JSON.parse(result);
          resolve(parsed);
        } catch (error: any) {
          reject(new ParsingError(`Failed to parse JSON result: ${error.message}`));
        }
      });
      
      collectorStream.on('error', reject);
    });
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
export function createCsvFileToJsonStream(
  filePath: string,
  options: CsvToJsonStreamOptions & { validatePath?: boolean } = {}
): Readable {
  return safeExecuteSync(() => {
    const { validatePath = true, ...streamOptions } = options;
    
    // Validate file path if requested
    if (validatePath) {
      // TODO: Implement file path validation
    }
    
    const fs = require('fs');
    const fileStream = fs.createReadStream(filePath, 'utf8');
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
  trim: boolean
): string[] {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let quoteChar = '"';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : '';
    
    if (!inQuotes && char === delimiter) {
      // End of field
      result.push(trim ? currentField.trim() : currentField);
      currentField = '';
    } else if (!inQuotes && (char === '"' || char === "'")) {
      // Start of quoted field
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar && nextChar === quoteChar) {
      // Escaped quote
      currentField += char;
      i++; // Skip next character
    } else if (inQuotes && char === quoteChar) {
      // End of quoted field
      inQuotes = false;
    } else {
      // Regular character
      currentField += char;
    }
  }
  
  // Add last field
  result.push(trim ? currentField.trim() : currentField);
  
  // Check for unclosed quotes
  if (inQuotes) {
    throw ParsingError.unclosedQuotes(
      undefined,
      undefined,
      line.substring(0, 100)
    );
  }
  
  return result;
}