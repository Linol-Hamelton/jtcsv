/**
 * CSV to JSON Converter - TypeScript Module
 * 
 * A lightweight, efficient module for converting CSV data to JSON format
 * with proper parsing and error handling.
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

import { TransformHooks, predefinedHooks } from './src/core/transform-hooks';
import { DelimiterCache } from './src/core/delimiter-cache';
import FastPathEngine from './src/engines/fast-path-engine';
import { stripBomFromString, normalizeCsvInput } from './src/utils/bom-utils';
import { CsvToJsonOptions, AsyncCsvToJsonOptions, AnyObject, AnyArray } from './src/types';

// Глобальный экземпляр кэша для авто-детектирования разделителя
const globalDelimiterCache = new DelimiterCache(100);
const globalFastPathEngine = new FastPathEngine();

/**
 * Validates CSV input and options
 * @private
 */
function validateCsvInput(csv: string, options?: CsvToJsonOptions): boolean {
  // Validate CSV input
  if (typeof csv !== 'string') {
    throw new ValidationError('Input must be a CSV string');
  }
  
  // Validate options
  if (options && typeof options !== 'object') {
    throw new ConfigurationError('Options must be an object');
  }
  
  // Validate delimiter
  if (options?.delimiter && typeof options.delimiter !== 'string') {
    throw new ConfigurationError('Delimiter must be a string');
  }
  
  if (options?.delimiter && options.delimiter.length !== 1) {
    throw new ConfigurationError('Delimiter must be a single character');
  }
  
  // Validate autoDetect
  if (options?.autoDetect !== undefined && typeof options.autoDetect !== 'boolean') {
    throw new ConfigurationError('autoDetect must be a boolean');
  }
  
  // Validate candidates
  if (options?.candidates && !Array.isArray(options.candidates)) {
    throw new ConfigurationError('candidates must be an array');
  }
  
  // Validate maxRows
  if (options?.maxRows !== undefined && (typeof options.maxRows !== 'number' || options.maxRows <= 0)) {
    throw new ConfigurationError('maxRows must be a positive number');
  }
  
  // Validate cache options
  if (options?.useCache !== undefined && typeof options.useCache !== 'boolean') {
    throw new ConfigurationError('useCache must be a boolean');
  }
  
  if (options?.cache && !(options.cache instanceof DelimiterCache)) {
    throw new ConfigurationError('cache must be an instance of DelimiterCache');
  }

  if (options?.useFastPath !== undefined && typeof options.useFastPath !== 'boolean') {
    throw new ConfigurationError('useFastPath must be a boolean');
  }

  if (options?.fastPathMode !== undefined
    && options.fastPathMode !== 'objects'
    && options.fastPathMode !== 'compact'
    && options.fastPathMode !== 'stream') {
    throw new ConfigurationError('fastPathMode must be "objects", "compact", or "stream"');
  }

  // Validate hooks
  if (options?.hooks) {
    if (typeof options.hooks !== 'object') {
      throw new ConfigurationError('hooks must be an object');
    }
    
    if (options.hooks.beforeConvert && typeof options.hooks.beforeConvert !== 'function') {
      throw new ConfigurationError('hooks.beforeConvert must be a function');
    }
    
    if (options.hooks.afterConvert && typeof options.hooks.afterConvert !== 'function') {
      throw new ConfigurationError('hooks.afterConvert must be a function');
    }
    
    if (options.hooks.onError && typeof options.hooks.onError !== 'function') {
      throw new ConfigurationError('hooks.onError must be a function');
    }
  }

  return true;
}

/**
 * Auto-detects the delimiter from CSV content
 */
