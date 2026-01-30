/**
 * JSON to CSV Converter - TypeScript Module
 * 
 * A lightweight, efficient module for converting JSON data to CSV format
 * with proper escaping and formatting for Excel compatibility.
 */

import {
  ValidationError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  safeExecuteSync,
  safeExecuteAsync,
  ErrorCode
} from './errors';

import { createSchemaValidators } from './src/utils/schema-validator';
import { JsonToCsvOptions, AsyncJsonToCsvOptions, AnyObject, AnyArray } from './src/types';

/**
 * Validates input data and options
 * @private
 */
function validateInput(data: AnyArray, options?: JsonToCsvOptions): boolean {
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
  
  // Validate schema
  if (options?.schema && typeof options.schema !== 'object') {
    throw new ConfigurationError('schema must be an object');
  }
  
  return true;
}

/**
 * Preprocesses data with flattening and array handling options
 */
export function preprocessData(
  data: AnyArray,
  options: {
    flatten?: boolean;
    flattenSeparator?: string;
    flattenMaxDepth?: number;
    arrayHandling?: 'stringify' | 'join' | 'expand';
  } = {}
): AnyArray {
  const {
    flatten = false,
    flattenSeparator = '.',
    flattenMaxDepth = 3,
    arrayHandling = 'stringify'
  } = options;
  
  if (!flatten && arrayHandling === 'stringify') {
    return data;
  }
  
  const processed: AnyArray = [];
  
  for (const item of data) {
    if (item && typeof item === 'object') {
      let processedItem: AnyObject = { ...item };
      
      // Handle flattening if enabled
      if (flatten) {
        processedItem = flattenObject(item, flattenSeparator, flattenMaxDepth);
      }
      
      // Handle arrays based on arrayHandling option
      processedItem = processArrays(processedItem, arrayHandling);
      
      processed.push(processedItem);
    } else {
      processed.push(item);
    }
  }
  
  return processed;
}

/**
 * Flattens a nested object into dot notation
 */
function flattenObject(
  obj: AnyObject,
  separator: string = '.',
  maxDepth: number = 3,
  currentDepth: number = 0,
  prefix: string = ''
): AnyObject {
  if (currentDepth >= maxDepth) {
    return { [prefix || 'value']: obj };
  }
  
  const flattened: AnyObject = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nestedFlattened = flattenObject(
        value as AnyObject,
        separator,
        maxDepth,
        currentDepth + 1,
        newKey
      );
      Object.assign(flattened, nestedFlattened);
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}

/**
 * Processes arrays based on the arrayHandling option
 */
function processArrays(obj: AnyObject, arrayHandling: 'stringify' | 'join' | 'expand'): AnyObject {
  const processed: AnyObject = { ...obj };
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      switch (arrayHandling) {
        case 'stringify':
          processed[key] = JSON.stringify(value);
          break;
        case 'join':
          processed[key] = value.join(', ');
          break;
        case 'expand':
          // For expand, we would create multiple columns
          // This is a simplified version
          if (value.length > 0 && typeof value[0] === 'object') {
            // Complex case - for now, stringify
            processed[key] = JSON.stringify(value);
          } else {
            processed[key] = value.join(', ');
          }
          break;
      }
    }
  }
  
  return processed;
}

/**
 * Deeply unwraps nested objects/arrays to primitive values
 */
export function deepUnwrap(
  data: any,
  options: {
    maxDepth?: number;
    preserveArrays?: boolean;
  } = {}
): any {
  const { maxDepth = 5, preserveArrays = false } = options;
  
  return unwrapRecursive(data, maxDepth, 0, preserveArrays);
}

