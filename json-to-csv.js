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
  const {
    delimiter = ';',
    includeHeaders = true,
    renameMap = {},
    template = {}
  } = options;

  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Get all unique keys from all objects
  const allKeys = new Set();
  data.forEach(item => {
    Object.keys(item).forEach(key => allKeys.add(key));
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

  // Escape CSV value
  const escapeValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    
    const stringValue = String(value);
    
    // Check if value needs escaping (contains delimiter, quotes, or newlines)
    if (
      stringValue.includes(delimiter) ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      // Escape double quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  // Build CSV rows
  const rows = [];
  
  // Add headers row if requested
  if (includeHeaders && finalHeaders.length > 0) {
    rows.push(finalHeaders.join(delimiter));
  }
  
  // Add data rows
  for (const item of data) {
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
 * @returns {string} Unwrapped string value
 * 
 * @private
 */
function deepUnwrap(value, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return '[Too Deep]';
  if (value === null || value === undefined) return '';
  
  // Handle arrays - take first element
  if (Array.isArray(value) && value.length) {
    return deepUnwrap(value[0], depth + 1, maxDepth);
  }
  
  // Handle objects
  if (typeof value === 'object') {
    // If object has a 'value' property, use it
    if ('value' in value) {
      return deepUnwrap(value.value, depth + 1, maxDepth);
    }
    
    const keys = Object.keys(value);
    // If object has only one key, unwrap that value
    if (keys.length === 1) {
      return deepUnwrap(value[keys[0]], depth + 1, maxDepth);
    }
    
    // For complex objects, stringify
    return JSON.stringify(value);
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
    const processed = { ...item };
    
    for (const key in processed) {
      if (processed[key] && typeof processed[key] === 'object') {
        processed[key] = deepUnwrap(processed[key]);
      }
    }
    
    return processed;
  });
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
  const csvContent = jsonToCsv(data, options);
  
  try {
    await fs.writeFile(filePath, csvContent, 'utf8');
    console.log(`✅ CSV файл успешно создан: ${filePath}`);
  } catch (error) {
    console.error(`❌ Ошибка при записи CSV файла: ${error.message}`);
    throw error;
  }
}

// Export the main functions
module.exports = {
  jsonToCsv,
  preprocessData,
  saveAsCsv,
  deepUnwrap
};

// For ES6 module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = jsonToCsv;
}