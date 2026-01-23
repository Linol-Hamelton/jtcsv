/**
 * JSON Save Module - Node.js Module
 * 
 * A lightweight module for saving JSON data to files with security validation.
 * 
 * @module json-save
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
 * Validates file path for JSON saving
 * @private
 */
function validateJsonFilePath(filePath) {
  const path = require('path');
  
  // Basic validation
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new ValidationError('File path must be a non-empty string');
  }
  
  // Ensure file has .json extension
  if (!filePath.toLowerCase().endsWith('.json')) {
    throw new ValidationError('File must have .json extension');
  }
  
  // Get absolute path and check for traversal
  const absolutePath = path.resolve(filePath);
  const normalizedPath = path.normalize(filePath);
  
  // Prevent directory traversal attacks
  if (normalizedPath.includes('..') || 
      /\\\.\.\\|\/\.\.\//.test(filePath) ||
      filePath.startsWith('..') ||
      filePath.includes('/..')) {
    throw new SecurityError('Directory traversal detected in file path');
  }
  
  return absolutePath;
}

/**
 * Validates JSON data and options
 * @private
 */
function validateJsonData(data, options) {
  // Validate data
  if (data === undefined || data === null) {
    throw new ValidationError('Data cannot be null or undefined');
  }
  
  // Validate options
  if (options && typeof options !== 'object') {
    throw new ConfigurationError('Options must be an object');
  }
  
  // Validate prettyPrint
  if (options?.prettyPrint !== undefined && typeof options.prettyPrint !== 'boolean') {
    throw new ConfigurationError('prettyPrint must be a boolean');
  }
  
  // Validate maxSize
  if (options?.maxSize && (typeof options.maxSize !== 'number' || options.maxSize <= 0)) {
    throw new ConfigurationError('maxSize must be a positive number');
  }
  
  return true;
}

/**
 * Saves JSON data to a file
 * 
 * @param {*} data - Data to save as JSON
 * @param {string} filePath - Path to save the JSON file
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.prettyPrint=false] - Format JSON with indentation
 * @param {number} [options.maxSize=10485760] - Maximum file size in bytes (default: 10MB)
 * @returns {Promise<void>}
 * 
 * @example
 * const { saveAsJson } = require('./json-save');
 * 
 * const data = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
 * await saveAsJson(data, './output.json', { prettyPrint: true });
 */
async function saveAsJson(data, filePath, options = {}) {
  return safeExecute(async () => {
    const fs = require('fs').promises;
    
    // Validate file path
    const safePath = validateJsonFilePath(filePath);
    
    // Validate data and options
    validateJsonData(data, options);
    
    const opts = options && typeof options === 'object' ? options : {};
    const {
      prettyPrint = false,
      maxSize = 10485760 // 10MB default limit
    } = opts;
    
    // Convert data to JSON string
    let jsonString;
    try {
      if (prettyPrint) {
        jsonString = JSON.stringify(data, null, 2);
      } else {
        jsonString = JSON.stringify(data);
      }
    } catch (error) {
      if (error.message.includes('circular') || error.message.includes('Converting circular')) {
        throw new ValidationError('Data contains circular references');
      }
      throw new ValidationError(`Failed to stringify JSON: ${error.message}`);
    }
    
    // Check size limit
    const byteSize = Buffer.byteLength(jsonString, 'utf8');
    if (byteSize > maxSize) {
      throw new LimitError(
        `JSON size exceeds maximum limit of ${maxSize} bytes`,
        maxSize,
        byteSize
      );
    }
    
    // Ensure directory exists
    const dir = require('path').dirname(safePath);
    
    try {
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(safePath, jsonString, 'utf8');
      
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
      
      throw new FileSystemError(`Failed to write JSON file: ${error.message}`, error);
    }
  }, 'FILE_SYSTEM_ERROR', { function: 'saveAsJson' });
}

/**
 * Synchronously saves JSON data to a file
 * 
 * @param {*} data - Data to save as JSON
 * @param {string} filePath - Path to save the JSON file
 * @param {Object} [options] - Configuration options (same as saveAsJson)
 * @returns {string} Path to saved file
 */
function saveAsJsonSync(data, filePath, options = {}) {
  return safeExecute(() => {
    const fs = require('fs');
    
    // Validate file path
    const safePath = validateJsonFilePath(filePath);
    
    // Validate data and options
    validateJsonData(data, options);
    
    const opts = options && typeof options === 'object' ? options : {};
    const {
      prettyPrint = false,
      maxSize = 10485760 // 10MB default limit
    } = opts;
    
    // Convert data to JSON string
    let jsonString;
    try {
      if (prettyPrint) {
        jsonString = JSON.stringify(data, null, 2);
      } else {
        jsonString = JSON.stringify(data);
      }
    } catch (error) {
      if (error.message.includes('circular') || error.message.includes('Converting circular')) {
        throw new ValidationError('Data contains circular references');
      }
      throw new ValidationError(`Failed to stringify JSON: ${error.message}`);
    }
    
    // Check size limit
    const byteSize = Buffer.byteLength(jsonString, 'utf8');
    if (byteSize > maxSize) {
      throw new LimitError(
        `JSON size exceeds maximum limit of ${maxSize} bytes`,
        maxSize,
        byteSize
      );
    }
    
    // Ensure directory exists
    const dir = require('path').dirname(safePath);
    
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(safePath, jsonString, 'utf8');
      
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
      
      throw new FileSystemError(`Failed to write JSON file: ${error.message}`, error);
    }
  }, 'FILE_SYSTEM_ERROR', { function: 'saveAsJsonSync' });
}

// Export the functions
module.exports = {
  saveAsJson,
  saveAsJsonSync,
  validateJsonFilePath
};

// For ES6 module compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = saveAsJson;
}
