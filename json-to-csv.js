/**
 * JSON to CSV Converter - Node.js Module
 * 
 * A lightweight, efficient module for converting JSON data to CSV format
 * with proper escaping and formatting for Excel compatibility.
 * 
 * @module json-to-csv
 */

const {
  ValidationError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  safeExecute
} = require('./errors');

/**
 * Validates input data and options
 * @private
 */
function validateInput(data, options) {
  // Validate data
  if (!Array.isArray(data)) {
    throw new ValidationError('Input data must be an array');
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
  
  // Validate renameMap
  if (options?.renameMap && typeof options.renameMap !== 'object') {
    throw new ConfigurationError('renameMap must be an object');
  }
  
  // Validate maxRecords
  if (options && options.maxRecords !== undefined) {
    if (typeof options.maxRecords !== 'number' || options.maxRecords <= 0) {
      throw new ConfigurationError('maxRecords must be a positive number');
    }
  }
  
  // Validate preventCsvInjection
  if (options?.preventCsvInjection !== undefined && typeof options.preventCsvInjection !== 'boolean') {
    throw new ConfigurationError('preventCsvInjection must be a boolean');
  }
  
  // Validate rfc4180Compliant
  if (options?.rfc4180Compliant !== undefined && typeof options.rfc4180Compliant !== 'boolean') {
    throw new ConfigurationError('rfc4180Compliant must be a boolean');
  }
  
  return true;
}

/**
 * Converts JSON data to CSV format
 * 
 * @param {Array<Object>} data - Array of objects to convert to CSV
 * @param {Object} [options] - Configuration options
 * @param {string} [options.delimiter=';'] - CSV delimiter character
 * @param {boolean} [options.includeHeaders=true] - Whether to include headers row
 * @param {Object} [options.renameMap={}] - Map for renaming column headers (oldKey: newKey)
* @param {Object} [options.template={}] - Template object to ensure consistent column order
 * @param {number} [options.maxRecords] - Maximum number of records to process (optional, no limit by default)
 * @param {boolean} [options.preventCsvInjection=true] - Prevent CSV injection attacks by escaping formulas
 * @param {boolean} [options.rfc4180Compliant=true] - Ensure RFC 4180 compliance (proper quoting, line endings)
 * @returns {string} CSV formatted string
 * 
 * @example
 * const jsonToCsv = require('./json-to-csv');
 * 
 * const data = [
 *   { id: 1, name: 'John', email: 'john@example.com' },
 *   { id: 2, name: 'Jane', email: 'jane@example.com' }
 * ];
 * 
 * const csv = jsonToCsv(data, {
 *   delimiter: ',',
 *   renameMap: { id: 'ID', name: 'Full Name' },
 *   preventCsvInjection: true,
 *   rfc4180Compliant: true
 * });
 */
function jsonToCsv(data, options = {}) {
  return safeExecute(() => {
    // Validate input
    validateInput(data, options);
    
    const opts = options && typeof options === 'object' ? options : {};
    
    const {
      delimiter = ';',
      includeHeaders = true,
      renameMap = {},
      template = {},
      maxRecords,
      preventCsvInjection = true,
      rfc4180Compliant = true
    } = opts;

    // Handle empty data
    if (data.length === 0) {
      return '';
    }

    // Show warning for large datasets (optional limit)
    if (data.length > 1000000 && !maxRecords && process.env.NODE_ENV !== 'test') {
      console.warn(
        '⚠️ Warning: Processing >1M records in memory may be slow.\n' +
        '💡 Consider processing data in batches or using streaming for large files.\n' +
        '📊 Current size: ' + data.length.toLocaleString() + ' records\n' +
        '🔧 Tip: Use { maxRecords: N } option to set a custom limit if needed.'
      );
    }

    // Apply optional record limit if specified
    if (maxRecords && data.length > maxRecords) {
      throw new LimitError(
        `Data size exceeds maximum limit of ${maxRecords} records`,
        maxRecords,
        data.length
      );
    }

    // Get all unique keys from all objects with minimal allocations.
    const allKeys = new Set();
    const originalKeys = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item || typeof item !== 'object') {
        continue;
      }
      for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key) && !allKeys.has(key)) {
          allKeys.add(key);
          originalKeys.push(key);
        }
      }
    }

    const hasRenameMap = Object.keys(renameMap).length > 0;
    const hasTemplate = Object.keys(template).length > 0;

    // Apply rename map to create header names.
    let headers = originalKeys;
    let reverseRenameMap = null;
    if (hasRenameMap) {
      headers = new Array(originalKeys.length);
      reverseRenameMap = {};
      for (let i = 0; i < originalKeys.length; i++) {
        const key = originalKeys[i];
        const header = renameMap[key] || key;
        headers[i] = header;
        reverseRenameMap[header] = key;
      }
    }

    // Apply template ordering if provided.
    let finalHeaders = headers;
    if (hasTemplate) {
      const templateKeys = Object.keys(template);
      const templateHeaders = hasRenameMap
        ? templateKeys.map(key => renameMap[key] || key)
        : templateKeys;
      const templateHeaderSet = new Set(templateHeaders);
      const extraHeaders = [];
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (!templateHeaderSet.has(header)) {
          extraHeaders.push(header);
        }
      }
      finalHeaders = templateHeaders.concat(extraHeaders);
    }

    const finalKeys = new Array(finalHeaders.length);
    if (hasRenameMap) {
      for (let i = 0; i < finalHeaders.length; i++) {
        const header = finalHeaders[i];
        finalKeys[i] = reverseRenameMap[header] || header;
      }
    } else {
      for (let i = 0; i < finalHeaders.length; i++) {
        finalKeys[i] = finalHeaders[i];
      }
    }

    /**
     * Escapes a value for CSV format with CSV injection protection
     * 
     * @private
     * @param {*} value - The value to escape
     * @returns {string} Escaped CSV value
     */
    const quoteRegex = /"/g;
    const delimiterCode = delimiter.charCodeAt(0);

    const escapeValue = (value) => {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      
      let stringValue = value;
      if (typeof stringValue !== 'string') {
        stringValue = String(stringValue);
      }
      
      // CSV Injection protection - escape formulas if enabled
      let escapedValue = stringValue;
      if (preventCsvInjection) {
        const firstCharCode = stringValue.charCodeAt(0);
        if (firstCharCode === 61 || firstCharCode === 43 || firstCharCode === 45 || firstCharCode === 64) {
          escapedValue = "'" + stringValue;
        }
      }

      let needsQuoting = false;
      let hasQuote = false;
      for (let i = 0; i < escapedValue.length; i++) {
        const code = escapedValue.charCodeAt(i);
        if (code === 34) {
          hasQuote = true;
          needsQuoting = true;
        } else if (code === delimiterCode || code === 10 || code === 13) {
          needsQuoting = true;
        }
      }

      if (needsQuoting) {
        const quotedValue = hasQuote ? escapedValue.replace(quoteRegex, '""') : escapedValue;
        return `"${quotedValue}"`;
      }

      return escapedValue;
    };

    // Build CSV rows.
    const rows = [];
    const columnCount = finalHeaders.length;

    // Add headers row if requested.
    if (includeHeaders && columnCount > 0) {
      rows.push(finalHeaders.join(delimiter));
    }

    // Add data rows.
    const rowValues = new Array(columnCount);
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const item = data[rowIndex];
      if (!item || typeof item !== 'object') {
        continue;
      }

      for (let i = 0; i < columnCount; i++) {
        rowValues[i] = escapeValue(item[finalKeys[i]]);
      }

      rows.push(rowValues.join(delimiter));
    }

    // RFC 4180: Each record is located on a separate line, delimited by a line break (CRLF).
    const lineEnding = rfc4180Compliant ? '\r\n' : '\n';
    return rows.join(lineEnding);
  }, 'PARSE_FAILED', { function: 'jsonToCsv' });
}

