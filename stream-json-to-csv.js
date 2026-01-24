/**
 * Stream JSON to CSV Converter - Node.js Module
 * 
 * A streaming implementation for converting JSON data to CSV format
 * with memory-efficient processing for large files.
 * 
 * @module stream-json-to-csv
 */

const {
  ValidationError,
  SecurityError,
  LimitError,
  ConfigurationError,
  safeExecute
} = require('./errors');

const { Transform, Readable, Writable } = require('stream');
const { pipeline } = require('stream/promises');

/**
 * Creates a transform stream that converts JSON objects to CSV rows
 * 
 * @param {Object} options - Configuration options
 * @param {string} [options.delimiter=';'] - CSV delimiter character
 * @param {boolean} [options.includeHeaders=true] - Whether to include headers row
 * @param {Object} [options.renameMap={}] - Map for renaming column headers (oldKey: newKey)
 * @param {Object} [options.template={}] - Template object to ensure consistent column order
 * @param {number} [options.maxRecords=Infinity] - Maximum number of records to process
 * @param {Function} [options.transform] - Custom transform function for each row
 * @param {Object} [options.schema] - JSON schema for validation and formatting
 * @returns {Transform} Transform stream
 * 
 * @example
 * const { createJsonToCsvStream } = require('./stream-json-to-csv');
 * 
 * const transformStream = createJsonToCsvStream({
 *   delimiter: ',',
 *   renameMap: { id: 'ID', name: 'Full Name' }
 * });
 * 
 * // Pipe JSON objects to CSV
 * jsonReadableStream.pipe(transformStream).pipe(csvWritableStream);
 */