function unwrapRecursive(
  value: any,
  maxDepth: number,
  currentDepth: number,
  preserveArrays: boolean
): any {
  if (currentDepth >= maxDepth) {
    return value;
  }
  
  if (value === null || value === undefined) {
    return value;
  }
  
  if (Array.isArray(value)) {
    if (preserveArrays) {
      return value.map(item => 
        unwrapRecursive(item, maxDepth, currentDepth + 1, preserveArrays)
      );
    } else {
      // Flatten arrays
      const result: any[] = [];
      for (const item of value) {
        const unwrapped = unwrapRecursive(item, maxDepth, currentDepth + 1, preserveArrays);
        if (Array.isArray(unwrapped)) {
          result.push(...unwrapped);
        } else {
          result.push(unwrapped);
        }
      }
      return result;
    }
  }
  
  if (typeof value === 'object') {
    const unwrapped: AnyObject = {};
    for (const [key, val] of Object.entries(value)) {
      unwrapped[key] = unwrapRecursive(val, maxDepth, currentDepth + 1, preserveArrays);
    }
    return unwrapped;
  }
  
  return value;
}

/**
 * Validates file path for security
 */
export function validateFilePath(filePath: string, options: { allowRelative?: boolean } = {}): boolean {
  const { allowRelative = false } = options;
  
  if (typeof filePath !== 'string') {
    throw new ValidationError('File path must be a string');
  }
  
  // Check for null bytes
  if (filePath.includes('\0')) {
    throw new SecurityError('File path contains null byte');
  }
  
  // Check for directory traversal
  if (!allowRelative && (filePath.includes('..') || filePath.startsWith('./'))) {
    throw new SecurityError('Relative file paths are not allowed');
  }
  
  // Check for dangerous patterns (simplified)
  const dangerousPatterns = [
    /^\/etc\/passwd/,
    /^\/etc\/shadow/,
    /^\/proc\/self/,
    /^\/dev\/null/,
    /^\/dev\/zero/,
    /^\/dev\/random/,
    /^\/dev\/urandom/
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(filePath)) {
      throw new SecurityError('File path matches dangerous pattern');
    }
  }
  
  return true;
}

/**
 * Converts JSON data to CSV format
 */