export function autoDetectDelimiter(
  csv: string,
  options: {
    candidates?: string[];
    useCache?: boolean;
    cache?: DelimiterCache;
  } = {}
): string {
  const {
    candidates = [';', ',', '\t', '|'],
    useCache = true,
    cache = globalDelimiterCache
  } = options;

  // Validate candidates
  if (!Array.isArray(candidates)) {
    throw new ConfigurationError('candidates must be an array');
  }

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.length !== 1) {
      throw new ConfigurationError('Each candidate must be a single character string');
    }
  }

  // Check cache if enabled
  if (useCache && cache) {
    const cached = cache.get(csv, candidates);
    if (cached !== null) {
      return cached;
    }
  }

  // Simple delimiter detection logic
  // Count occurrences of each candidate in the first few lines
  const sampleLines = csv.split('\n').slice(0, 10).join('\n');
  let bestDelimiter = candidates[0];
  let bestScore = -1;

  for (const delimiter of candidates) {
    let score = 0;
    
    // Count occurrences in sample
    for (let i = 0; i < sampleLines.length; i++) {
      if (sampleLines[i] === delimiter) {
        score++;
      }
    }
    
    // Bonus for consistent column count
    const lines = sampleLines.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 1) {
      const firstLineColumns = lines[0].split(delimiter).length;
      let consistent = true;
      
      for (let i = 1; i < Math.min(lines.length, 5); i++) {
        if (lines[i].split(delimiter).length !== firstLineColumns) {
          consistent = false;
          break;
        }
      }
      
      if (consistent) {
        score += 100;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  // Cache result if enabled
  if (useCache && cache) {
    cache.set(csv, candidates, bestDelimiter);
  }

  return bestDelimiter;
}

/**
 * Parses a CSV string into JSON objects
 */
export function csvToJson(
  csv: string,
  options: CsvToJsonOptions = {}
): AnyArray {
  return safeExecuteSync(() => {
    // Validate input
    validateCsvInput(csv, options);
    
    const opts = options && typeof options === 'object' ? options : {};
    
    const {
      delimiter,
      autoDetect = true,
      candidates = [';', ',', '\t', '|'],
      hasHeaders = true,
      renameMap = {},
      trim = true,
      parseNumbers = false,
      parseBooleans = false,
      maxRows,
      useFastPath = true,
      fastPathMode = 'objects',
      schema = null,
      transform,
      hooks
    } = opts;
    
    // Handle empty CSV
    if (!csv.trim()) {
      return [];
    }
    
    // Normalize CSV input (remove BOM, normalize line endings)
    const normalizedCsv = normalizeCsvInput(csv);
    
    // Determine delimiter
    let finalDelimiter = delimiter;
    if (!finalDelimiter && autoDetect) {
      finalDelimiter = autoDetectDelimiter(normalizedCsv, { candidates });
    }
    
    if (!finalDelimiter) {
      finalDelimiter = ';'; // Default fallback
    }
    
    // Apply hooks if provided
    let processedCsv = normalizedCsv;
    if (hooks?.beforeConvert) {
      processedCsv = hooks.beforeConvert(processedCsv, opts);
    }
    
    // Use fast-path engine if enabled
    if (useFastPath && globalFastPathEngine) {
      try {
        const fastPathResult = globalFastPathEngine.parse(processedCsv, {
          delimiter: finalDelimiter,
          hasHeaders,
          trim,
          parseNumbers,
          parseBooleans,
          maxRows,
          mode: fastPathMode
        });
        
        // Apply rename map if provided
        if (Object.keys(renameMap).length > 0 && Array.isArray(fastPathResult)) {
          const renamedResult = fastPathResult.map((row: AnyObject) => {
            const renamedRow: AnyObject = {};
            for (const [key, value] of Object.entries(row)) {
              const newKey = renameMap[key] || key;
              renamedRow[newKey] = value;
            }
            return renamedRow;
          });
          
          // Apply hooks if provided
          if (hooks?.afterConvert) {
            return hooks.afterConvert(renamedResult, opts);
          }
          
          return renamedResult;
        }
        
        // Apply hooks if provided
        if (hooks?.afterConvert) {
          return hooks.afterConvert(fastPathResult, opts);
        }
        
        return fastPathResult;
      } catch (error: unknown) {
        // Fall back to standard parsing if fast-path fails
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('Fast-path parsing failed, falling back to standard parser:', errorMessage);
      }
    }
    
    // Standard CSV parsing implementation
    const lines = processedCsv.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return [];
    }
    
    // Apply row limit if specified
    let rowsToProcess = lines;
    if (maxRows && lines.length > maxRows) {
      rowsToProcess = lines.slice(0, maxRows);
    }
    
    // Parse headers
    let headers: string[] = [];
    let dataRows = rowsToProcess;
    
    if (hasHeaders) {
      const headerLine = rowsToProcess[0];
      headers = parseCsvLine(headerLine, finalDelimiter, trim);
      dataRows = rowsToProcess.slice(1);
    } else {
      // Generate default headers (col0, col1, ...)
      const firstRow = parseCsvLine(rowsToProcess[0], finalDelimiter, trim);
      headers = firstRow.map((_, index) => `col${index}`);
    }
    
    // Apply rename map to headers
    const finalHeaders = headers.map(header => renameMap[header] || header);
    
    // Parse data rows
    const result: AnyArray = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const line = dataRows[i];
      const values = parseCsvLine(line, finalDelimiter, trim);
      
      // Handle field count mismatch
      if (values.length !== finalHeaders.length) {
        throw ParsingError.fieldCountMismatch(
          finalHeaders.length,
          values.length,
          hasHeaders ? i + 2 : i + 1, // +2 because of header row
          line
        );
      }
      
      // Create object
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
      
      // Apply transform function if provided
      const finalRow = transform ? transform(row) : row;
      result.push(finalRow);
    }
    
    // Apply hooks if provided
    if (hooks?.afterConvert) {
      return hooks.afterConvert(result, opts);
    }
    
    return result;
  }, 'PARSING_ERROR', { function: 'csvToJson' });
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

