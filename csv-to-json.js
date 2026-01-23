/**
 * CSV to JSON Converter - Node.js Module
 * 
 * A lightweight, efficient module for converting CSV data to JSON format
 * with proper parsing and error handling.
 * 
 * @module csv-to-json
 */

const {
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  safeExecute
} = require('./errors');

const { TransformHooks, predefinedHooks } = require('./src/core/transform-hooks');
const DelimiterCache = require('./src/core/delimiter-cache');
const FastPathEngine = require('./src/engines/fast-path-engine');

// Глобальный экземпляр кэша для авто-детектирования разделителя
const globalDelimiterCache = new DelimiterCache(100);
const globalFastPathEngine = new FastPathEngine();

/**
 * Validates CSV input and options
 * @private
 */
function validateCsvInput(csv, options) {
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
    
    if (options.hooks.perRow && typeof options.hooks.perRow !== 'function') {
      throw new ConfigurationError('hooks.perRow must be a function');
    }
    
    if (options.hooks.transformHooks && !(options.hooks.transformHooks instanceof TransformHooks)) {
      throw new ConfigurationError('hooks.transformHooks must be an instance of TransformHooks');
    }
  }
  
  return true;
}

/**
 * Parses a value based on options
 * @private
 */
function parseCsvValue(value, options) {
  const { trim = true, parseNumbers = false, parseBooleans = false } = options;
  
  let result = value;
  
  if (trim) {
    result = result.trim();
  }
  
  // Remove Excel formula protection
  if (result.startsWith("'")) {
    result = result.substring(1);
  }
  
  // Parse numbers
  if (parseNumbers && /^-?\d+(\.\d+)?$/.test(result)) {
    const num = parseFloat(result);
    if (!isNaN(num)) {
      return num;
    }
  }
  
  // Parse booleans
  if (parseBooleans) {
    const lowerValue = result.toLowerCase();
    if (lowerValue === 'true') {
      return true; 
    }
    if (lowerValue === 'false') {
      return false; 
    }
  }
  
  // Parse empty strings as null
  if (result === '') {
    return null;
  }
  
  return result;
}

/**
 * Auto-detect CSV delimiter from content with caching support
 * @private
 */
function autoDetectDelimiter(csv, candidates = [';', ',', '\t', '|'], cache = null) {
  // Используем статический метод DelimiterCache с поддержкой кэширования
  return DelimiterCache.autoDetectDelimiter(csv, candidates, cache);
}

/**
 * Converts CSV string to JSON array with hooks and caching support
 * 
 * @param {string} csv - CSV string to convert
 * @param {Object} [options] - Configuration options
 * @param {string} [options.delimiter] - CSV delimiter character (default: auto-detected)
 * @param {boolean} [options.autoDetect=true] - Auto-detect delimiter if not specified
 * @param {Array} [options.candidates=[';', ',', '\t', '|']] - Candidate delimiters for auto-detection
 * @param {boolean} [options.hasHeaders=true] - Whether CSV has headers row
 * @param {Object} [options.renameMap={}] - Map for renaming column headers (newKey: oldKey)
 * @param {boolean} [options.trim=true] - Trim whitespace from values
 * @param {boolean} [options.parseNumbers=false] - Parse numeric values
 * @param {boolean} [options.parseBooleans=false] - Parse boolean values
 * @param {number} [options.maxRows] - Maximum number of rows to process (optional, no limit by default)
 * @param {boolean} [options.useCache=true] - Use caching for delimiter detection
 * @param {DelimiterCache} [options.cache] - Custom cache instance (optional)
 * @param {Object} [options.hooks] - Transform hooks
 * @param {Function} [options.hooks.beforeConvert] - Hook called before conversion
 * @param {Function} [options.hooks.afterConvert] - Hook called after conversion
 * @param {Function} [options.hooks.perRow] - Hook called for each row
 * @param {TransformHooks} [options.hooks.transformHooks] - TransformHooks instance
 * @returns {Array<Object>} JSON array
 * 
 * @example
 * const { csvToJson } = require('./csv-to-json');
 * 
 * const csv = `id;name;email\n1;John;john@example.com\n2;Jane;jane@example.com`;
 * const json = csvToJson(csv, {
 *   delimiter: ';',
 *   parseNumbers: true,
 *   useCache: true, // Включить кэширование
 *   hooks: {
 *     beforeConvert: (data) => {
 *       console.log('Starting conversion...');
 *       return data;
 *     },
 *     perRow: (row, index) => {
 *       return { ...row, processed: true, index };
 *     },
 *     afterConvert: (data) => {
 *       return data.filter(item => item.id > 0);
 *     }
 *   }
 * });
 */