export function jsonToCsv(
  data: AnyArray,
  options: JsonToCsvOptions = {}
): string {
  return safeExecuteSync(() => {
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
      rfc4180Compliant = true,
      schema = null,
      flatten = false,
      flattenSeparator = '.',
      flattenMaxDepth = 3,
      arrayHandling = 'stringify'
    } = opts;
    
    // Initialize schema validators if schema is provided
    let schemaValidators = null;
    if (schema) {
      schemaValidators = createSchemaValidators(schema);
    }
    
    // Handle empty data
    if (data.length === 0) {
      return '';
    }
    
    // Show warning for large datasets (optional limit)
    if (data.length > 1000000 && !maxRecords && process.env['NODE_ENV'] !== 'test') {
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
    
    // Preprocess data with flattening options if needed
    const processedData = preprocessData(data, {
      flatten,
      flattenSeparator,
      flattenMaxDepth,
      arrayHandling
    });
    
    // Get all unique keys from all objects with minimal allocations.
    const allKeys = new Set<string>();
    const originalKeys: string[] = [];
    for (let i = 0; i < processedData.length; i++) {
      const item = processedData[i];
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
    let reverseRenameMap: Record<string, string> | null = null;
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
      const extraHeaders: string[] = [];
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (!templateHeaderSet.has(header)) {
          extraHeaders.push(header);
        }
      }
      finalHeaders = templateHeaders.concat(extraHeaders);
    }
    
    const finalKeys = new Array(finalHeaders.length);
    if (hasRenameMap && reverseRenameMap) {
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
     */
    const quoteRegex = /"/g;
    const delimiterCode = delimiter.charCodeAt(0);
    
    const escapeValue = (value: any): string => {
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
        // Dangerous prefixes: =, +, -, @, tab (\t), carriage return (\r)
        if (firstCharCode === 61 || firstCharCode === 43 || firstCharCode === 45 || firstCharCode === 64 ||
            firstCharCode === 9 || firstCharCode === 13) {
          escapedValue = "'" + stringValue;
        }
        // Unicode Bidi override characters
        const bidiChars = ['\u202A', '\u202B', '\u202C', '\u202D', '\u202E'];
        for (const bidi of bidiChars) {
          if (stringValue.includes(bidi)) {
            escapedValue = escapedValue.replace(new RegExp(bidi, 'g'), '');
          }
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
    
    // Build CSV rows
    const rows: string[] = [];
    
    // Add headers row if requested
    if (includeHeaders) {
      const headerRow = finalHeaders.map(header => escapeValue(header)).join(delimiter);
      rows.push(headerRow);
    }
    
    // Process each data row
    for (let i = 0; i < processedData.length; i++) {
      const item = processedData[i];
      const rowValues: string[] = [];
      
      for (let j = 0; j < finalKeys.length; j++) {
        const key = finalKeys[j];
        const value = item && typeof item === 'object' ? (item as AnyObject)[key] : undefined;
        rowValues.push(escapeValue(value));
      }
      
      rows.push(rowValues.join(delimiter));
    }
    
    // Apply RFC 4180 compliance if requested
    let csv = rows.join(rfc4180Compliant ? '\r\n' : '\n');
    
    if (rfc4180Compliant && rows.length > 0) {
      // Ensure proper line ending
      if (!csv.endsWith('\r\n')) {
        csv += '\r\n';
      }
    }
    
    return csv;
  }, 'PARSING_ERROR', { function: 'jsonToCsv' });
}

/**
 * Asynchronous version of jsonToCsv with support for worker threads
 */
export async function jsonToCsvAsync(
  data: AnyArray,
  options: AsyncJsonToCsvOptions = {}
): Promise<string> {
  return safeExecuteAsync(async () => {
    // For now, use the synchronous version
    // In the future, this will use worker threads for large datasets
    const { useWorkers = false, workerCount, chunkSize, onProgress, ...syncOptions } = options;
    
    // Simple implementation - just call the synchronous version
    // TODO: Implement worker thread support for large datasets
    return jsonToCsv(data, syncOptions);
  }, 'PARSING_ERROR', { function: 'jsonToCsvAsync' });
}

/**
 * Saves JSON data as CSV file
 */
export function saveAsCsv(
  data: AnyArray,
  filePath: string,
  options: JsonToCsvOptions & { validatePath?: boolean } = {}
): void {
  return safeExecuteSync(() => {
    const { validatePath = true, ...csvOptions } = options;
    
    // Validate file path if requested
    if (validatePath) {
      validateFilePath(filePath);
    }
    
    // Convert data to CSV
    const csv = jsonToCsv(data, csvOptions);
    
    // Write to file (simplified - in real implementation would use fs module)
    // This is a placeholder for the actual file writing logic
    throw new Error('File system operations not implemented in this version');
  }, 'FILE_SYSTEM_ERROR', { function: 'saveAsCsv' });
}

/**
 * Asynchronous version of saveAsCsv
 */
export async function saveAsCsvAsync(
  data: AnyArray,
  filePath: string,
  options: JsonToCsvOptions & { validatePath?: boolean } = {}
): Promise<void> {
  return safeExecuteAsync(async () => {
    const { validatePath = true, ...csvOptions } = options;
    
    // Validate file path if requested
    if (validatePath) {
      validateFilePath(filePath);
    }
    
    // Convert data to CSV asynchronously
    const csv = await jsonToCsvAsync(data, csvOptions);
    
    // Write to file asynchronously (simplified - in real implementation would use fs module)
    // This is a placeholder for the actual file writing logic
    throw new Error('File system operations not implemented in this version');
  }, 'FILE_SYSTEM_ERROR', { function: 'saveAsCsvAsync' });
}

// Export types
export type {
  JsonToCsvOptions,
  AsyncJsonToCsvOptions,
  SaveAsCsvOptions
} from './src/types';

// Default export
export default {
  jsonToCsv,
  jsonToCsvAsync,
  preprocessData,
  deepUnwrap,
  validateFilePath,
  saveAsCsv,
  saveAsCsvAsync
};
