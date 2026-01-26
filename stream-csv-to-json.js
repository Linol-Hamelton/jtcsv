/**
 * Stream CSV to JSON Converter - Node.js Module
 * 
 * A streaming implementation for converting CSV data to JSON format
 * with memory-efficient processing for large files.
 * 
 * @module stream-csv-to-json
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

const { Transform, Writable } = require('stream');
const { pipeline } = require('stream/promises');

// Import schema validator from utils
const { createSchemaValidators } = require('./src/utils/schema-validator');

/**
 * Creates a transform stream that converts CSV chunks to JSON objects
 * 
 * @param {Object} options - Configuration options
 * @param {string} [options.delimiter=';'] - CSV delimiter character
 * @param {boolean} [options.hasHeaders=true] - Whether CSV has headers row
 * @param {Object} [options.renameMap={}] - Map for renaming column headers { newKey: oldKey }
 * @param {boolean} [options.trim=true] - Trim whitespace from values
 * @param {boolean} [options.parseNumbers=false] - Parse numeric values
 * @param {boolean} [options.parseBooleans=false] - Parse boolean values
 * @param {number} [options.maxRows=Infinity] - Maximum number of rows to process
 * @param {Function} [options.transform] - Custom transform function for each row
 * @param {Object} [options.schema] - JSON schema for validation and formatting
 * @returns {Transform} Transform stream
 * 
 * @example
 * const { createCsvToJsonStream } = require('./stream-csv-to-json');
 * 
 * const transformStream = createCsvToJsonStream({
 *   delimiter: ',',
 *   parseNumbers: true,
 *   parseBooleans: true
 * });
 * 
 * // Pipe CSV text to JSON objects
 * csvReadableStream.pipe(transformStream).pipe(jsonWritableStream);
 */