function csvToJson(csv, options = {}) {
  return safeExecute(() => {
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
      useCache = true,
      cache: customCache,
      useFastPath = true,
      fastPathMode = 'objects',
      hooks = {}
    } = opts;

    if (fastPathMode === 'stream') {
      return csvToJsonIterator(csv, { ...opts, useFastPath, fastPathMode: 'objects' });
    }

    // Выбираем кэш для использования
    const cacheToUse = useCache ? (customCache || globalDelimiterCache) : null;

    // Create transform hooks system
    const transformHooks = new TransformHooks();
    
    // Add individual hooks if provided
    if (hooks.beforeConvert) {
      transformHooks.beforeConvert(hooks.beforeConvert);
    }
    
    if (hooks.afterConvert) {
      transformHooks.afterConvert(hooks.afterConvert);
    }
    
    if (hooks.perRow) {
      transformHooks.perRow(hooks.perRow);
    }
    
    // Use provided TransformHooks instance if available
    const finalHooks = hooks.transformHooks || transformHooks;

    // Apply beforeConvert hooks to CSV string
    const processedCsv = finalHooks.applyBeforeConvert(csv, { 
      operation: 'csvToJson',
      options: opts 
    });

    // Determine delimiter with caching support
    let finalDelimiter = delimiter;
    if (!finalDelimiter && autoDetect) {
      finalDelimiter = autoDetectDelimiter(processedCsv, candidates, cacheToUse);
    }
    finalDelimiter = finalDelimiter || ';'; // fallback

    // Handle empty CSV
    if (processedCsv.trim() === '') {
      return [];
    }

    let headers = null;
    let totalRows = 0;
    let dataRowIndex = 0;
    const result = [];

    try {
      const parseOptions = { delimiter: finalDelimiter };
      if (useFastPath === false) {
        parseOptions.forceEngine = 'STANDARD';
      }

      globalFastPathEngine.parseRows(processedCsv, parseOptions, (fields) => {
        totalRows++;

        if (!headers) {
          if (hasHeaders) {
            headers = fields.map(header => {
              const trimmed = trim ? header.trim() : header;
              return renameMap[trimmed] || trimmed;
            });
            return;
          }
          headers = fields.map((_, index) => `column${index + 1}`);
        }

        if (!fields || fields.length === 0) {
          return;
        }

        if (maxRows && totalRows > maxRows) {
          throw new LimitError(
            `CSV size exceeds maximum limit of ${maxRows} rows`,
            maxRows,
            totalRows
          );
        }

        const fieldCount = Math.min(fields.length, headers.length);
        let row;

        if (fastPathMode === 'compact') {
          row = new Array(fieldCount);
          for (let j = 0; j < fieldCount; j++) {
            row[j] = parseCsvValue(fields[j], { trim, parseNumbers, parseBooleans });
          }
        } else {
          row = {};
          for (let j = 0; j < fieldCount; j++) {
            row[headers[j]] = parseCsvValue(fields[j], { trim, parseNumbers, parseBooleans });
          }
        }

        const processedRow = finalHooks.applyPerRow(row, dataRowIndex, {
          lineNumber: totalRows,
          headers,
          options: opts
        });

        dataRowIndex++;
        result.push(processedRow);

        if (fields.length > headers.length && process.env.NODE_ENV === 'development') {
          console.warn(`[jtcsv] Line ${totalRows}: ${fields.length - headers.length} extra fields ignored`);
        }
      });
    } catch (error) {
      if (error && error.code === 'FAST_PATH_UNCLOSED_QUOTES') {
        throw new ParsingError(error.message, error.lineNumber);
      }
      throw error;
    }

    if (!headers) {
      return [];
    }

    if (totalRows > 1000000 && !maxRows && process.env.NODE_ENV !== 'test') {
      console.warn(
        'Warning: Processing >1M records in memory may be slow.\n' +
        'Consider using createCsvToJsonStream() for better performance with large files.\n' +
        'Current size: ' + totalRows.toLocaleString() + ' rows\n' +
        'Tip: Use { maxRows: N } option to set a custom limit if needed.'
      );
    }

    return finalHooks.applyAfterConvert(result, {
      operation: 'csvToJson',
      totalRows: result.length,
      options: opts
    });

  }, 'PARSE_FAILED', { function: 'csvToJson' });
}

