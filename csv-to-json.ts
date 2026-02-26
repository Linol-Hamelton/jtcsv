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

  if (options?.memoryWarningThreshold !== undefined) {
    if (typeof options.memoryWarningThreshold !== 'number' || options.memoryWarningThreshold <= 0) {
      throw new ConfigurationError('memoryWarningThreshold must be a positive number');
    }
  }

  if (options?.memoryLimit !== undefined) {
    if (typeof options.memoryLimit !== 'number') {
      throw new ConfigurationError('memoryLimit must be a number');
    }
    if (options.memoryLimit !== Infinity && options.memoryLimit <= 0) {
      throw new ConfigurationError('memoryLimit must be a positive number or Infinity');
    }
  }

  if (options?.onError !== undefined
    && !['skip', 'warn', 'throw'].includes(options.onError)) {
    throw new ConfigurationError('onError must be "skip", "warn", or "throw"');
  }

  if (options?.errorHandler !== undefined && typeof options.errorHandler !== 'function') {
    throw new ConfigurationError('errorHandler must be a function');
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
    
    if (options.hooks.perRow && typeof options.hooks.perRow !== 'function') {
      throw new ConfigurationError('hooks.perRow must be a function');
    }

    if (options.hooks.transformHooks
      && !(options.hooks.transformHooks instanceof TransformHooks)) {
      throw new ConfigurationError('hooks.transformHooks must be an instance of TransformHooks');
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
  } | string[] = {}
): string {
  if (!csv || typeof csv !== 'string' || csv.trim().length === 0) {
    return ';';
  }

  const resolvedOptions = Array.isArray(options)
    ? { candidates: options }
    : (options || {});

  const {
    candidates = [';', ',', '\t', '|'],
    useCache = true,
    cache = globalDelimiterCache
  } = resolvedOptions;

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
    
    // Bonus for consistent column count (only when delimiter appears)
    if (score > 0) {
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
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  const resolvedDelimiter = bestScore > 0 ? bestDelimiter : ';';

  if (useCache && cache) {
    cache.set(csv, candidates, resolvedDelimiter);
  }

  return resolvedDelimiter;
}

function getFirstNonEmptyLine(csv: string): string | null {
  if (!csv || typeof csv !== 'string') {
    return null;
  }
  const lines = csv.split('\n');
  for (const line of lines) {
    if (line.trim().length > 0) {
      return line;
    }
  }
  return null;
}

function refineDelimiterFromHeaderLine(
  csv: string,
  currentDelimiter: string | undefined,
  candidates: string[]
): string | undefined {
  if (!currentDelimiter) {
    return currentDelimiter;
  }
  const headerLine = getFirstNonEmptyLine(csv);
  if (!headerLine) {
    return currentDelimiter;
  }
  const currentCount = headerLine.split(currentDelimiter).length - 1;
  if (currentCount > 0) {
    return currentDelimiter;
  }
  let bestDelimiter = currentDelimiter;
  let bestCount = 0;
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.length !== 1) {
      continue;
    }
    const count = headerLine.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = candidate;
    }
  }
  return bestCount > 0 ? bestDelimiter : currentDelimiter;
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
      hooks,
    useCache = true,
    cache,
    onError = 'throw',
    errorHandler,
    repairRowShifts = true,
    normalizeQuotes = true,
    memoryWarningThreshold = 1000000,
    memoryLimit = 5000000
  } = opts;

    const delimiterProvided = delimiter !== undefined && delimiter !== null;
    const transformHooks = hooks?.transformHooks instanceof TransformHooks
      ? hooks.transformHooks
      : null;
    const hooksContext = { options: opts };

    let resolvedUseFastPath = useFastPath;
    if (onError !== 'throw' && resolvedUseFastPath) {
      resolvedUseFastPath = false;
    }

    if (fastPathMode === 'stream') {
      return csvToJsonIterator(csv, opts) as unknown as AnyArray;
    }
    
    // Handle empty CSV
    if (!csv.trim()) {
      return [];
    }
    
    // Normalize CSV input (remove BOM, normalize line endings)
    const normalizedCsv = normalizeCsvInput(csv);
    
    const cacheToUse = cache instanceof DelimiterCache ? cache : globalDelimiterCache;
    // Determine delimiter
    let finalDelimiter = delimiter;
    if (!finalDelimiter && autoDetect) {
      finalDelimiter = autoDetectDelimiter(normalizedCsv, { candidates, useCache, cache: cacheToUse });
    }
    
    if (!finalDelimiter) {
      finalDelimiter = ';'; // Default fallback
    }
    
    // Apply hooks if provided
    let processedCsv = normalizedCsv;
    if (transformHooks) {
      processedCsv = transformHooks.applyBeforeConvert(processedCsv, hooksContext);
    }
    if (hooks?.beforeConvert) {
      processedCsv = hooks.beforeConvert(processedCsv, opts);
    }
    if (!delimiterProvided && autoDetect) {
      const refined = refineDelimiterFromHeaderLine(processedCsv, finalDelimiter, candidates) || finalDelimiter;
      if (refined !== finalDelimiter && useCache && cacheToUse) {
        cacheToUse.set(processedCsv, candidates, refined);
      }
      finalDelimiter = refined;
    }

    const applyPerRowHooks = (row: AnyObject, index: number): AnyObject => {
      let result: AnyObject = row;
      if (transformHooks) {
        result = transformHooks.applyPerRow(result, index, hooksContext) as AnyObject;
      }
      if (hooks?.perRow) {
        result = hooks.perRow(result, index, hooksContext) as AnyObject;
      }
      if (transform) {
        result = transform(result);
      }
      return result;
    };

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
      if (parseNumbers && typeof normalized === 'string') {
        const firstChar = normalized[0];
        if ((firstChar >= '0' && firstChar <= '9') || firstChar === '-' || firstChar === '+' || firstChar === '.') {
          const numValue = Number(normalized);
          if (!Number.isNaN(numValue)) {
            normalized = numValue;
          }
        }
      }
      if (parseBooleans && typeof normalized === 'string') {
        const firstChar = normalized[0];
        if (firstChar === 't' || firstChar === 'T' || firstChar === 'f' || firstChar === 'F') {
          const lowerValue = normalized.toLowerCase();
          if (lowerValue === 'true' || lowerValue === 'false') {
            normalized = lowerValue === 'true';
          }
        }
      }
      return normalized;
    };

    const applyAfterConvertHooks = (rows: AnyArray): AnyArray => {
      let result: AnyArray = rows;
      if (hooks?.afterConvert) {
        result = hooks.afterConvert(result, opts);
      }
      if (transformHooks) {
        result = transformHooks.applyAfterConvert(result, hooksContext) as AnyArray;
      }
      return result;
    };
    
    // Use fast-path engine if enabled
    if (resolvedUseFastPath && globalFastPathEngine) {
      try {
        let fastPathRows: AnyArray | null = null;
        const fastPathOptions = {
          delimiter: finalDelimiter,
          hasHeaders,
          trim,
          parseNumbers,
          parseBooleans,
          maxRows,
          mode: fastPathMode
        };

        if (typeof (globalFastPathEngine as any).parse === 'function') {
          fastPathRows = (globalFastPathEngine as any).parse(processedCsv, fastPathOptions);
        } else if (typeof (globalFastPathEngine as any).parseRows === 'function') {
          const collected: AnyArray = [];
          (globalFastPathEngine as any).parseRows(processedCsv, fastPathOptions, (row: AnyArray) => {
            if (!Array.isArray(row) || row.length === 0) {
              return;
            }
            collected.push(row);
          });
          fastPathRows = collected;
        }

        if (!Array.isArray(fastPathRows)) {
          throw new Error('Fast-path parser returned invalid result');
        }

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
          if (parseNumbers && typeof normalized === 'string') {
            const firstChar = normalized[0];
            if ((firstChar >= '0' && firstChar <= '9') || firstChar === '-' || firstChar === '+' || firstChar === '.') {
              const numValue = Number(normalized);
              if (!Number.isNaN(numValue)) {
                normalized = numValue;
              }
            }
          }
          if (parseBooleans && typeof normalized === 'string') {
            const firstChar = normalized[0];
            if (firstChar === 't' || firstChar === 'T' || firstChar === 'f' || firstChar === 'F') {
              const lowerValue = normalized.toLowerCase();
              if (lowerValue === 'true' || lowerValue === 'false') {
                normalized = lowerValue === 'true';
              }
            }
          }
          return normalized;
        };

        const handleFastPathError = (error: Error, rowIndex: number, row: AnyArray) => {
          if (errorHandler) {
            errorHandler(error, row.join(finalDelimiter), hasHeaders ? rowIndex + 2 : rowIndex + 1);
          }
          if (onError === 'warn') {
            if (process.env['NODE_ENV'] !== 'test') {
              console.warn(`[jtcsv] Row ${hasHeaders ? rowIndex + 2 : rowIndex + 1}: ${error.message}`);
            }
            return true;
          }
          if (onError === 'skip') {
            return true;
          }
          throw error;
        };

        if (fastPathMode === 'compact') {
          const dataRows = hasHeaders ? fastPathRows.slice(1) : fastPathRows;
          if (maxRows && dataRows.length > maxRows) {
            throw new LimitError(
              `CSV size exceeds maximum limit of ${maxRows} rows`,
              maxRows,
              dataRows.length
            );
          }
          const limitedRows = dataRows;
          const normalizedRows: AnyArray = [];
          for (const row of limitedRows) {
            if (!Array.isArray(row) || row.length === 0) {
              continue;
            }
            normalizedRows.push(row.map((value) => normalizeValue(value)));
          }
          if (Number.isFinite(memoryLimit) && normalizedRows.length > memoryLimit) {
            throw new LimitError(
              `CSV size exceeds memory safety limit of ${memoryLimit} rows`,
              memoryLimit,
              normalizedRows.length
            );
          }
          if (memoryWarningThreshold
            && normalizedRows.length > memoryWarningThreshold
            && process.env['NODE_ENV'] !== 'test') {
            console.warn(
              'Warning: Large in-memory CSV parse detected.\n' +
              'Consider using createCsvToJsonStream() for big files.\n' +
              'Current size: ' + normalizedRows.length.toLocaleString() + ' rows\n' +
              'Tip: Increase memoryLimit or set memoryLimit: Infinity to override.'
            );
          }
          return applyAfterConvertHooks(normalizedRows);
        }

        if (fastPathRows.length === 0) {
          return applyAfterConvertHooks([]);
        }

        if (!Array.isArray(fastPathRows[0])) {
          const limitedRows = maxRows ? fastPathRows.slice(0, maxRows) : fastPathRows;
          const normalizedRows = limitedRows.map((row, index) => {
            let obj = row as AnyObject;
            if (Object.keys(renameMap).length > 0) {
              const renamed: AnyObject = {};
              for (const [key, value] of Object.entries(obj)) {
                const newKey = renameMap[key] || key;
                renamed[newKey] = value;
              }
              obj = renamed;
            }
            return applyPerRowHooks(obj, index);
          });

          if (Number.isFinite(memoryLimit) && normalizedRows.length > memoryLimit) {
            throw new LimitError(
              `CSV size exceeds memory safety limit of ${memoryLimit} rows`,
              memoryLimit,
              normalizedRows.length
            );
          }
          if (memoryWarningThreshold
            && normalizedRows.length > memoryWarningThreshold
            && process.env['NODE_ENV'] !== 'test') {
            console.warn(
              'Warning: Large in-memory CSV parse detected.\n' +
              'Consider using createCsvToJsonStream() for big files.\n' +
              'Current size: ' + normalizedRows.length.toLocaleString() + ' rows\n' +
              'Tip: Increase memoryLimit or set memoryLimit: Infinity to override.'
            );
          }

          return applyAfterConvertHooks(normalizedRows);
        }

        const headerRow = hasHeaders ? (fastPathRows[0] as AnyArray) : null;
        if (hasHeaders && Array.isArray(headerRow) && headerRow.length === 1) {
          const headerText = String(headerRow[0]);
          const hasCandidateDelimiter = (candidates || [';', ',', '\t', '|'])
            .some((candidate) => headerText.includes(candidate));
          if (hasCandidateDelimiter) {
            throw new ParsingError('Fast-path parser failed to split headers');
          }
        }

        const baseHeaders = hasHeaders
          ? (headerRow as AnyArray).map((header) => (trim ? String(header).trim() : String(header)))
          : (fastPathRows[0] as AnyArray).map((_, index) => `column${index + 1}`);
        const finalHeaders = baseHeaders.map((header) => renameMap[header] || header);
        const dataRows = hasHeaders ? fastPathRows.slice(1) : fastPathRows;
        if (maxRows && dataRows.length > maxRows) {
          throw new LimitError(
            `CSV size exceeds maximum limit of ${maxRows} rows`,
            maxRows,
            dataRows.length
          );
        }
        const limitedRows = dataRows;

        const rawRows: AnyArray = [];
        for (let rowIndex = 0; rowIndex < limitedRows.length; rowIndex++) {
          const row = limitedRows[rowIndex];
          if (!Array.isArray(row) || row.length === 0) {
            continue;
          }
          let rowValues = row;
          if (rowValues.length !== baseHeaders.length) {
            if (rowValues.length > baseHeaders.length) {
              if (process.env['NODE_ENV'] === 'development') {
                const lineNumber = hasHeaders ? rowIndex + 2 : rowIndex + 1;
                const extraCount = rowValues.length - baseHeaders.length;
                console.warn(`[jtcsv] Line ${lineNumber}: ${extraCount} extra fields ignored`);
              }
              rowValues = rowValues.slice(0, baseHeaders.length);
            } else {
              while (rowValues.length < baseHeaders.length) {
                rowValues.push(undefined as any);
              }
            }
          }

          const obj: AnyObject = {};
          for (let j = 0; j < finalHeaders.length; j++) {
            let value: any = rowValues[j];
            value = normalizeValue(value);
            obj[finalHeaders[j]] = value;
          }
          rawRows.push(obj);
        }

        const repairedRows = repairRowShifts
          ? repairShiftedRows(rawRows, finalHeaders, { normalizeQuotes })
          : rawRows;
        const normalizedRows = repairedRows.map((row, index) => applyPerRowHooks(row, index));

        if (Number.isFinite(memoryLimit) && normalizedRows.length > memoryLimit) {
          throw new LimitError(
            `CSV size exceeds memory safety limit of ${memoryLimit} rows`,
            memoryLimit,
            normalizedRows.length
          );
        }
        if (memoryWarningThreshold
          && normalizedRows.length > memoryWarningThreshold
          && process.env['NODE_ENV'] !== 'test') {
          console.warn(
            'Warning: Large in-memory CSV parse detected.\n' +
            'Consider using createCsvToJsonStream() for big files.\n' +
            'Current size: ' + normalizedRows.length.toLocaleString() + ' rows\n' +
            'Tip: Increase memoryLimit or set memoryLimit: Infinity to override.'
          );
        }
        
        return applyAfterConvertHooks(normalizedRows);
      } catch (error: unknown) {
        if (error instanceof LimitError) {
          throw error;
        }
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
    if (maxRows && lines.length > maxRows) {
      throw new LimitError(
        `CSV size exceeds maximum limit of ${maxRows} rows`,
        maxRows,
        lines.length
      );
    }
    
    // Parse headers
    let headers: string[] = [];
    let dataRows = lines;
    
    if (hasHeaders) {
      const headerLine = lines[0];
      headers = parseCsvLine(headerLine, finalDelimiter, trim, 1);
      dataRows = lines.slice(1);
    } else {
      // Generate default headers (col0, col1, ...)
      const firstRow = parseCsvLine(lines[0], finalDelimiter, trim, 1);
      headers = firstRow.map((_, index) => `column${index + 1}`);
    }

    if (Number.isFinite(memoryLimit) && dataRows.length > memoryLimit) {
      throw new LimitError(
        `CSV size exceeds memory safety limit of ${memoryLimit} rows`,
        memoryLimit,
        dataRows.length
      );
    }

    if (memoryWarningThreshold
      && dataRows.length > memoryWarningThreshold
      && process.env['NODE_ENV'] !== 'test') {
      console.warn(
        'Warning: Large in-memory CSV parse detected.\n' +
        'Consider using createCsvToJsonStream() for big files.\n' +
        'Current size: ' + dataRows.length.toLocaleString() + ' rows\n' +
        'Tip: Increase memoryLimit or set memoryLimit: Infinity to override.'
      );
    }
    
    // Apply rename map to headers
    const finalHeaders = headers.map(header => renameMap[header] || header);

    if (fastPathMode === 'compact') {
      const compactResult: AnyArray = [];
      for (let i = 0; i < dataRows.length; i++) {
        if (maxRows && compactResult.length >= maxRows) {
          break;
        }
        const line = dataRows[i];
        const lineNumber = hasHeaders ? i + 2 : i + 1;
        let values = parseCsvLine(line, finalDelimiter, trim, lineNumber);
        if (values.length !== finalHeaders.length) {
          if (values.length > finalHeaders.length) {
            if (process.env['NODE_ENV'] === 'development') {
              const extraCount = values.length - finalHeaders.length;
              console.warn(`[jtcsv] Line ${lineNumber}: ${extraCount} extra fields ignored`);
            }
            values = values.slice(0, finalHeaders.length);
          } else {
            while (values.length < finalHeaders.length) {
              values.push(undefined as any);
            }
          }
        }
        compactResult.push(values.map((value) => normalizeValue(value)));
      }
      return applyAfterConvertHooks(compactResult);
    }
    
    // Parse data rows
    const rawRows: AnyArray = [];
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
    
    for (let i = 0; i < dataRows.length; i++) {
      const line = dataRows[i];
      const lineNumber = hasHeaders ? i + 2 : i + 1;
      try {
        let values = parseCsvLine(line, finalDelimiter, trim, lineNumber);
        
        // Handle field count mismatch
        if (values.length !== finalHeaders.length) {
          if (values.length > finalHeaders.length) {
            if (process.env['NODE_ENV'] === 'development') {
              const extraCount = values.length - finalHeaders.length;
              console.warn(`[jtcsv] Line ${lineNumber}: ${extraCount} extra fields ignored`);
            }
            values = values.slice(0, finalHeaders.length);
          } else {
            while (values.length < finalHeaders.length) {
              values.push(undefined as any);
            }
          }
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
        rawRows.push(row);
      } catch (error: any) {
        if (handleRowError(error as Error, line, lineNumber)) {
          continue;
        }
      }
    }
    
    // Apply hooks if provided
    const repairedRows = repairRowShifts
      ? repairShiftedRows(rawRows, finalHeaders, { normalizeQuotes })
      : rawRows;
    const normalizedRows = repairedRows.map((row, index) => applyPerRowHooks(row, index));
    return applyAfterConvertHooks(normalizedRows);
  }, 'PARSING_ERROR', { function: 'csvToJson' });
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

