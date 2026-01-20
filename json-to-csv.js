/**
 * JSON to CSV Converter - Node.js Module
 * 
 * A lightweight, efficient module for converting JSON data to CSV format
 * with proper escaping and formatting for Excel compatibility.
 * 
 * @module json-to-csv
 */

/**
 * Converts JSON data to CSV format
 * 
 * @param {Array<Object>} data - Array of objects to convert to CSV
 * @param {Object} [options] - Configuration options
 * @param {string} [options.delimiter=';'] - CSV delimiter character
 * @param {boolean} [options.includeHeaders=true] - Whether to include headers row
 * @param {Object} [options.renameMap={}] - Map for renaming column headers (oldKey: newKey)
 * @param {Object} [options.template={}] - Template object to ensure consistent column order
 * @param {number} [options.maxRecords=1000000] - Maximum number of records to process
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
 *   renameMap: { id: 'ID', name: 'Full Name' }
 * });
 */
function jsonToCsv(data, options = {}) {
  // Ensure options is an object
  const opts = options && typeof options === 'object' ? options : {};
  
  const {
    delimiter = ';',
    includeHeaders = true,
    renameMap = {},
    template = {},
    maxRecords = 1000000
  } = opts;

  // Input validation
  if (!Array.isArray(data)) {
    throw new TypeError('Input data must be an array');
  }
  
  if (data.length === 0) {
    return '';
  }

  // Limit data size to prevent OOM
  if (data.length > maxRecords) {
    throw new Error(`Data size exceeds maximum limit of ${maxRecords} records`);
  }

  // Get all unique keys from all objects
  const allKeys = new Set();
  data.forEach(item => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });
  
  // Convert Set to Array
  const originalKeys = Array.from(allKeys);
  
  // Apply rename map to create header names
  const headers = originalKeys.map(key => renameMap[key] || key);
  
  // Create a reverse mapping from new header to original key
  const reverseRenameMap = {};
  originalKeys.forEach((key, index) => {
    reverseRenameMap[headers[index]] = key;
  });

  // Apply template ordering if provided
  let finalHeaders = headers;
  if (Object.keys(template).length > 0) {
    // Create template headers with renaming applied
    const templateHeaders = Object.keys(template).map(key => renameMap[key] || key);
    const extraHeaders = headers.filter(h => !templateHeaders.includes(h));
    finalHeaders = [...templateHeaders, ...extraHeaders];
  }

  // Escape CSV value with CSV injection protection
  const escapeValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    
    const stringValue = String(value);
    
    // CSV Injection protection - escape formulas
    let escapedValue = stringValue;
    if (/^[=+\-@]/.test(stringValue)) {
      // Prepend single quote to prevent formula execution in Excel
      escapedValue = "'" + stringValue;
    }
    
    // Check if value needs escaping (contains delimiter, quotes, or newlines)
    if (
      escapedValue.includes(delimiter) ||
      escapedValue.includes('"') ||
      escapedValue.includes('\n') ||
      escapedValue.includes('\r')
    ) {
      // Escape double quotes by doubling them
      return `"${escapedValue.replace(/"/g, '""')}"`;
    }
    
    return escapedValue;
  };

  // Build CSV rows
  const rows = [];
  
  // Add headers row if requested
  if (includeHeaders && finalHeaders.length > 0) {
    rows.push(finalHeaders.join(delimiter));
  }
  
  // Add data rows
  for (const item of data) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    
    const row = finalHeaders.map(header => {
      // Get the original key for this header
      const originalKey = reverseRenameMap[header] || header;
      const value = item[originalKey];
      return escapeValue(value);
    }).join(delimiter);
    
    rows.push(row);
  }
  
  return rows.join('\n');
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
      deepUnwrap(item, depth + 1, maxDepth, new Set(visited))
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
    throw new Error('File path must be a non-empty string');
  }
  
  // Ensure file has .csv extension
  if (!filePath.toLowerCase().endsWith('.csv')) {
    throw new Error('File must have .csv extension');
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
    throw new Error('Invalid file path: Directory traversal detected');
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
 * const { saveAsCsv } = require('./json-to-csv');
 * 
 * await saveAsCsv(data, './output.csv', {
 *   delimiter: ',',
 *   renameMap: { id: 'ID' }
 * });
 */
async function saveAsCsv(data, filePath, options = {}) {
  const fs = require('fs').promises;
  
  // Validate file path
  const safePath = validateFilePath(filePath);
  
  const csvContent = jsonToCsv(data, options);
  
  try {
    await fs.writeFile(safePath, csvContent, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`✅ CSV файл успешно создан: ${safePath}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ Ошибка при записи CSV файла: ${error.message}`);
    throw error;
  }
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