/**
 * Deeply unwraps nested objects and arrays to extract primitive values
 * 
 * @param {*} value - Value to unwrap
 * @param {number} [depth=0] - Current recursion depth
 * @param {number} [maxDepth=5] - Maximum recursion depth
 * @param {Set} [visited=new Set()] - Set of visited objects to detect circular references
 * @returns {string} Unwrapped string value
 * 
 * @private
 */
function deepUnwrap(value, depth = 0, maxDepth = 5, visited = new Set()) {
  // Check depth before processing
  if (depth >= maxDepth) {
    return '[Too Deep]';
  }
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle circular references - return early for circular refs
  if (typeof value === 'object') {
    if (visited.has(value)) {
      return '[Circular Reference]';
    }
    visited.add(value);
  }
  
  // Handle arrays - join all elements
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '';
    }
    const unwrappedItems = value.map(item => 
      deepUnwrap(item, depth + 1, maxDepth, visited)
    ).filter(item => item !== '');
    return unwrappedItems.join(', ');
  }
  
  // Handle objects
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '';
    }
    
    // For maxDepth = 0 or 1, return [Too Deep] for objects
    if (depth + 1 >= maxDepth) {
      return '[Too Deep]';
    }
    
    // Stringify complex objects
    try {
      return JSON.stringify(value);
    } catch (error) {
      // Check if it's a circular reference
      if (error.message.includes('circular') || error.message.includes('Converting circular')) {
        return '[Circular Reference]';
      }
      return '[Unstringifiable Object]';
    }
  }
  
  // Convert to string for primitive values
  return String(value);
}

