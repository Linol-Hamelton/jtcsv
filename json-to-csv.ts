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
  JtcsvError,
  LimitError,
  ConfigurationError,
  safeExecuteSync,
  safeExecuteAsync,
  ErrorCode
} from './errors';

import { createSchemaValidators } from './src/utils/schema-validator';
import type {
  AsyncJsonToCsvOptions,
  DeepUnwrapOptions,
  JsonToCsvOptions,
  PreprocessOptions,
  SaveAsCsvOptions
} from './src/types';

type SchemaValidator = {
  validate?: (value: any) => boolean;
  format?: (value: any) => any;
};

/**
 * Validates input data and options
 * @private
 */
function validateInput(data: any[], options?: JsonToCsvOptions) {
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

  if (options?.memoryWarningThreshold !== undefined) {
    if (typeof options.memoryWarningThreshold !== 'number' || options.memoryWarningThreshold <= 0) {
      throw new ConfigurationError('memoryWarningThreshold must be a positive number');
    }
  }

  if (options?.memoryLimit !== undefined) {
    if (typeof options.memoryLimit !== 'number') {
      throw new ConfigurationError('memoryLimit must be a number');
    }
    if (options.memoryLimit !== Infinity && options.memoryLimit <= 0) {
      throw new ConfigurationError('memoryLimit must be a positive number or Infinity');
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
  
  if (options?.normalizeQuotes !== undefined && typeof options.normalizeQuotes !== 'boolean') {
    throw new ConfigurationError('normalizeQuotes must be a boolean');
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
  data: any[],
  options: PreprocessOptions = {}
) {
  const {
    flatten = false,
    flattenSeparator = '.',
    flattenMaxDepth = 3,
    arrayHandling = 'join'
  } = options;
  
  if (!Array.isArray(data)) {
    return [];
  }
  
  const processed = [];
  const fastPath = !flatten && arrayHandling === 'join';
  
  for (const item of data) {
    if (!item || typeof item !== 'object') {
      processed.push({});
      continue;
    }
    if (fastPath) {
      let hasComplex = false;
      let hasNullish = false;
      for (const key in item) {
        if (!Object.prototype.hasOwnProperty.call(item, key)) {
          continue;
        }
        const value = item[key];
        if (value === null || value === undefined) {
          hasNullish = true;
          continue;
        }
        if (typeof value === 'object') {
          hasComplex = true;
          break;
        }
      }

      if (!hasComplex && !hasNullish) {
        processed.push(item);
        continue;
      }

      const processedItem = {};
      for (const key in item) {
        if (!Object.prototype.hasOwnProperty.call(item, key)) {
          continue;
        }
        const value = item[key];
        if (value === null || value === undefined) {
          processedItem[key] = '';
        } else if (typeof value === 'object') {
          processedItem[key] = deepUnwrap(value);
        } else {
          processedItem[key] = value;
        }
      }
      processed.push(processedItem);
      continue;
    }
    let processedItem = { ...item };
      
    // Handle flattening if enabled
    if (flatten) {
      processedItem = flattenObject(item, flattenSeparator, flattenMaxDepth);
    }
      
    // Handle arrays based on arrayHandling option
    processedItem = processArrays(processedItem, arrayHandling);

    // Unwrap nested objects into strings
    for (const [key, value] of Object.entries(processedItem)) {
      if (value && typeof value === 'object') {
        processedItem[key] = deepUnwrap(value);
      } else if (value === null || value === undefined) {
        processedItem[key] = '';
      } else {
        processedItem[key] = value;
      }
    }
      
    processed.push(processedItem);
  }
  
  return processed;
}

/**
 * Flattens a nested object into dot notation
 */
function flattenObject(
  obj,
  separator = '.',
  maxDepth = 3,
  currentDepth = 0,
  prefix = ''
) {
  if (currentDepth >= maxDepth) {
    return { [prefix || 'value']: obj };
  }
  
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nestedFlattened = flattenObject(
        value,
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
function processArrays(obj, arrayHandling) {
  const processed = { ...obj };
  
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
  value: any,
  depthOrOptions: number | DeepUnwrapOptions = 0,
  maxDepthParam: number = 10
) {
  let currentDepth = 0;
  let maxDepth = 10;
  let preserveArrays = false;

  if (depthOrOptions && typeof depthOrOptions === 'object') {
    maxDepth = typeof depthOrOptions.maxDepth === 'number' ? depthOrOptions.maxDepth : maxDepth;
    preserveArrays = Boolean(depthOrOptions.preserveArrays);
  } else {
    currentDepth = typeof depthOrOptions === 'number' ? depthOrOptions : 0;
    maxDepth = typeof maxDepthParam === 'number' ? maxDepthParam : maxDepth;
  }

  return unwrapRecursive(value, currentDepth, maxDepth, preserveArrays, new WeakSet());
}

function unwrapRecursive(
  value,
  currentDepth,
  maxDepth,
  preserveArrays,
  seen
) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular Reference]';
    }
    if (currentDepth >= maxDepth) {
      return '[Too Deep]';
    }
    if (value.length === 0) {
      return '';
    }
    seen.add(value);
    if (preserveArrays) {
      try {
        return value.map(item => unwrapRecursive(item, currentDepth + 1, maxDepth, preserveArrays, seen));
      } finally {
        seen.delete(value);
      }
    }
    try {
      const parts = value.map(item => unwrapRecursive(item, currentDepth + 1, maxDepth, preserveArrays, seen));
      return parts.join(', ');
    } finally {
      seen.delete(value);
    }
  }

  if (typeof value === 'object') {
    if (currentDepth >= maxDepth) {
      return '[Too Deep]';
    }
    if (Object.keys(value).length === 0) {
      return '';
    }
    if (seen.has(value)) {
      return '[Circular Reference]';
    }
    seen.add(value);
    try {
      return JSON.stringify(value);
    } catch (error) {
      const message = error?.message ? String(error.message) : '';
      if (message.toLowerCase().includes('circular')) {
        return '[Circular Reference]';
      }
      return '[Unstringifiable Object]';
    } finally {
      seen.delete(value);
    }
  }

  return String(value);
}

/**
 * Validates file path for security
 */
export function validateFilePath(filePath: string, options: { allowRelative?: boolean } = {}) {
  const { allowRelative = true } = options;
  
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new ValidationError('File path must be a non-empty string');
  }
  
  const normalized = filePath.trim();

  // Check for null bytes
  if (normalized.includes('\0')) {
    throw new SecurityError('File path contains null byte');
  }
  
  // Check for directory traversal
  const traversalPattern = /(^|[\\/])\.\.([\\/]|$)/;
  const pathsToCheck = [normalized];
  try {
    const decodedOnce = decodeURIComponent(normalized);
    pathsToCheck.push(decodedOnce);
    try {
      pathsToCheck.push(decodeURIComponent(decodedOnce));
    } catch {
      // ignore double decode failures
    }
  } catch {
    // ignore decode failures
  }
  for (const candidate of pathsToCheck) {
    if (candidate.includes('..') || traversalPattern.test(candidate)) {
      throw new SecurityError('Directory traversal detected in file path');
    }
  }
  if (!allowRelative && (normalized.startsWith('./') || normalized.startsWith('.\\'))) {
    throw new SecurityError('Relative file paths are not allowed');
  }

  // Block UNC/network paths on Windows to avoid remote access/hangs
  if (process.platform === 'win32') {
    const normalizedWin = normalized.replace(/\//g, '\\');
    if (normalizedWin.startsWith('\\\\')) {
      if (!normalizedWin.toLowerCase().startsWith('\\\\?\\')) {
        throw new SecurityError('UNC paths are not allowed');
      }
      if (normalizedWin.toLowerCase().startsWith('\\\\?\\unc\\')) {
        throw new SecurityError('UNC paths are not allowed');
      }
    }
  }

  const ext = require('path').extname(normalized);
  if (!ext || ext.toLowerCase() !== '.csv') {
    throw new ValidationError('File must have .csv extension');
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
  data: any[],
  options: JsonToCsvOptions = {}
) {
  return safeExecuteSync(() => {
    // Validate input
    validateInput(data, options);
    
    const opts: JsonToCsvOptions = options && typeof options === 'object' ? options : {};
    
    const {
      delimiter = ';',
      includeHeaders = true,
      renameMap = {},
      template = {},
      maxRecords,
      preventCsvInjection = true,
      rfc4180Compliant = true,
      normalizeQuotes = true,
      schema = null,
      flatten = false,
      flattenSeparator = '.',
      flattenMaxDepth = 3,
      arrayHandling = 'stringify',
      memoryWarningThreshold = 1000000,
      memoryLimit = 5000000
    } = opts;
    
    // Initialize schema validators if schema is provided
    let schemaValidators: Record<string, SchemaValidator> | null = null;
    if (schema) {
      schemaValidators = createSchemaValidators(schema) as Record<string, SchemaValidator>;
    }
    
    // Handle empty data
    if (data.length === 0) {
      return '';
    }
    
    if (Number.isFinite(memoryLimit) && data.length > memoryLimit) {
      throw new LimitError(
        `Data size exceeds memory safety limit of ${memoryLimit} records`,
        memoryLimit,
        data.length
      );
    }

    // Show warning for large datasets
    if (memoryWarningThreshold
      && data.length > memoryWarningThreshold
      && process.env['NODE_ENV'] !== 'test') {
      console.warn(
        'Warning: Large in-memory conversion detected.\n' +
        'Consider using streaming or batching for big datasets.\n' +
        'Current size: ' + data.length.toLocaleString() + ' records\n' +
        'Tip: Increase memoryLimit or set memoryLimit: Infinity to override.'
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

    if (schemaValidators && Object.keys(schemaValidators).length > 0) {
      for (let i = 0; i < processedData.length; i++) {
        const row = processedData[i];
        if (!row || typeof row !== 'object') {
          continue;
        }
        for (const [field, validator] of Object.entries(schemaValidators)) {
          const typedValidator = validator as SchemaValidator;
          const value = row[field];
          if (typeof typedValidator.validate === 'function' && !typedValidator.validate(value)) {
            throw new ValidationError(`Invalid value for field "${field}"`);
          }
          if (typeof typedValidator.format === 'function') {
            row[field] = typedValidator.format(value);
          }
        }
      }
    }
    
    // Get all unique keys from all objects with minimal allocations.
    const allKeys = new Set();
    const originalKeys = [];
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

    const phoneKeys = new Set(['phone', 'phonenumber', 'phone_number', 'tel', 'telephone']);

    const normalizeQuotesInField = (value: string): string => {
      // Не нормализуем кавычки в JSON-строках - это ломает структуру JSON
      // Проверяем, выглядит ли значение как JSON
      if ((value.startsWith('{') && value.endsWith('}')) ||
          (value.startsWith('[') && value.endsWith(']'))) {
        return value; // Возвращаем как есть для JSON
      }
      
      let normalized = value.replace(/"{2,}/g, '"');
      // Убираем правило, которое ломает JSON: не заменяем "," на ","
      // normalized = normalized.replace(/"\s*,\s*"/g, ',');
      normalized = normalized.replace(/"\n/g, '\n').replace(/\n"/g, '\n');
      if (normalized.length >= 2 && normalized.startsWith('"') && normalized.endsWith('"')) {
        normalized = normalized.slice(1, -1);
      }
      return normalized;
    };

    const normalizePhoneValue = (value: string): string => {
      const trimmed = value.trim();
      if (trimmed === '') {
        return trimmed;
      }
      return trimmed.replace(/["'\\]/g, '');
    };

    const normalizeValueForCsv = (value: any, key?: string) => {
      if (!normalizeQuotes || typeof value !== 'string') {
        return value;
      }
      const base = normalizeQuotesInField(value);
      if (key && phoneKeys.has(String(key).toLowerCase())) {
        return normalizePhoneValue(base);
      }
      return base;
    };
    
    /**
     * Escapes a value for CSV format with CSV injection protection
     */
    const quoteRegex = /"/g;
    const delimiterCode = delimiter.charCodeAt(0);
    const isPotentialFormula = (value) => {
      let idx = 0;
      while (idx < value.length) {
        const code = value.charCodeAt(idx);
        if (code === 32 || code === 9 || code === 10 || code === 13 || code === 0xfeff) {
          idx++;
          continue;
        }
        break;
      }
      if (idx < value.length && (value[idx] === '"' || value[idx] === "'")) {
        idx++;
        while (idx < value.length) {
          const code = value.charCodeAt(idx);
          if (code === 32 || code === 9) {
            idx++;
            continue;
          }
          break;
        }
      }
      if (idx >= value.length) {
        return false;
      }
      const char = value[idx];
      return char === '=' || char === '+' || char === '-' || char === '@';
    };
    
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
        if (isPotentialFormula(stringValue)) {
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
    const rows = [];
    
    // Add headers row if requested
    if (includeHeaders) {
      const headerRow = finalHeaders.map(header => escapeValue(header)).join(delimiter);
      rows.push(headerRow);
    }
    
    // Process each data row
    for (let i = 0; i < processedData.length; i++) {
      const item = processedData[i];
      const rowValues = [];
      
      for (let j = 0; j < finalKeys.length; j++) {
        const key = finalKeys[j];
        const value = item && typeof item === 'object' ? item[key] : undefined;
        const normalized = normalizeValueForCsv(value, key);
        rowValues.push(escapeValue(normalized));
      }
      
      rows.push(rowValues.join(delimiter));
    }
    
    // Apply RFC 4180 compliance if requested
    const csv = rows.join(rfc4180Compliant ? '\r\n' : '\n');
    
    return csv;
  }, 'PARSING_ERROR', { function: 'jsonToCsv' });
}

/**
 * Asynchronous version of jsonToCsv with support for worker threads
 */
export async function jsonToCsvAsync(
  data: any[],
  options: AsyncJsonToCsvOptions = {}
) {
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
export async function saveAsCsv(
  data: any[],
  filePath: string,
  options: SaveAsCsvOptions = {}
) {
  return safeExecuteAsync(async () => {
    const { validatePath = true, ...csvOptions } = options;
    
    if (validatePath) {
      validateFilePath(filePath);
    }

    const path = require('path');
    const fs = require('fs');
    const resolvedPath = path.resolve(filePath);
    const dir = path.dirname(resolvedPath);
    
    try {
      await fs.promises.mkdir(dir, { recursive: true });
      const csv = jsonToCsv(data, csvOptions);
      await fs.promises.writeFile(resolvedPath, csv, 'utf8');
    } catch (error) {
      if (error instanceof JtcsvError) {
        throw error;
      }
      throw new FileSystemError(error.message || 'File system error', error);
    }
  }, 'FILE_SYSTEM_ERROR', { function: 'saveAsCsv' });
}

/**
 * Asynchronous version of saveAsCsv
 */
export async function saveAsCsvAsync(
  data: any[],
  filePath: string,
  options: SaveAsCsvOptions = {}
) {
  return saveAsCsv(data, filePath, options);
}

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
