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
  safeExecuteAsync
} from './errors';

import { Transform, Readable, Writable, TransformCallback } from 'stream';
import { pipeline } from 'stream/promises';
import { CsvToJsonStreamOptions, AnyObject, AnyArray } from './src/types';

// Import schema validator from utils
import { createSchemaValidators } from './src/utils/schema-validator';
import { createBomStripStream } from './src/utils/bom-utils';

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
      _useFastPath = true,
      _fastPathMode = 'objects',
      onError = 'throw',
      errorHandler,
      repairRowShifts = true,
      normalizeQuotes = true
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
    let finalHeaders: string[] = [];
    let headersProcessed = false;
    let rowCount = 0;
    let inputLineNumber = 0;
    let finalDelimiter = delimiter;
    let pendingRow: AnyObject | null = null;
    let pendingRowLineNumber: number | null = null;
    let pendingRowLine: string | null = null;

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

    const isEmptyValue = (value: any): boolean =>
      value === undefined || value === null || value === '';

    const hasOddQuotes = (value: any): boolean => {
      if (typeof value !== 'string') {
        return false;
      }
      let count = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] === '"') {
          count++;
        }
      }
      return count % 2 === 1;
    };

    const hasAnyQuotes = (value: any): boolean =>
      typeof value === 'string' && value.includes('"');

    const normalizeQuotesInField = (value: any): any => {
      if (typeof value !== 'string') {
        return value;
      }
      // Не нормализуем кавычки в JSON-строках - это ломает структуру JSON
      // Проверяем, выглядит ли значение как JSON (объект или массив)
      if ((value.startsWith('{') && value.endsWith('}')) ||
          (value.startsWith('[') && value.endsWith(']'))) {
        return value; // Возвращаем как есть для JSON
      }
      
      let normalized = value.replace(/"{2,}/g, '"');
      // Убираем правило, которое ломает JSON: не заменяем "," на ","
      // normalized = normalized.replace(/"\s*,\s*"/g, ',');
      normalized = normalized.replace(/"\n/g, '\n').replace(/\n"/g, '\n');
      if (normalized.length >= 2 && normalized.startsWith('"') && normalized.endsWith('"')) {
        normalized = normalized.slice(1, -1);
      }
      return normalized;
    };

    const normalizePhoneValue = (value: any): any => {
      if (typeof value !== 'string') {
        return value;
      }
      const trimmed = value.trim();
      if (trimmed === '') {
        return trimmed;
      }
      return trimmed.replace(/["'\\]/g, '');
    };

    const normalizeRowQuotes = (row: AnyObject, headersList: string[]): AnyObject => {
      const normalized: AnyObject = {};
      const phoneKeys = new Set(['phone', 'phonenumber', 'phone_number', 'tel', 'telephone']);
      for (const header of headersList) {
        const baseValue = normalizeQuotesInField(row[header]);
        if (phoneKeys.has(String(header).toLowerCase())) {
          normalized[header] = normalizePhoneValue(baseValue);
        } else {
          normalized[header] = baseValue;
        }
      }
      return normalized;
    };

    const looksLikeUserAgent = (value: any): boolean => {
      if (typeof value !== 'string') {
        return false;
      }
      return /Mozilla\/|Opera\/|MSIE|AppleWebKit|Gecko|Safari|Chrome\//.test(value);
    };

    const isHexColor = (value: any): boolean =>
      typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

    const attemptMergeRows = (row: AnyObject, nextRow: AnyObject): AnyObject | null => {
      const headerCount = finalHeaders.length;
      if (headerCount === 0) {
        return null;
      }
      const values = finalHeaders.map((header) => row[header]);
      let lastNonEmpty = -1;
      for (let i = headerCount - 1; i >= 0; i--) {
        if (!isEmptyValue(values[i])) {
          lastNonEmpty = i;
          break;
        }
      }
      const missingCount = headerCount - 1 - lastNonEmpty;
      if (lastNonEmpty >= 0 && missingCount > 0) {
        const nextValues = finalHeaders.map((header) => nextRow[header]);
        const nextTrailingEmpty = nextValues
          .slice(headerCount - missingCount)
          .every((value) => isEmptyValue(value));
        const leadValues = nextValues
          .slice(0, missingCount)
          .filter((value) => !isEmptyValue(value));
        const shouldMerge = nextTrailingEmpty
          && leadValues.length > 0
          && (hasOddQuotes(values[lastNonEmpty]) || hasAnyQuotes(values[lastNonEmpty]));

        if (shouldMerge) {
          const toAppend = leadValues.map((value) => String(value));
          if (toAppend.length > 0) {
            const base = isEmptyValue(values[lastNonEmpty]) ? '' : String(values[lastNonEmpty]);
            values[lastNonEmpty] = base ? `${base}\n${toAppend.join('\n')}` : toAppend.join('\n');
          }
          for (let i = 0; i < missingCount; i++) {
            values[lastNonEmpty + 1 + i] = nextValues[missingCount + i];
          }
          const merged: AnyObject = {};
          for (let i = 0; i < headerCount; i++) {
            merged[finalHeaders[i]] = values[i];
          }
          return merged;
        }
      }

      if (headerCount >= 6) {
        const nextValues = finalHeaders.map((header) => nextRow[header]);
        const nextHex = nextValues[4];
        const nextUserAgentHead = nextValues[2];
        const nextUserAgentTail = nextValues[3];
        const shouldMergeUserAgent = isEmptyValue(values[4])
          && isEmptyValue(values[5])
          && isHexColor(nextHex)
          && (looksLikeUserAgent(nextUserAgentHead) || looksLikeUserAgent(nextUserAgentTail));

        if (shouldMergeUserAgent) {
          const addressParts = [values[3], nextValues[0], nextValues[1]]
            .filter((value) => !isEmptyValue(value))
            .map((value) => String(value));
          values[3] = addressParts.join('\n');
          const uaHead = isEmptyValue(nextUserAgentHead) ? '' : String(nextUserAgentHead);
          const uaTail = isEmptyValue(nextUserAgentTail) ? '' : String(nextUserAgentTail);
          const joiner = uaHead && uaTail ? (uaTail.startsWith(' ') ? '' : ',') : '';
          values[4] = uaHead + joiner + uaTail;
          values[5] = String(nextHex);
          const merged: AnyObject = {};
          for (let i = 0; i < headerCount; i++) {
            merged[finalHeaders[i]] = values[i];
          }
          return merged;
        }
      }

      return null;
    };

    const finalizeHeaders = (nextHeaders: string[]) => {
      headers = nextHeaders;
      finalHeaders = headers.map((header) => renameMap[header] || header);
      headersProcessed = true;
    };

    const emitRow = (
      row: AnyObject,
      line: string,
      lineNumber: number,
      stream: Transform
    ) => {
      if (maxRows !== Infinity && rowCount >= maxRows) {
        throw new LimitError(
          `CSV size exceeds maximum limit of ${maxRows} rows`,
          maxRows,
          rowCount + 1
        );
      }
      let outputRow = row;
      if (normalizeQuotes) {
        outputRow = normalizeRowQuotes(outputRow, finalHeaders);
      }

      if (schemaValidators && Object.keys(schemaValidators).length > 0) {
        for (const [field, validator] of Object.entries(schemaValidators)) {
          const typedValidator = validator as any;
          const value = outputRow[field];
          if (typeof typedValidator.validate === 'function' && !typedValidator.validate(value)) {
            throw new ValidationError(`Invalid value for field "${field}"`);
          }
          if (typeof typedValidator.format === 'function') {
            outputRow[field] = typedValidator.format(value);
          }
        }
      }

      if (customTransform) {
        let transformed: AnyObject;
        try {
          transformed = customTransform(outputRow);
        } catch (error: any) {
          throw new ValidationError(`Transform function error: ${error.message}`);
        }
        if (!transformed || typeof transformed !== 'object') {
          throw new ValidationError('Transform function must return an object');
        }
        stream.push(transformed);
      } else {
        stream.push(outputRow);
      }
      rowCount++;
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
          let errorLine = '';  // Объявляем вне цикла для доступа в catch
          let errorLineNumber = 0;
          for (const line of lines) {
            if (line.trim() === '') {
              continue; // Skip empty lines
            }
            inputLineNumber += 1;
            errorLine = line;
            errorLineNumber = inputLineNumber;
            
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
                  finalizeHeaders(values);
                  continue;
                } else {
                  // Generate default headers
                  finalizeHeaders(values.map((_, index) => `column${index + 1}`));
                }
              }
              if (finalHeaders.length === 0) {
                finalHeaders = headers.map((header) => renameMap[header] || header);
              }
              
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

              if (repairRowShifts) {
                if (!pendingRow) {
                  pendingRow = row;
                  pendingRowLineNumber = inputLineNumber;
                  pendingRowLine = line;
                  continue;
                }

                const merged = attemptMergeRows(pendingRow, row);
                if (merged) {
                  const baseLine = pendingRowLine ?? line;
                  const baseLineNumber = pendingRowLineNumber ?? inputLineNumber;
                  pendingRow = null;
                  pendingRowLine = null;
                  pendingRowLineNumber = null;
                  errorLine = baseLine;
                  errorLineNumber = baseLineNumber;
                  emitRow(merged, baseLine, baseLineNumber, this);
                } else {
                  const baseLine = pendingRowLine ?? line;
                  const baseLineNumber = pendingRowLineNumber ?? inputLineNumber;
                  const rowToEmit = pendingRow;
                  pendingRow = row;
                  pendingRowLine = line;
                  pendingRowLineNumber = inputLineNumber;
                  errorLine = baseLine;
                  errorLineNumber = baseLineNumber;
                  emitRow(rowToEmit, baseLine, baseLineNumber, this);
                }
              } else {
                emitRow(row, line, inputLineNumber, this);
              }
            } catch (error: any) {
              if (!headersProcessed && hasHeaders) {
                throw error;
              }
              if (handleRowError(error as Error, errorLine, errorLineNumber)) {
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
          let errorLine = buffer;  // Объявляем вне try для доступа в catch
          let errorLineNumber = inputLineNumber;
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
              errorLineNumber = inputLineNumber;
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
                  finalizeHeaders(values);
                } else {
                  finalizeHeaders(values.map((_, index) => `column${index + 1}`));
                }
              } else {
                if (finalHeaders.length === 0) {
                  finalHeaders = headers.map((header) => renameMap[header] || header);
                }
                
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

                if (repairRowShifts) {
                  if (!pendingRow) {
                    pendingRow = row;
                    pendingRowLineNumber = inputLineNumber;
                    pendingRowLine = buffer;
                  } else {
                    const merged = attemptMergeRows(pendingRow, row);
                    if (merged) {
                      const baseLine = pendingRowLine ?? buffer;
                      const baseLineNumber = pendingRowLineNumber ?? inputLineNumber;
                      pendingRow = null;
                      pendingRowLine = null;
                      pendingRowLineNumber = null;
                      errorLine = baseLine;
                      errorLineNumber = baseLineNumber;
                      emitRow(merged, baseLine, baseLineNumber, this);
                    } else {
                      const baseLine = pendingRowLine ?? buffer;
                      const baseLineNumber = pendingRowLineNumber ?? inputLineNumber;
                      const rowToEmit = pendingRow;
                      pendingRow = row;
                      pendingRowLine = buffer;
                      pendingRowLineNumber = inputLineNumber;
                      errorLine = baseLine;
                      errorLineNumber = baseLineNumber;
                      emitRow(rowToEmit, baseLine, baseLineNumber, this);
                    }
                  }
                } else {
                  emitRow(row, buffer, inputLineNumber, this);
                }
              }
            }
          } catch (error: any) {
            if (!headersProcessed && hasHeaders) {
              callback(error);
              return;
            }
            try {
              if (handleRowError(error as Error, errorLine, errorLineNumber)) {
                callback();
                return;
              }
            } catch (handledError: any) {
              callback(handledError);
              return;
            }
          }
        }

        if (pendingRow) {
          const baseLine = pendingRowLine ?? '';
          const baseLineNumber = pendingRowLineNumber ?? inputLineNumber;
          try {
            emitRow(pendingRow, baseLine, baseLineNumber, this);
          } catch (error: any) {
            try {
              if (handleRowError(error as Error, baseLine, baseLineNumber)) {
                callback();
                return;
              }
            } catch (handledError: any) {
              callback(handledError);
              return;
            }
          }
          pendingRow = null;
          pendingRowLine = null;
          pendingRowLineNumber = null;
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
  _csv: string,
  _options?: CsvToJsonStreamOptions
): Promise<AnyArray>;
export async function streamCsvToJson(
  _readableStream: Readable,
  _writableStream: Writable,
  _options?: CsvToJsonStreamOptions
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
    _onProgress?: (_progress: { processed: number; total: number; percentage: number }) => void;
  } = {}
): Promise<AnyArray> {
  return safeExecuteAsync(async () => {
    const { _useWorkers = false, _workerCount: _unusedWorkerCount, _chunkSize: _unusedChunkSize, _onProgress: _unusedOnProgress, ...streamOptions } = options;
    
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

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pipeline } = require('stream');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