/**
 * Asynchronous version of csvToJson with support for worker threads
 */
export async function csvToJsonAsync(
  csv: string,
  options: AsyncCsvToJsonOptions = {}
): Promise<AnyArray> {
  return safeExecuteAsync(async () => {
    // For now, use the synchronous version
    // In the future, this will use worker threads for large datasets
    const { useWorkers = false, workerCount, chunkSize, onProgress, ...syncOptions } = options;
    
    // Simple implementation - just call the synchronous version
    // TODO: Implement worker thread support for large datasets
    return csvToJson(csv, syncOptions);
  }, 'PARSING_ERROR', { function: 'csvToJsonAsync' });
}

/**
 * Creates an iterator for streaming CSV parsing
 */
export function* csvToJsonIterator(
  csv: string,
  options: CsvToJsonOptions = {}
): Generator<AnyObject, void, unknown> {
  // Validate input
  validateCsvInput(csv, options);
  
  const opts = options && typeof options === 'object' ? options : {};
  
  const {
    delimiter,
    autoDetect = true,
    candidates = [';', ',', '\t', '|'],
    hasHeaders = true,
    renameMap = {},
    trim = true,
    parseNumbers = false,
    parseBooleans = false,
    maxRows
  } = opts;
  
  // Handle empty CSV
  if (!csv.trim()) {
    return;
  }
  
  // Normalize CSV input
  const normalizedCsv = normalizeCsvInput(csv);
  
  // Determine delimiter
  let finalDelimiter = delimiter;
  if (!finalDelimiter && autoDetect) {
    finalDelimiter = autoDetectDelimiter(normalizedCsv, { candidates });
  }
  
  if (!finalDelimiter) {
    finalDelimiter = ';'; // Default fallback
  }
  
  // Split into lines
  const lines = normalizedCsv.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return;
  }
  
  // Parse headers
  let headers: string[] = [];
  let dataRows = lines;
  
  if (hasHeaders) {
    const headerLine = lines[0];
    headers = parseCsvLine(headerLine, finalDelimiter, trim);
    dataRows = lines.slice(1);
  } else {
    // Generate default headers
    const firstRow = parseCsvLine(lines[0], finalDelimiter, trim);
    headers = firstRow.map((_, index) => `col${index}`);
  }
  
  // Apply rename map to headers
  const finalHeaders = headers.map(header => renameMap[header] || header);
  
  // Yield rows one by one
  let rowCount = 0;
  
  for (let i = 0; i < dataRows.length; i++) {
    // Check maxRows limit
    if (maxRows && rowCount >= maxRows) {
      break;
    }
    
    const line = dataRows[i];
    const values = parseCsvLine(line, finalDelimiter, trim);
    
    // Handle field count mismatch
    if (values.length !== finalHeaders.length) {
      throw ParsingError.fieldCountMismatch(
        finalHeaders.length,
        values.length,
        hasHeaders ? i + 2 : i + 1,
        line
      );
    }
    
    // Create object
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
    
    yield row;
    rowCount++;
  }
}

