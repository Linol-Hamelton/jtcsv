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
  
  // Validate autoDetect
  if (options?.autoDetect !== undefined && typeof options.autoDetect !== 'boolean') {
    throw new ConfigurationError('autoDetect must be a boolean');
  }
  
  // Validate candidates
  if (options?.candidates && !Array.isArray(options.candidates)) {
    throw new ConfigurationError('candidates must be an array');
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
      if (insideQuotes) {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Could be escaped quote ("") or double quote at end ("")
          if (i + 2 === line.length) {
            // This is the pattern "" at the end of the line
            // First quote is part of field, second is closing quote
            currentField += '"';
            i++; // Skip the closing quote
            insideQuotes = false;
          } else {
            // Escaped quote inside quotes ("" -> ")
            currentField += '"';
            i++; // Skip next quote
          }
        } else {
          // Check if this is really the end of the quoted field
          // Look ahead to see if next char is delimiter or end of line
          let isEndOfField = false;
          let j = i + 1;
          // Skip whitespace
          while (j < line.length && (line[j] === ' ' || line[j] === '\t')) {
            j++;
          }
          if (j === line.length || line[j] === delimiter) {
            isEndOfField = true;
          }
          
          if (isEndOfField) {
            // This is the closing quote
            insideQuotes = false;
          } else {
            // This quote is part of the field content
            currentField += '"';
          }
        }
      } else {
        // Start of quoted field
        insideQuotes = true;
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
 * Auto-detect CSV delimiter from content
 * @private
 */
function autoDetectDelimiter(csv, candidates = [';', ',', '\t', '|']) {
  if (!csv || typeof csv !== 'string') {
    return ';'; // default
  }

  const lines = csv.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return ';'; // default
  }

  // Use first non-empty line for detection
  const firstLine = lines[0];
  
  const counts = {};
  candidates.forEach(delim => {
    // Escape special regex characters
    const escapedDelim = delim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedDelim, 'g');
    const matches = firstLine.match(regex);
    counts[delim] = matches ? matches.length : 0;
  });

  // Find delimiter with maximum count
  let maxCount = -1;
  let detectedDelimiter = ';'; // default
  
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = delim;
    }
  }

  // If no delimiter found or tie, return default
  if (maxCount === 0) {
    return ';'; // default
  }

  return detectedDelimiter;
}

/**
 * Converts CSV string to JSON array
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

        // Determine delimiter
    let finalDelimiter = delimiter;
    if (!finalDelimiter && autoDetect) {
      finalDelimiter = autoDetectDelimiter(csv, candidates);
    }
    finalDelimiter = finalDelimiter || ';'; // fallback

    // Handle empty CSV
    if (csv.trim() === '') {
      return [];
    }

    // Parse CSV with proper handling of quotes and newlines
    const lines = [];
    let currentLine = '';
    let insideQuotes = false;
    
    for (let i = 0; i < csv.length; i++) {
      const char = csv[i];
      
      if (char === '"') {
        if (insideQuotes && i + 1 < csv.length && csv[i + 1] === '"') {
          // Escaped quote inside quotes ("" -> ")
          currentLine += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          insideQuotes = !insideQuotes;
        }
        currentLine += char;
        continue;
      }
      
      if (char === '\n' && !insideQuotes) {
        // End of line (outside quotes)
        lines.push(currentLine);
        currentLine = '';
        continue;
      }
      
      if (char === '\r') {
        // Ignore carriage return, will be handled by \n
        continue;
      }
      
      currentLine += char;
    }
    
    // Add the last line
    if (currentLine !== '' || insideQuotes) {
      lines.push(currentLine);
    }
    
    // Check for unclosed quotes
    if (insideQuotes) {
      throw new ParsingError('Unclosed quotes in CSV', lines.length);
    }
    
        if (lines.length === 0) {
      return [];
    }

    // Show warning for large datasets (optional limit)
    if (lines.length > 1000000 && !maxRows && process.env.NODE_ENV !== 'test') {
      console.warn(
        '⚠️ Warning: Processing >1M records in memory may be slow.\n' +
        '💡 Consider using createCsvToJsonStream() for better performance with large files.\n' +
        '📊 Current size: ' + lines.length.toLocaleString() + ' rows\n' +
        '🔧 Tip: Use { maxRows: N } option to set a custom limit if needed.'
      );
    }

    // Apply optional row limit if specified
    if (maxRows && lines.length > maxRows) {
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
        headers = parseCsvLine(lines[0], 1, finalDelimiter).map(header => {
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
        const firstLineFields = parseCsvLine(lines[0], 1, finalDelimiter);
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
        const fields = parseCsvLine(line, i + 1, finalDelimiter);
        
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
      /\\\\.\\.\\|\/\\.\\.\//.test(filePath) ||
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
  const fs = require('fs').promises;
  
  // Validate file path
  const safePath = validateCsvFilePath(filePath);
  
  try {
    // Read file
    const csvContent = await fs.readFile(safePath, 'utf8');
    
    // Parse CSV
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
 * Synchronously reads CSV file and converts it to JSON array
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
    
    // Parse CSV
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

// Export the functions
module.exports = {
  csvToJson,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter
};

// For ES6 module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = csvToJson;
}