/* istanbul ignore next */
function createCsvToJsonStream(options = {}) {
  return safeExecute(() => {
    /* istanbul ignore next */
    const opts = options && typeof options === 'object' ? options : {};
    
    const {
      delimiter = ';',
      hasHeaders = true,
      renameMap = {},
      trim = true,
      parseNumbers = false,
      parseBooleans = false,
      maxRows = Infinity,
      transform = null,
      schema = null
    } = opts;

    // Validate options
    if (delimiter && typeof delimiter !== 'string') {
      throw new ConfigurationError('Delimiter must be a string');
    }
    
    if (delimiter && delimiter.length !== 1) {
      throw new ConfigurationError('Delimiter must be a single character');
    }
    
    if (renameMap && typeof renameMap !== 'object') {
      throw new ConfigurationError('renameMap must be an object');
    }
    
    if (maxRows !== Infinity && (typeof maxRows !== 'number' || maxRows <= 0)) {
      throw new ConfigurationError('maxRows must be a positive number or Infinity');
    }
    
    if (transform && typeof transform !== 'function') {
      throw new ConfigurationError('transform must be a function');
    }
    
    if (schema && typeof schema !== 'object') {
      throw new ConfigurationError('schema must be an object');
    }

    let buffer = '';
    let headers = null;
    let headersProcessed = false;
    let rowCount = 0;
    let lineNumber = 0;
    let insideQuotes = false;
    let schemaValidators = null;

    // Initialize schema validators if schema is provided
    if (schema) {
      schemaValidators = createSchemaValidators(schema);
    }

    /**
     * Parses a CSV line with proper quote handling
     * 
     * @private
     * @param {string} line - CSV line to parse
     * @returns {string[]} Array of field values
     */
    const parseCsvLine = (line) => {
      const fields = [];
      let currentField = '';
      let insideQuotesLocal = false;
      let i = 0;

      while (i < line.length) {
        const char = line[i];

        if (char === '"') {
          if (insideQuotesLocal) {
            // Check for escaped quote ("")
            if (i + 1 < line.length && line[i + 1] === '"') {
              currentField += '"';
              i++; // Skip next quote
            } else {
              insideQuotesLocal = false;
            }
          } else {
            insideQuotesLocal = true;
          }
          i++;
          continue;
        }

        if (!insideQuotesLocal && char === delimiter) {
          fields.push(currentField);
          currentField = '';
          i++;
          continue;
        }

        currentField += char;
        i++;
      }

      // Add last field
      fields.push(currentField);

      // Check for unclosed quotes
      if (insideQuotesLocal) {
        throw new ParsingError('Unclosed quotes in CSV', lineNumber);
      }

      return fields;
    };

    /**
     * Parses a CSV value based on options
     * 
     * @private
     * @param {string} value - Raw CSV value
     * @returns {*} Parsed value
     */
    const parseCsvValue = (value) => {
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
        /* istanbul ignore next */
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
    };

    /**
     * Formats value based on schema
     * 
     * @private
     * @param {*} value - The value to format
     * @param {string} key - The key/field name
     * @returns {*} Formatted value
     */
    const formatValue = (value, key) => {
      if (!schemaValidators || !schemaValidators[key]) {
        return value;
      }
      
      const validator = schemaValidators[key];
      
      // Apply formatting if available
      if (validator.format) {
        return validator.format(value);
      }
      
      return value;
    };

    /**
     * Validates value against schema
     * 
     * @private
     * @param {*} value - The value to validate
     * @param {string} key - The key/field name
     * @returns {boolean} True if valid
     */
    const validateValue = (value, key) => {
      if (!schemaValidators || !schemaValidators[key]) {
        return true;
      }
      
      const validator = schemaValidators[key];
      
      // Apply validation if available
      /* istanbul ignore next */
      if (validator.validate) {
        return validator.validate(value);
      }
      
      /* istanbul ignore next */
      return true;
    };

    /**
     * Processes a complete line of CSV
     * 
     * @private
     * @param {string} line - Complete CSV line
     * @returns {Object|null} JSON object or null for headers
     */
    const processLine = (line) => {
      lineNumber++;
      
      // Skip empty lines
      if (line.trim() === '') {
        return null;
      }

      try {
        const fields = parseCsvLine(line);
        
        // Process headers
        if (hasHeaders && !headersProcessed) {
          headers = fields.map(field => {
            const trimmed = trim ? field.trim() : field;
            return renameMap[trimmed] || trimmed;
          });
          headersProcessed = true;
          return null;
        }
        
        // Generate headers if not provided
        if (!headers) {
          headers = fields.map((_, index) => `column${index + 1}`);
        }
        
        // Check row limit
        if (rowCount >= maxRows) {
          throw new LimitError(
            `CSV size exceeds maximum limit of ${maxRows} rows`,
            maxRows,
            rowCount
          );
        }
        
        // Build JSON object
        const row = {};
        const fieldCount = Math.min(fields.length, headers.length);
        
        for (let j = 0; j < fieldCount; j++) {
          let value = parseCsvValue(fields[j]);
          const key = headers[j];
          
          // Format value based on schema
          value = formatValue(value, key);
          
          // Validate value against schema
          if (!validateValue(value, key)) {
            throw new ValidationError(`Invalid value for field '${key}': ${value}`);
          }
          
          row[key] = value;
        }
        
        // Apply custom transform if provided
        let result = row;
        if (transform) {
          try {
            result = transform(row);
            /* istanbul ignore next */
            if (!result || typeof result !== 'object') {
              throw new ValidationError('Transform function must return an object');
            }
          } catch (error) {
            throw new ValidationError(`Transform function error: ${error.message}`);
          }
        }
        
        rowCount++;
        return result;
      } catch (error) {
        if (error instanceof ParsingError) {
          error.lineNumber = lineNumber;
        }
        throw error;
      }
    };

    return new Transform({
      objectMode: true,
      writableObjectMode: false,
      readableObjectMode: true,
      
      transform(chunk, encoding, callback) {
        try {
          const chunkStr = chunk.toString();
          buffer += chunkStr;
          
          // Process complete lines
          const lines = [];
          let start = 0;
          
          for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];
            
            if (char === '"') {
              insideQuotes = !insideQuotes;
            }
            
            if (!insideQuotes && char === '\n') {
              const line = buffer.substring(start, i).replace(/\r$/, '');
              lines.push(line);
              start = i + 1;
            }
          }
          
          // Keep incomplete line in buffer
          buffer = buffer.substring(start);
          
          // Process complete lines
          for (const line of lines) {
            const result = processLine(line);
            if (result !== null) {
              this.push(result);
            }
          }
          
          callback();
        } catch (error) {
          callback(error);
        }
      },
      
      /* istanbul ignore next */
      flush(callback) {
        try {
          // Process remaining buffer
          if (buffer.trim() !== '') {
            const result = processLine(buffer.replace(/\r$/, ''));
            if (result !== null) {
              this.push(result);
            }
          }
          
          // If no headers were found but were expected, generate them
          if (hasHeaders && !headersProcessed && headers === null) {
            // This means the CSV was empty or had no data rows
            // Nothing to do here
          }
          
          callback();
        } catch (error) {
          callback(error);
        }
      }
    });
  }, 'STREAM_CREATION_ERROR', { function: 'createCsvToJsonStream' });
}

