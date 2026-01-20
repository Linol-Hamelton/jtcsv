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
  
  // Validate maxRows
  if (options?.maxRows && (typeof options.maxRows !== 'number' || options.maxRows <= 0)) {
    throw new ConfigurationError('maxRows must be a positive number');
  }
  
  return true;
}

/**
 * Parses a single CSV line with proper escaping
 * @private
 */
function parseCsvLine(line, lineNumber, delimiter) {
  const fields = [];
  let currentField = '';
  let insideQuotes = false;
  let escapeNext = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (escapeNext) {
      currentField += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote inside quotes
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      // End of field
      fields.push(currentField);
      currentField = '';
      continue;
    }

    currentField += char;
  }

  // Add last field
  fields.push(currentField);

  // Check for unclosed quotes
  if (insideQuotes) {
    throw new ParsingError('Unclosed quotes in CSV', lineNumber);
  }

  // Validate field count consistency
  if (fields.length === 0) {
    throw new ParsingError('No fields found', lineNumber);
  }

  return fields;
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
    if (lowerValue === 'true') return true;
    if (lowerValue === 'false') return false;
  }
  
  // Parse empty strings as null
  if (result === '') {
    return null;
  }
  
  return result;
}

/**
 * Converts CSV string to JSON array
 * 
 * @param {string} csv - CSV string to convert
 * @param {Object} [options] - Configuration options
 * @param {string} [options.delimiter=';'] - CSV delimiter character
 * @param {boolean} [options.hasHeaders=true] - Whether CSV has headers row
 * @param {Object} [options.renameMap={}] - Map for renaming column headers (newKey: oldKey)
 * @param {boolean} [options.trim=true] - Trim whitespace from values
 * @param {boolean} [options.parseNumbers=false] - Parse numeric values
 * @param {boolean} [options.parseBooleans=false] - Parse boolean values
 * @param {number} [options.maxRows=1000000] - Maximum number of rows to process
 * @returns {Array<Object>} JSON array
 * 
 * @example
 * const { csvToJson } = require('./csv-to-json');
 * 
 * const csv = `id;name;email\n1;John;john@example.com\n2;Jane;jane@example.com`;
 * const json = csvToJson(csv, {
 *   delimiter: ';',
 *   parseNumbers: true
 * });
 */
function csvToJson(csv, options = {}) {
  return safeExecute(() => {
    // Validate input
    validateCsvInput(csv, options);
    
    const opts = options && typeof options === 'object' ? options : {};
    
    const {
      delimiter = ';',
      hasHeaders = true,
      renameMap = {},
      trim = true,
      parseNumbers = false,
      parseBooleans = false,
      maxRows = 1000000
    } = opts;

    // Handle empty CSV
    if (csv.trim() === '') {
      return [];
    }

    // Split CSV into lines
    const lines = csv.split(/\r?\n/);
    
    if (lines.length === 0) {
      return [];
    }

    // Limit rows to prevent OOM
    if (lines.length > maxRows) {
      throw new LimitError(
        `CSV size exceeds maximum limit of ${maxRows} rows`,
        maxRows,
        lines.length
      );
    }

    let headers = [];
    let startIndex = 0;
    
    // Parse headers if present
    if (hasHeaders && lines.length > 0) {
      try {
        headers = parseCsvLine(lines[0], 1, delimiter).map(header => {
          const trimmed = trim ? header.trim() : header;
          // Apply rename map
          return renameMap[trimmed] || trimmed;
        });
        startIndex = 1;
      } catch (error) {
        if (error instanceof ParsingError) {
          throw new ParsingError(`Failed to parse headers: ${error.message}`, 1);
        }
        throw error;
      }
    } else {
      // Generate numeric headers from first line
      try {
        const firstLineFields = parseCsvLine(lines[0], 1, delimiter);
        headers = firstLineFields.map((_, index) => `column${index + 1}`);
      } catch (error) {
        if (error instanceof ParsingError) {
          throw new ParsingError(`Failed to parse first line: ${error.message}`, 1);
        }
        throw error;
      }
    }

    // Parse data rows
    const result = [];
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (line.trim() === '') {
        continue;
      }
      
      try {
        const fields = parseCsvLine(line, i + 1, delimiter);
        
        // Handle mismatched field count
        const row = {};
        const fieldCount = Math.min(fields.length, headers.length);
        
        for (let j = 0; j < fieldCount; j++) {
          row[headers[j]] = parseCsvValue(fields[j], { trim, parseNumbers, parseBooleans });
        }
        
        // Warn about extra fields
        if (fields.length > headers.length && process.env.NODE_ENV === 'development') {
          console.warn(`[jtcsv] Line ${i + 1}: ${fields.length - headers.length} extra fields ignored`);
        }
        
        result.push(row);
      } catch (error) {
        if (error instanceof ParsingError) {
          throw new ParsingError(`Line ${i + 1}: ${error.message}`, i + 1);
        }
        throw error;
      }
    }

    return result;
  }, 'PARSE_FAILED', { function: 'csvToJson' });
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
      /\\\.\.\\|\/\.\.\//.test(filePath) ||
      filePath.startsWith('..') ||
      filePath.includes('/..')) {
    throw new SecurityError('Directory traversal detected in file path');
  }
  
  return path.resolve(filePath);
}

/**
 * Reads CSV file and converts it to JSON array
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
 *   parseNumbers: true
 * });
 */
async function readCsvAsJson(filePath, options = {}) {
  return safeExecute(async () => {
    const fs = require('fs').promises;
    
    // Validate file path
    const safePath = validateCsvFilePath(filePath);
    
    try {
      // Read file
      const csvContent = await fs.readFile(safePath, 'utf8');
      
      // Parse CSV
      return csvToJson(csvContent, options);
    } catch (error) {
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
 * Synchronously reads CSV file and converts it to JSON array
 * 
 * @param {string} filePath - Path to CSV file
 * @param {Object} [options] - Configuration options (same as csvToJson)
 * @returns {Array<Object>} JSON array
 */
function readCsvAsJsonSync(filePath, options = {}) {
  return safeExecute(() => {
    const fs = require('fs');
    
    // Validate file path
    const safePath = validateCsvFilePath(filePath);
    
    try {
      // Read file
      const csvContent = fs.readFileSync(safePath, 'utf8');
      
      // Parse CSV
      return csvToJson(csvContent, options);
    } catch (error) {
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
  }, 'FILE_SYSTEM_ERROR', { function: 'readCsvAsJsonSync' });
}

// Export the functions
module.exports = {
  csvToJson,
  readCsvAsJson,
  readCsvAsJsonSync
};

// For ES6 module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = csvToJson;
}