/**
 * Validates CSV file path for security
 * @private
 */
function validateCsvFilePath(filePath: string): string {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new ValidationError('File path must be a non-empty string');
  }
  
  // Basic path validation
  const normalizedPath = filePath.trim();
  
  // Check for directory traversal attempts
  if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
    throw new SecurityError('Invalid file path: directory traversal detected');
  }
  
  // Check for dangerous extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.py'];
  const lowerPath = normalizedPath.toLowerCase();
  for (const ext of dangerousExtensions) {
    if (lowerPath.endsWith(ext)) {
      throw new SecurityError(`Invalid file extension: ${ext}`);
    }
  }
  
  return normalizedPath;
}

/**
 * Reads CSV file and converts to JSON (synchronous)
 */
export function readCsvAsJson(
  filePath: string,
  options: CsvToJsonOptions & { validatePath?: boolean } = {}
): AnyArray {
  return safeExecuteSync(() => {
    const { validatePath = true, ...csvOptions } = options;
    
    // Validate file path if requested
    if (validatePath) {
      validateCsvFilePath(filePath);
    }
    
    // TODO: Implement file reading logic
    throw new Error('Not implemented yet');
  }, 'FILE_SYSTEM_ERROR', { function: 'readCsvAsJson' });
}

/**
 * Reads CSV file and converts to JSON (synchronous)
 * 
 * @param filePath - Path to CSV file
 * @param options - Configuration options (same as csvToJson)
 * @returns JSON array
 */
export function readCsvAsJsonSync(
  filePath: string,
  options: CsvToJsonOptions & { validatePath?: boolean } = {}
): AnyArray {
  const fs = require('fs');
  
  // Validate file path
  const safePath = validateCsvFilePath(filePath);
  
  try {
    // Read file
    const csvContent = fs.readFileSync(safePath, 'utf8');
    
    // Parse CSV with hooks and caching
    return csvToJson(csvContent, options);
  } catch (error: any) {
    // Re-throw parsing errors as-is
    if (error instanceof ParsingError || error instanceof ValidationError || error instanceof LimitError) {
      throw error;
    }
    
    // Wrap file system errors
    if (error.code === 'ENOENT') {
      throw new FileSystemError(`File not found: ${safePath}`, error);
    }
    if (error.code === 'EACCES') {
      throw new FileSystemError(`Permission denied: ${safePath}`, error);
    }
    if (error.code === 'EISDIR') {
      throw new FileSystemError(`Path is a directory: ${safePath}`, error);
    }
    
    throw new FileSystemError(`Failed to read CSV file: ${error.message}`, error);
  }
}

/**
 * Creates a new TransformHooks instance
 * @returns New TransformHooks instance
 */
export function createTransformHooks(): TransformHooks {
  return new TransformHooks();
}

/**
 * Creates a new DelimiterCache instance
 * @param maxSize - Maximum cache size (default: 100)
 * @returns New DelimiterCache instance
 */
export function createDelimiterCache(maxSize: number = 100): DelimiterCache {
  return new DelimiterCache(maxSize);
}

/**
 * Gets statistics from the global delimiter cache
 * @returns Cache statistics
 */
export function getDelimiterCacheStats(): any {
  return globalDelimiterCache.getStats();
}

/**
 * Clears the global delimiter cache
 */
export function clearDelimiterCache(): void {
  globalDelimiterCache.clear();
}