/**
 * Converts a readable stream of CSV text to JSON objects
 * 
 * @param {Readable} inputStream - Readable stream of CSV text
 * @param {Writable} outputStream - Writable stream for JSON objects
 * @param {Object} options - Configuration options (same as createCsvToJsonStream)
 * @returns {Promise<void>}
 * 
 * @example
 * const { streamCsvToJson } = require('./stream-csv-to-json');
 * 
 * await streamCsvToJson(csvStream, jsonStream, {
 *   delimiter: ',',
 *   parseNumbers: true,
 *   schema: {
 *     properties: {
 *       id: { type: 'integer' },
 *       name: { type: 'string', minLength: 1 }
 *     }
 *   }
 * });
 */
/* istanbul ignore next */ async function streamCsvToJson(inputStream, outputStream, options = {}) {
  return safeExecute(async () => {
    const transformStream = createCsvToJsonStream(options);
    
    await pipeline(
      inputStream,
      transformStream,
      outputStream
    );
  }, 'STREAM_PROCESSING_ERROR', { function: 'streamCsvToJson' });
}

/**
 * Reads CSV file and converts it to JSON using streaming
 * 
 * @param {string} filePath - Path to CSV file
 * @param {Object} options - Configuration options (same as createCsvToJsonStream)
 * @returns {Promise<Readable>} Readable stream of JSON objects
 * 
 * @example
 * const { createCsvFileToJsonStream } = require('./stream-csv-to-json');
 * 
 * const jsonStream = await createCsvFileToJsonStream('./large-data.csv', {
 *   delimiter: ',',
 *   parseNumbers: true
 * });
 * 
 * jsonStream.pipe(process.stdout);
 */
async function createCsvFileToJsonStream(filePath, options = {}) {
  return safeExecute(async () => {
    const fs = require('fs');
    const path = require('path');
    
    // Validate file path
    if (typeof filePath !== 'string' || filePath.trim() === '') {
      throw new ValidationError('File path must be a non-empty string');
    }
    
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
    
    const safePath = path.resolve(filePath);
    
    // Check if file exists
    try {
      await fs.promises.access(safePath, fs.constants.R_OK);
    } catch (error) {
      throw new FileSystemError(`File not found or not readable: ${safePath}`, error);
    }
    
    // Create read stream
    const readStream = fs.createReadStream(safePath, 'utf8');
    const transformStream = createCsvToJsonStream(options);
    
    // Pipe through transform
    return readStream.pipe(transformStream);
  }, 'FILE_STREAM_ERROR', { function: 'createCsvFileToJsonStream' });
}

/**
 * Creates a writable stream that collects JSON objects into an array
 * 
 * @returns {Writable} Writable stream that collects data
 */
function createJsonCollectorStream() {
  const collectedData = [];
  
  return new Writable({
    objectMode: true,
    
    write(chunk, encoding, callback) {
      collectedData.push(chunk);
      callback();
    },
    
    final(callback) {
      this._collectedData = collectedData;
      callback();
    }
  });
}

module.exports = {
  createCsvToJsonStream,
  streamCsvToJson,
  createCsvFileToJsonStream,
  createJsonCollectorStream
  // Note: createSchemaValidators is no longer exported from here
  // It should be imported directly from './src/utils/schema-validator'
};

// For ES6 module compatibility
/* istanbul ignore next */
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = createCsvToJsonStream;
}