/**
 * Preprocesses JSON data by deeply unwrapping nested structures
 * 
 * @param {Array<Object>} data - Array of objects to preprocess
 * @returns {Array<Object>} Preprocessed data with unwrapped values
 * 
 * @example
 * const processed = preprocessData(complexJsonData);
 * const csv = jsonToCsv(processed);
 */
function preprocessData(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data.map(item => {
    if (!item || typeof item !== 'object') {
      return {};
    }
    
    const processed = {};
    
    for (const key in item) {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        const value = item[key];
        if (value && typeof value === 'object') {
          processed[key] = deepUnwrap(value);
        } else {
          processed[key] = value;
        }
      }
    }
    
    return processed;
  });
}

/**
 * Validates file path to prevent path traversal attacks
 * @private
 */
function validateFilePath(filePath) {
  const path = require('path');
  
  // Basic validation
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new ValidationError('File path must be a non-empty string');
  }
  
  // Ensure file has .csv extension
  if (!filePath.toLowerCase().endsWith('.csv')) {
    throw new ValidationError('File must have .csv extension');
  }
  
  // Get absolute path and check for traversal
  const absolutePath = path.resolve(filePath);
  const normalizedPath = path.normalize(filePath);
  
  // Prevent directory traversal attacks
  // Check if normalized path contains parent directory references
  if (normalizedPath.includes('..') || 
      /\\\.\.\\|\/\.\.\//.test(filePath) ||
      filePath.startsWith('..') ||
      filePath.includes('/..')) {
    throw new SecurityError('Directory traversal detected in file path');
  }
  
  return absolutePath;
}

/**
 * Converts JSON to CSV and saves it to a file
 * 
 * @param {Array<Object>} data - Array of objects to convert
 * @param {string} filePath - Path to save the CSV file
 * @param {Object} [options] - Configuration options (same as jsonToCsv)
 * @returns {Promise<void>}
 * 
 * @example
 *     const { saveAsCsv } = require('./json-to-csv');
 * 
 * await saveAsCsv(data, './output.csv', {
 *   delimiter: ',',
 *   renameMap: { id: 'ID' }
 * });
 */
async function saveAsCsv(data, filePath, options = {}) {
  return safeExecute(async () => {
    const fs = require('fs').promises;
    
    // Validate file path
    const safePath = validateFilePath(filePath);
    
    // Convert data to CSV
    const csvContent = jsonToCsv(data, options);
    
    // Ensure directory exists
    const dir = require('path').dirname(safePath);
    
    try {
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(safePath, csvContent, 'utf8');
      
      return safePath;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new FileSystemError(`Directory does not exist: ${dir}`, error);
      }
      if (error.code === 'EACCES') {
        throw new FileSystemError(`Permission denied: ${safePath}`, error);
      }
      if (error.code === 'ENOSPC') {
        throw new FileSystemError(`No space left on device: ${safePath}`, error);
      }
      
      throw new FileSystemError(`Failed to write CSV file: ${error.message}`, error);
    }
  }, 'FILE_SYSTEM_ERROR', { function: 'saveAsCsv' });
}

// Export the main functions
module.exports = {
  jsonToCsv,
  preprocessData,
  saveAsCsv,
  deepUnwrap,
  validateFilePath
};

// For ES6 module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = jsonToCsv;
}