/* istanbul ignore next */
function createJsonToCsvStream(options = {}) {
  return safeExecute(() => {
    /* istanbul ignore next */
    const opts = options && typeof options === 'object' ? options : {};
    
    const {
      delimiter = ';',
      includeHeaders = true,
      renameMap = {},
      template = {},
      maxRecords = Infinity,
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
    
    if (template && typeof template !== 'object') {
      throw new ConfigurationError('template must be an object');
    }
    
    if (maxRecords !== Infinity && (typeof maxRecords !== 'number' || maxRecords <= 0)) {
      throw new ConfigurationError('maxRecords must be a positive number or Infinity');
    }
    
    if (transform && typeof transform !== 'function') {
      throw new ConfigurationError('transform must be a function');
    }
    
    if (schema && typeof schema !== 'object') {
      throw new ConfigurationError('schema must be an object');
    }

    let headers = null;
    let headersWritten = false;
    let recordCount = 0;
    let reverseRenameMap = {};
    let finalHeaders = [];
    let schemaValidators = null;

    // Initialize schema validators if schema is provided
    if (schema) {
      schemaValidators = createSchemaValidators(schema);
    }

    /**
     * Escapes a value for CSV format with CSV injection protection
     * 
     * @private
     * @param {*} value - The value to escape
     * @returns {string} Escaped CSV value
     */
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

    return new Transform({
      objectMode: true,
      
      transform(chunk, encoding, callback) {
        try {
          // Check record limit
          if (recordCount >= maxRecords) {
            return callback(new LimitError(
              `Data size exceeds maximum limit of ${maxRecords} records`,
              maxRecords,
              recordCount
            ));
          }
          
          // Validate chunk is an object
          if (!chunk || typeof chunk !== 'object') {
            return callback(new ValidationError('Input data must be objects'));
          }
          
          // Apply custom transform if provided
          let item = chunk;
          if (transform) {
            try {
              item = transform(chunk);
              /* istanbul ignore next */
              if (!item || typeof item !== 'object') {
                return callback(new ValidationError('Transform function must return an object'));
              }
            } catch (error) {
              return callback(new ValidationError(`Transform function error: ${error.message}`));
            }
          }
          
          // Initialize headers on first record
          if (!headers) {
            const allKeys = new Set();
            Object.keys(item).forEach(key => allKeys.add(key));
            const originalKeys = Array.from(allKeys);
            
            // Apply rename map to create header names
            headers = originalKeys.map(key => renameMap[key] || key);
            
            // Create reverse mapping
            reverseRenameMap = {};
            originalKeys.forEach((key, index) => {
              reverseRenameMap[headers[index]] = key;
            });
            
            // Apply template ordering if provided
            finalHeaders = headers;
            if (Object.keys(template).length > 0) {
              const templateHeaders = Object.keys(template).map(key => renameMap[key] || key);
              const extraHeaders = headers.filter(h => !templateHeaders.includes(h));
              finalHeaders = [...templateHeaders, ...extraHeaders];
            }
            
            // Write headers if requested
            if (includeHeaders && finalHeaders.length > 0 && !headersWritten) {
              this.push(finalHeaders.join(delimiter) + '\n');
              headersWritten = true;
            }
          }
          
          // Build CSV row
          const rowValues = finalHeaders.map(header => {
            // Get the original key for this header
            /* istanbul ignore next */
            const originalKey = reverseRenameMap[header] || header;
            let value = item[originalKey];
            
            // Format value based on schema
            value = formatValue(value, originalKey);
            
            // Validate value against schema
            if (!validateValue(value, originalKey)) {
              throw new ValidationError(`Invalid value for field '${originalKey}': ${value}`);
            }
            
            return escapeValue(value);
          });
          
          const row = rowValues.join(delimiter) + '\n';
          this.push(row);
          recordCount++;
          
          callback();
        } catch (error) {
          callback(error);
        }
      },
      
      flush(callback) {
        // If no data was processed but headers were requested, write empty headers
        if (includeHeaders && !headersWritten) {
          /* istanbul ignore next */
          if (Object.keys(template).length > 0) {
            const templateHeaders = Object.keys(template).map(key => renameMap[key] || key);
            /* istanbul ignore next */
            if (templateHeaders.length > 0) {
              this.push(templateHeaders.join(delimiter) + '\n');
            }
          }
        }
        callback();
      }
    });
  }, 'STREAM_CREATION_ERROR', { function: 'createJsonToCsvStream' });
}

/**
 * Creates schema validators from JSON schema
 * 
 * @private
 * @param {Object} schema - JSON schema
 * @returns {Object} Validators object
 */
function createSchemaValidators(schema) {
  const validators = {};
  
  if (!schema.properties) {
    return validators;
  }
  
  for (const [key, definition] of Object.entries(schema.properties)) {
    const validator = {
      type: definition.type,
      required: schema.required && schema.required.includes(key)
    };
    
    // Add format function for dates
    if (definition.type === 'string' && definition.format === 'date-time') {
      validator.format = (value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        /* istanbul ignore next */
        if (typeof value === 'string') {
          // Try to parse as date
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
        return value;
      };
    }
    
    // Add validation function
    validator.validate = (value) => {
      if (value === null || value === undefined) {
        return !validator.required;
      }
      
      // Type validation
      if (definition.type === 'string' && typeof value !== 'string') {
        return false;
      }
      if (definition.type === 'number' && typeof value !== 'number') {
        return false;
      }
      if (definition.type === 'integer' && (!Number.isInteger(value) || typeof value !== 'number')) {
        return false;
      }
      if (definition.type === 'boolean' && typeof value !== 'boolean') {
        return false;
      }
      
      // Additional constraints
      if (definition.minimum !== undefined && value < definition.minimum) {
        return false;
      }
      if (definition.maximum !== undefined && value > definition.maximum) {
        return false;
      }
      if (definition.minLength !== undefined && value.length < definition.minLength) {
        return false;
      }
      if (definition.maxLength !== undefined && value.length > definition.maxLength) {
        return false;
      }
      if (definition.pattern && !new RegExp(definition.pattern).test(value)) {
        return false;
      }
      
      return true;
    };
    
    validators[key] = validator;
  }
  
  return validators;
}

/**
 * Converts a readable stream of JSON objects to CSV and writes to a writable stream
 * 
 * @param {Readable} inputStream - Readable stream of JSON objects
 * @param {Writable} outputStream - Writable stream for CSV output
 * @param {Object} options - Configuration options (same as createJsonToCsvStream)
 * @returns {Promise<void>}
 * 
 * @example
 * const { streamJsonToCsv } = require('./stream-json-to-csv');
 * 
 * await streamJsonToCsv(jsonStream, csvStream, {
 *   delimiter: ',',
 *   schema: {
 *     properties: {
 *       id: { type: 'integer' },
 *       name: { type: 'string', minLength: 1 },
 *       date: { type: 'string', format: 'date-time' }
 *     }
 *   }
 * });
 */
/* istanbul ignore next */
async function streamJsonToCsv(inputStream, outputStream, options = {}) {
  return safeExecute(async () => {
    const transformStream = createJsonToCsvStream(options);
    
    await pipeline(
      inputStream,
      transformStream,
      outputStream
    );
  }, 'STREAM_PROCESSING_ERROR', { function: 'streamJsonToCsv' });
}

/**
 * Converts JSON to CSV and saves it to a file using streaming
 * 
 * @param {Readable} inputStream - Readable stream of JSON objects
 * @param {string} filePath - Path to save the CSV file
 * @param {Object} options - Configuration options (same as createJsonToCsvStream)
 * @returns {Promise<void>}
 * 
 * @example
 * const { saveJsonStreamAsCsv } = require('./stream-json-to-csv');
 * 
 * await saveJsonStreamAsCsv(jsonStream, './output.csv', {
 *   delimiter: ',',
 *   includeHeaders: true
 * });
 */
async function saveJsonStreamAsCsv(inputStream, filePath, options = {}) {
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
    
    // Ensure directory exists
    const dir = path.dirname(safePath);
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Create write stream with BOM for Excel UTF-8 support
    const writeStream = fs.createWriteStream(safePath, 'utf8');
    
    // Add UTF-8 BOM for Excel compatibility if requested
    if (options.addBOM !== false) {
      writeStream.write('\uFEFF');
    }
    
    const transformStream = createJsonToCsvStream(options);
    
    await pipeline(
      inputStream,
      transformStream,
      writeStream
    );
    
    return safePath;
  }, 'FILE_STREAM_ERROR', { function: 'saveJsonStreamAsCsv' });
}