function isEmptyValue(value: any): boolean {
  return value === undefined || value === null || value === '';
}

function hasOddQuotes(value: any): boolean {
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
}

function hasAnyQuotes(value: any): boolean {
  return typeof value === 'string' && value.includes('"');
}

function normalizeQuotesInField(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
  // Не нормализуем кавычки в JSON-строках - это ломит структуру JSON
  if ((value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))) {
    return value; // Возвращаем как есть для JSON
  }
  
  let normalized = value.replace(/"{2,}/g, '"');
  // Не применяем правило, которое ломает JSON:
  // normalized = normalized.replace(/"\s*,\s*"/g, ',');
  normalized = normalized.replace(/"\n/g, '\n').replace(/\n"/g, '\n');
  if (normalized.length >= 2 && normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

function normalizeRowQuotes(row: AnyObject, headers: string[]): AnyObject {
  const normalized: AnyObject = {};
  const phoneKeys = new Set(['phone', 'phonenumber', 'phone_number', 'tel', 'telephone']);
  for (const header of headers) {
    const baseValue = normalizeQuotesInField(row[header]);
    if (phoneKeys.has(String(header).toLowerCase())) {
      normalized[header] = normalizePhoneValue(baseValue);
    } else {
      normalized[header] = baseValue;
    }
  }
  return normalized;
}

function normalizePhoneValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return trimmed;
  }
  return trimmed.replace(/["'\\]/g, '');
}

function looksLikeUserAgent(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return /Mozilla\/|Opera\/|MSIE|AppleWebKit|Gecko|Safari|Chrome\//.test(value);
}

function isHexColor(value: any): boolean {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function repairShiftedRows(
  rows: AnyArray,
  headers: string[],
  options: { normalizeQuotes?: boolean } = {}
): AnyArray {
  if (!Array.isArray(rows) || rows.length === 0 || headers.length === 0) {
    return rows;
  }

  const headerCount = headers.length;
  const merged: AnyArray = [];
  let index = 0;

  while (index < rows.length) {
    const row = rows[index] as AnyObject;
    if (!row || typeof row !== 'object') {
      merged.push(row);
      index++;
      continue;
    }

    const values = headers.map((header) => row[header]);
    let lastNonEmpty = -1;
    for (let i = headerCount - 1; i >= 0; i--) {
      if (!isEmptyValue(values[i])) {
        lastNonEmpty = i;
        break;
      }
    }

    const missingCount = headerCount - 1 - lastNonEmpty;
    if (lastNonEmpty >= 0 && missingCount > 0 && index + 1 < rows.length) {
      const nextRow = rows[index + 1] as AnyObject;
      if (nextRow && typeof nextRow === 'object') {
        const nextValues = headers.map((header) => nextRow[header]);
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

          const mergedRow: AnyObject = {};
          for (let i = 0; i < headerCount; i++) {
            mergedRow[headers[i]] = values[i];
          }

          merged.push(mergedRow);
          index += 2;
          continue;
        }
      }
    }

    if (index + 1 < rows.length) {
      const nextRow = rows[index + 1] as AnyObject;
      if (nextRow && typeof nextRow === 'object') {
        const nextHex = nextRow[headers[4]];
        const nextUserAgentHead = nextRow[headers[2]];
        const nextUserAgentTail = nextRow[headers[3]];
        const shouldMergeUserAgent = isEmptyValue(values[4])
          && isEmptyValue(values[5])
          && isHexColor(nextHex)
          && (looksLikeUserAgent(nextUserAgentHead) || looksLikeUserAgent(nextUserAgentTail));

        if (shouldMergeUserAgent) {
          const addressParts = [values[3], nextRow[headers[0]], nextRow[headers[1]]]
            .filter((value) => !isEmptyValue(value))
            .map((value) => String(value));
          values[3] = addressParts.join('\n');

          // Очищаем кавычки из частей userAgent перед объединением
          let uaHead = isEmptyValue(nextUserAgentHead) ? '' : String(nextUserAgentHead);
          let uaTail = isEmptyValue(nextUserAgentTail) ? '' : String(nextUserAgentTail);
          // Удаляем лишние кавычки из начала и конца каждой части
          uaHead = uaHead.replace(/^"+|"+$/g, '');
          uaTail = uaTail.replace(/^"+|"+$/g, '');
          const joiner = uaHead && uaTail ? (uaTail.startsWith(' ') ? '' : ',') : '';
          values[4] = uaHead + joiner + uaTail;
          values[5] = String(nextHex);

          const mergedRow: AnyObject = {};
          for (let i = 0; i < headerCount; i++) {
            mergedRow[headers[i]] = values[i];
          }

          merged.push(mergedRow);
          index += 2;
          continue;
        }
      }
    }

    merged.push(row);
    index++;
  }

  if (options.normalizeQuotes) {
    return merged.map((row) => normalizeRowQuotes(row, headers));
  }

  return merged;
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
    maxRows,
    useFastPath = true,
    fastPathMode = 'objects',
    transform,
    hooks,
    useCache = true,
    cache,
    onError = 'throw',
    errorHandler,
    repairRowShifts = true,
    normalizeQuotes = true,
    memoryWarningThreshold = 1000000,
    memoryLimit = 5000000
  } = opts;

  const delimiterProvided = delimiter !== undefined && delimiter !== null;
  const transformHooks = hooks?.transformHooks instanceof TransformHooks
    ? hooks.transformHooks
    : null;
  const hooksContext = { options: opts };
  
  // Handle empty CSV
  if (!csv.trim()) {
    return;
  }
  
  // Normalize CSV input
  const normalizedCsv = normalizeCsvInput(csv);
  let processedCsv = normalizedCsv;
  if (transformHooks) {
    processedCsv = transformHooks.applyBeforeConvert(processedCsv, hooksContext);
  }
  if (hooks?.beforeConvert) {
    processedCsv = hooks.beforeConvert(processedCsv, opts);
  }
  
  // Determine delimiter
  let finalDelimiter = delimiter;
  if (!finalDelimiter && autoDetect) {
    const cacheToUse = cache instanceof DelimiterCache ? cache : globalDelimiterCache;
    finalDelimiter = autoDetectDelimiter(processedCsv, { candidates, useCache, cache: cacheToUse });
  }
  
  if (!finalDelimiter) {
    finalDelimiter = ';'; // Default fallback
  }
  if (!delimiterProvided && autoDetect) {
    const cacheToUse = cache instanceof DelimiterCache ? cache : globalDelimiterCache;
    const refined = refineDelimiterFromHeaderLine(processedCsv, finalDelimiter, candidates) || finalDelimiter;
    if (refined !== finalDelimiter && useCache && cacheToUse) {
      cacheToUse.set(processedCsv, candidates, refined);
    }
    finalDelimiter = refined;
  }

  const applyPerRowHooks = (row: AnyObject, index: number): AnyObject => {
    let result: AnyObject = row;
    if (transformHooks) {
      result = transformHooks.applyPerRow(result, index, hooksContext) as AnyObject;
    }
    if (hooks?.perRow) {
      result = hooks.perRow(result, index, hooksContext) as AnyObject;
    }
    if (transform) {
      result = transform(result);
    }
    return result;
  };

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
    if (parseNumbers && typeof normalized === 'string') {
      const firstChar = normalized[0];
      if ((firstChar >= '0' && firstChar <= '9') || firstChar === '-' || firstChar === '+' || firstChar === '.') {
        const numValue = Number(normalized);
        if (!Number.isNaN(numValue)) {
          normalized = numValue;
        }
      }
    }
    if (parseBooleans && typeof normalized === 'string') {
      const firstChar = normalized[0];
      if (firstChar === 't' || firstChar === 'T' || firstChar === 'f' || firstChar === 'F') {
        const lowerValue = normalized.toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'false') {
          normalized = lowerValue === 'true';
        }
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

  let rowCount = 0; // Объявляем rowCount выше, чтобы assertRowLimit мог его использовать
  
  const assertRowLimit = () => {
    if (maxRows && rowCount >= maxRows) {
      throw new LimitError(
        `CSV size exceeds maximum limit of ${maxRows} rows`,
        maxRows,
        rowCount + 1
      );
    }
  };

  const shouldWarnLargeMemory = memoryWarningThreshold && process.env['NODE_ENV'] !== 'test';
  let warnedLargeMemory = false;

  if (globalFastPathEngine && typeof (globalFastPathEngine as any).iterateRows === 'function') {
    const iterateOptions: any = { delimiter: finalDelimiter };
    if (!useFastPath) {
      iterateOptions.forceEngine = 'STANDARD';
    }

    const rowIterator = (globalFastPathEngine as any).iterateRows(processedCsv, iterateOptions);
    let headers: string[] = [];
    let finalHeaders: string[] = [];
    let headersProcessed = false;
    let pendingRow: AnyObject | null = null;

    try {
      for (const row of rowIterator) {
        if (!Array.isArray(row) || row.length === 0) {
          continue;
        }

        if (!headersProcessed) {
          if (hasHeaders) {
            headers = row.map((header) => (trim ? String(header).trim() : String(header)));
            headersProcessed = true;
            finalHeaders = headers.map((header) => renameMap[header] || header);
            continue;
          } else {
            headers = row.map((_, index) => `column${index + 1}`);
            headersProcessed = true;
            finalHeaders = headers.map((header) => renameMap[header] || header);
          }
        }

        if (maxRows && rowCount >= maxRows) {
          throw new LimitError(
            `CSV size exceeds maximum limit of ${maxRows} rows`,
            maxRows,
            rowCount + 1
          );
        }

        if (Number.isFinite(memoryLimit) && rowCount + 1 > memoryLimit) {
          throw new LimitError(
            `CSV size exceeds memory safety limit of ${memoryLimit} rows`,
            memoryLimit,
            rowCount + 1
          );
        }

        if (!warnedLargeMemory && shouldWarnLargeMemory && rowCount + 1 > memoryWarningThreshold) {
          warnedLargeMemory = true;
          console.warn(
            'Warning: Large in-memory CSV parse detected.\n' +
            'Consider using createCsvToJsonStream() for big files.\n' +
            'Current size: ' + (rowCount + 1).toLocaleString() + ' rows\n' +
            'Tip: Increase memoryLimit or set memoryLimit: Infinity to override.'
          );
        }

        let values = row;
        if (values.length !== headers.length) {
          if (values.length > headers.length) {
            if (process.env['NODE_ENV'] === 'development') {
              const lineNumber = hasHeaders ? rowCount + 2 : rowCount + 1;
              const extraCount = values.length - finalHeaders.length;
              console.warn(`[jtcsv] Line ${lineNumber}: ${extraCount} extra fields ignored`);
            }
            values = values.slice(0, headers.length);
          } else {
            while (values.length < headers.length) {
              values.push(undefined as any);
            }
          }
        }

        if (fastPathMode === 'compact') {
          yield values.map((value) => normalizeValue(value));
          rowCount++;
          continue;
        }

        const rowObj: AnyObject = {};
        for (let j = 0; j < finalHeaders.length; j++) {
          rowObj[finalHeaders[j]] = normalizeValue(values[j]);
        }

        if (repairRowShifts) {
          if (!pendingRow) {
            pendingRow = rowObj;
            continue;
          }

          const repairedRows = repairShiftedRows([pendingRow, rowObj], finalHeaders, { normalizeQuotes });
          if (repairedRows.length === 1) {
            assertRowLimit();
            yield applyPerRowHooks(repairedRows[0], rowCount);
            rowCount++;
            pendingRow = null;
            continue;
          }

          assertRowLimit();
          yield applyPerRowHooks(repairedRows[0], rowCount);
          rowCount++;
          pendingRow = repairedRows[1] as AnyObject;
        } else {
          const normalizedRow = normalizeQuotes ? normalizeRowQuotes(rowObj, finalHeaders) : rowObj;
          assertRowLimit();
          yield applyPerRowHooks(normalizedRow, rowCount);
          rowCount++;
        }
      }
    } catch (error: any) {
      if (error && error.code === 'FAST_PATH_UNCLOSED_QUOTES') {
        throw ParsingError.unclosedQuotes(error.lineNumber ?? null);
      }
      throw error;
    }

    if (pendingRow) {
      const flushedRows = repairShiftedRows([pendingRow], finalHeaders, { normalizeQuotes });
      for (const row of flushedRows) {
        assertRowLimit();
        yield applyPerRowHooks(row as AnyObject, rowCount);
        rowCount++;
      }
      pendingRow = null;
    }

    return;
  }

  // Split into lines
  const lines = processedCsv.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return;
  }
  
  // Parse headers
  let headers: string[] = [];
  let dataRows = lines;
  
  if (hasHeaders) {
    const headerLine = lines[0];
    headers = parseCsvLine(headerLine, finalDelimiter, trim, 1);
    dataRows = lines.slice(1);
  } else {
    // Generate default headers
    const firstRow = parseCsvLine(lines[0], finalDelimiter, trim, 1);
    headers = firstRow.map((_, index) => `column${index + 1}`);
  }
  
  // Apply rename map to headers
  const finalHeaders = headers.map(header => renameMap[header] || header);
  
  // Yield rows one by one
  // rowCount уже объявлен выше
  let pendingRow: AnyObject | null = null;

  for (let i = 0; i < dataRows.length; i++) {
    // Check maxRows limit
    if (maxRows && rowCount >= maxRows) {
      throw new LimitError(
        `CSV size exceeds maximum limit of ${maxRows} rows`,
        maxRows,
        rowCount + 1
      );
    }

    const line = dataRows[i];
    const lineNumber = hasHeaders ? i + 2 : i + 1;
    if (Number.isFinite(memoryLimit) && rowCount + 1 > memoryLimit) {
      throw new LimitError(
        `CSV size exceeds memory safety limit of ${memoryLimit} rows`,
        memoryLimit,
        rowCount + 1
      );
    }
    if (!warnedLargeMemory && shouldWarnLargeMemory && rowCount + 1 > memoryWarningThreshold) {
      warnedLargeMemory = true;
      console.warn(
        'Warning: Large in-memory CSV parse detected.\n' +
        'Consider using createCsvToJsonStream() for big files.\n' +
        'Current size: ' + (rowCount + 1).toLocaleString() + ' rows\n' +
        'Tip: Increase memoryLimit or set memoryLimit: Infinity to override.'
      );
    }
    try {
      let values = parseCsvLine(line, finalDelimiter, trim, lineNumber);
      
      // Handle field count mismatch
        if (values.length !== finalHeaders.length) {
          if (values.length > finalHeaders.length) {
            if (process.env['NODE_ENV'] === 'development') {
              const extraCount = values.length - finalHeaders.length;
              console.warn(`[jtcsv] Line ${lineNumber}: ${extraCount} extra fields ignored`);
            }
            values = values.slice(0, finalHeaders.length);
          } else {
            while (values.length < finalHeaders.length) {
              values.push(undefined as any);
            }
          }
        }
      
      if (fastPathMode === 'compact') {
        yield values.map((value) => normalizeValue(value));
        rowCount++;
        continue;
      }

      // Create object
      const row: AnyObject = {};
      for (let j = 0; j < finalHeaders.length; j++) {
        const value = normalizeValue(values[j]);
        row[finalHeaders[j]] = value;
      }

      if (repairRowShifts) {
        if (!pendingRow) {
          pendingRow = row;
          continue;
        }

        const repairedRows = repairShiftedRows([pendingRow, row], finalHeaders, { normalizeQuotes });
        if (repairedRows.length === 1) {
          assertRowLimit();
          yield applyPerRowHooks(repairedRows[0], rowCount);
          rowCount++;
          pendingRow = null;
          continue;
        }

        assertRowLimit();
        yield applyPerRowHooks(repairedRows[0], rowCount);
        rowCount++;
        pendingRow = repairedRows[1] as AnyObject;
      } else {
        const normalizedRow = normalizeQuotes ? normalizeRowQuotes(row, finalHeaders) : row;
        assertRowLimit();
        yield applyPerRowHooks(normalizedRow, rowCount);
        rowCount++;
      }
    } catch (error: any) {
      if (handleRowError(error as Error, line, lineNumber)) {
        continue;
      }
    }
  }

  if (pendingRow) {
    const flushedRows = repairShiftedRows([pendingRow], finalHeaders, { normalizeQuotes });
    for (const row of flushedRows) {
      assertRowLimit();
      yield applyPerRowHooks(row as AnyObject, rowCount);
      rowCount++;
    }
    pendingRow = null;
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

  if (!filePath.toLowerCase().endsWith('.csv')) {
    throw new ValidationError('File must have .csv extension');
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
export async function readCsvAsJson(
  filePath: string,
  options: CsvToJsonOptions & { validatePath?: boolean } = {}
): Promise<AnyArray> {
  return safeExecuteAsync(async () => {
    const { validatePath = true, ...csvOptions } = options;
    const fs = require('fs');
    
    // Validate file path if requested
    const safePath = validatePath ? validateCsvFilePath(filePath) : filePath;
    
    try {
      // Read file
      const csvContent = await fs.promises.readFile(safePath, 'utf8');
      
      // Parse CSV with hooks and caching
      return csvToJson(csvContent, csvOptions);
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
  const { validatePath = true, ...csvOptions } = options;
  const safePath = validatePath ? validateCsvFilePath(filePath) : filePath;
  
  try {
    // Read file
    const csvContent = fs.readFileSync(safePath, 'utf8');
    
    // Parse CSV with hooks and caching
    return csvToJson(csvContent, csvOptions);
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

export { TransformHooks, predefinedHooks };