async function* csvToJsonIterator(csv, options = {}) {
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
    useCache = true,
    cache: customCache,
    useFastPath = true,
    fastPathMode = 'objects',
    hooks = {}
  } = opts;

  const cacheToUse = useCache ? (customCache || globalDelimiterCache) : null;

  const transformHooks = new TransformHooks();

  if (hooks.beforeConvert) {
    transformHooks.beforeConvert(hooks.beforeConvert);
  }

  if (hooks.afterConvert) {
    transformHooks.afterConvert(hooks.afterConvert);
  }

  if (hooks.perRow) {
    transformHooks.perRow(hooks.perRow);
  }

  const finalHooks = hooks.transformHooks || transformHooks;

  const processedCsv = finalHooks.applyBeforeConvert(csv, {
    operation: 'csvToJson',
    options: opts
  });

  let finalDelimiter = delimiter;
  if (!finalDelimiter && autoDetect) {
    finalDelimiter = autoDetectDelimiter(processedCsv, candidates, cacheToUse);
  }
  finalDelimiter = finalDelimiter || ';';

  if (processedCsv.trim() === '') {
    return;
  }

  let headers = null;
  let totalRows = 0;
  let dataRowIndex = 0;

  const handleFields = (fields, lineNumber) => {
    if (!headers) {
      if (hasHeaders) {
        headers = fields.map(header => {
          const trimmed = trim ? header.trim() : header;
          return renameMap[trimmed] || trimmed;
        });
        return null;
      }
      headers = fields.map((_, index) => `column${index + 1}`);
    }

    if (!fields || fields.length === 0) {
      return null;
    }

    const fieldCount = Math.min(fields.length, headers.length);
    let row;

    const resolvedFastPathMode = fastPathMode === 'stream' ? 'objects' : fastPathMode;

    if (resolvedFastPathMode === 'compact') {
      row = new Array(fieldCount);
      for (let j = 0; j < fieldCount; j++) {
        row[j] = parseCsvValue(fields[j], { trim, parseNumbers, parseBooleans });
      }
    } else {
      row = {};
      for (let j = 0; j < fieldCount; j++) {
        row[headers[j]] = parseCsvValue(fields[j], { trim, parseNumbers, parseBooleans });
      }
    }

    const processedRow = finalHooks.applyPerRow(row, dataRowIndex, {
      lineNumber,
      headers,
      options: opts
    });

    dataRowIndex++;
    return processedRow;
  };

  try {
    const parseOptions = { delimiter: finalDelimiter };
    if (useFastPath === false) {
      parseOptions.forceEngine = 'STANDARD';
    }

    for (const fields of globalFastPathEngine.iterateRows(processedCsv, parseOptions)) {
      totalRows++;
      if (maxRows && totalRows > maxRows) {
        throw new LimitError(
          `CSV size exceeds maximum limit of ${maxRows} rows`,
          maxRows,
          totalRows
        );
      }
      const processedRow = handleFields(fields, totalRows);
      if (processedRow !== undefined && processedRow !== null) {
        if (fields.length > headers.length && process.env.NODE_ENV === 'development') {
          console.warn(`[jtcsv] Line ${totalRows}: ${fields.length - headers.length} extra fields ignored`);
        }
        yield processedRow;
      }
    }
  } catch (error) {
    if (error && error.code === 'FAST_PATH_UNCLOSED_QUOTES') {
      throw new ParsingError(error.message, error.lineNumber);
    }
    throw error;
  }
}