/**
 * Creates a readable stream from an array of JSON objects
 * 
 * @param {Array<Object>} data - Array of JSON objects
 * @returns {Readable} Readable stream
 */
function createJsonReadableStream(data) {
  return new Readable({
    objectMode: true,
    read() {
      /* istanbul ignore next */
      if (!this._data) {
        this._data = Array.isArray(data) ? [...data] : [];
        this._index = 0;
      }
      
      while (this._index < this._data.length) {
        const item = this._data[this._index];
        this._index++;
        
        if (!this.push(item)) {
          // Stream buffer is full, wait for next read
          return;
        }
      }
      
      // End of data
      this.push(null);
    }
  });
}

/**
 * Creates a writable stream that collects CSV data
 * 
 * @returns {Writable} Writable stream that collects data
 */
function createCsvCollectorStream() {
  let collectedData = '';
  
  return new Writable({
    write(chunk, encoding, callback) {
      collectedData += chunk.toString();
      callback();
    },
    
    final(callback) {
      this._collectedData = collectedData;
      callback();
    }
  });
}

module.exports = {
  createJsonToCsvStream,
  streamJsonToCsv,
  saveJsonStreamAsCsv,
  createJsonReadableStream,
  createCsvCollectorStream,
  createSchemaValidators
};

// For ES6 module compatibility
/* istanbul ignore next */
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = createJsonToCsvStream;
}