/**
 * Validates file path for CSV reading
 * @private
 */
function validateCsvFilePath(filePath) {
  const path = require('path');
  
  // Basic validation
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new ValidationError('File path must be a non-empty string');
  }
  
  // Ensure file has .csv extension
  if (!filePath.toLowerCase().endsWith('.csv')) {
    throw new ValidationError('File must have .csv extension');
  }
  
  // Prevent directory traversal attacks
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.includes('..') || 
      /\\\\.\\.\\|\/\\.\\.\//.test(filePath) ||
      filePath.startsWith('..') ||
      filePath.includes('/..')) {
    throw new SecurityError('Directory traversal detected in file path');
  }
  
  return path.resolve(filePath);
}

/**
 * Reads CSV file and converts it to JSON array with hooks and caching support
 * 
 * @param {string} filePath - Path to CSV file
 * @param {Object} [options] - Configuration options (same as csvToJson)
 * @returns {Promise<Array<Object>>} Promise that resolves to JSON array
 * 
 * @example
 * const { readCsvAsJson } = require('./csv-to-json');
 * 
 * const json = await readCsvAsJson('./data.csv', {
 *   delimiter: ',',
 *   parseNumbers: true,
 *   useCache: true,
 *   hooks: {
 *     perRow: (row) => ({ ...row, processed: true })
 *   }
 * });
 */
async function readCsvAsJson(filePath, options = {}) {
  const fs = require('fs').promises;
  
  // Validate file path
  const safePath = validateCsvFilePath(filePath);
  
  try {
    // Read file
    const csvContent = await fs.readFile(safePath, 'utf8');
    
    // Parse CSV with hooks and caching
    return csvToJson(csvContent, options);
  } catch (error) {
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
 * Synchronously reads CSV file and converts it to JSON array with hooks and caching support
 * 
 * @param {string} filePath - Path to CSV file
 * @param {Object} [options] - Configuration options (same as csvToJson)
 * @returns {Array<Object>} JSON array
 */
function readCsvAsJsonSync(filePath, options = {}) {
  const fs = require('fs');
  
  // Validate file path
  const safePath = validateCsvFilePath(filePath);
  
  try {
    // Read file
    const csvContent = fs.readFileSync(safePath, 'utf8');
    
    // Parse CSV with hooks and caching
    return csvToJson(csvContent, options);
  } catch (error) {
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
 * @returns {TransformHooks} New TransformHooks instance
 */
function createTransformHooks() {
  return new TransformHooks();
}

/**
 * Creates a new DelimiterCache instance
 * @param {number} maxSize - Maximum cache size (default: 100)
 * @returns {DelimiterCache} New DelimiterCache instance
 */
function createDelimiterCache(maxSize = 100) {
  return new DelimiterCache(maxSize);
}

/**
 * Gets statistics from the global delimiter cache
 * @returns {Object} Cache statistics
 */
function getDelimiterCacheStats() {
  return globalDelimiterCache.getStats();
}

/**
 * Clears the global delimiter cache
 */
function clearDelimiterCache() {
  globalDelimiterCache.clear();
}

// Export the functions
module.exports = {
  csvToJson,
  csvToJsonIterator,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter,
  createTransformHooks,
  createDelimiterCache,
  getDelimiterCacheStats,
  clearDelimiterCache,
  TransformHooks,
  DelimiterCache,
  predefinedHooks
};

// For ES6 module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = csvToJson;
}
