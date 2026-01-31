/**
 * JSON Save Module - TypeScript Module
 * 
 * A lightweight module for saving JSON data to files with security validation.
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

import { SaveAsJsonOptions, AnyObject, AnyArray } from './src/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validates file path for JSON saving
 * @private
 */
export function validateJsonFilePath(filePath: string): string {
  // Basic validation
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new ValidationError('File path must be a non-empty string');
  }

  // Ensure file has .json extension
  if (!filePath.toLowerCase().endsWith('.json')) {
    throw new ValidationError('File must have .json extension');
  }

  // Block UNC paths BEFORE path.resolve() to avoid network lookup timeouts
  if (filePath.startsWith('\\\\') || filePath.startsWith('//')) {
    throw new SecurityError('UNC paths are not allowed');
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
function validateJsonData(data: any, options?: SaveAsJsonOptions): boolean {
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
 * @param data - Data to save as JSON
 * @param filePath - Path to save the JSON file
 * @param options - Configuration options
 * @returns Promise<void>
 * 
 * @example
 * const { saveAsJson } = require('./json-save');
 * 
 * const data = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
 * await saveAsJson(data, './output.json', { prettyPrint: true });
 */
export async function saveAsJson(
  data: any,
  filePath: string,
  options: SaveAsJsonOptions = {}
): Promise<string> {
  return safeExecuteAsync(async () => {
    // Validate inputs
    const safeOptions = options === null ? {} : options;
    validateJsonData(data, safeOptions);
    const absolutePath = validateJsonFilePath(filePath);
    
    const {
      prettyPrint = false,
      maxSize = 10485760 // 10MB default
    } = safeOptions;
    
    // Convert data to JSON string
    let jsonString: string;
    try {
      jsonString = prettyPrint
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);
    } catch (error: any) {
      const message = error?.message ? String(error.message) : 'Unknown error';
      if (message.toLowerCase().includes('circular')) {
        throw new ValidationError('JSON contains circular references');
      }
      throw new ValidationError(`Failed to stringify JSON: ${message}`);
    }
    
    // Check size limit
    const byteLength = Buffer.byteLength(jsonString, 'utf8');
    if (byteLength > maxSize) {
      throw new LimitError(
        `JSON size exceeds maximum limit of ${maxSize} bytes`,
        maxSize,
        byteLength
      );
    }
    
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    try {
      await fs.promises.writeFile(absolutePath, jsonString, 'utf8');
    } catch (error: any) {
      if (error?.code === 'EACCES') {
        throw new FileSystemError('Permission denied', error);
      }
      if (error?.code === 'ENOENT') {
        throw new FileSystemError('Directory does not exist', error);
      }
      if (error?.code === 'ENOSPC') {
        throw new FileSystemError('No space left on device', error);
      }
      throw new FileSystemError(`Failed to write JSON file: ${error?.message || 'unknown error'}`, error);
    }

    return absolutePath;
  }, 'FILE_SYSTEM_ERROR', { function: 'saveAsJson' });
}

/**
 * Synchronous version of saveAsJson
 * 
 * @param data - Data to save as JSON
 * @param filePath - Path to save the JSON file
 * @param options - Configuration options
 * @returns void
 * 
 * @example
 * const { saveAsJsonSync } = require('./json-save');
 * 
 * const data = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
 * saveAsJsonSync(data, './output.json', { prettyPrint: true });
 */
export function saveAsJsonSync(
  data: any,
  filePath: string,
  options: SaveAsJsonOptions = {}
): string {
  return safeExecuteSync(() => {
    // Validate inputs
    const safeOptions = options === null ? {} : options;
    validateJsonData(data, safeOptions);
    const absolutePath = validateJsonFilePath(filePath);
    
    const {
      prettyPrint = false,
      maxSize = 10485760 // 10MB default
    } = safeOptions;
    
    // Convert data to JSON string
    let jsonString: string;
    try {
      jsonString = prettyPrint
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);
    } catch (error: any) {
      const message = error?.message ? String(error.message) : 'Unknown error';
      if (message.toLowerCase().includes('circular')) {
        throw new ValidationError('JSON contains circular references');
      }
      throw new ValidationError(`Failed to stringify JSON: ${message}`);
    }
    
    // Check size limit
    const byteLength = Buffer.byteLength(jsonString, 'utf8');
    if (byteLength > maxSize) {
      throw new LimitError(
        `JSON size exceeds maximum limit of ${maxSize} bytes`,
        maxSize,
        byteLength
      );
    }
    
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    try {
      fs.writeFileSync(absolutePath, jsonString, 'utf8');
    } catch (error: any) {
      if (error?.code === 'EACCES') {
        throw new FileSystemError('Permission denied', error);
      }
      if (error?.code === 'ENOENT') {
        throw new FileSystemError('Directory does not exist', error);
      }
      if (error?.code === 'ENOSPC') {
        throw new FileSystemError('No space left on device', error);
      }
      throw new FileSystemError(`Failed to write JSON file: ${error?.message || 'unknown error'}`, error);
    }

    return absolutePath;
  }, 'FILE_SYSTEM_ERROR', { function: 'saveAsJsonSync' });
}

/**
 * Asynchronous version with worker thread support for large datasets
 * 
 * @param data - Data to save as JSON
 * @param filePath - Path to save the JSON file
 * @param options - Configuration options with worker support
 * @returns Promise<void>
 */
export async function saveAsJsonAsync(
  data: any,
  filePath: string,
  options: SaveAsJsonOptions & {
    useWorkers?: boolean;
    workerCount?: number;
    chunkSize?: number;
    onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
  } = {}
): Promise<void> {
  return safeExecuteAsync(async () => {
    const { useWorkers = false, workerCount, chunkSize, onProgress, ...saveOptions } = options;
    
    // For now, use the standard async version
    // TODO: Implement worker thread support for large datasets
    await saveAsJson(data, filePath, saveOptions);
  }, 'FILE_SYSTEM_ERROR', { function: 'saveAsJsonAsync' });
}

/**
 * Validates if a file path is safe for JSON saving
 * 
 * @param filePath - File path to validate
 * @returns Validation result with details
 */
export function validateFilePath(filePath: string): {
  isValid: boolean;
  absolutePath?: string;
  error?: string;
  errorCode?: string;
} {
  try {
    const absolutePath = validateJsonFilePath(filePath);
    return {
      isValid: true,
      absolutePath
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message,
      errorCode: error.code || 'VALIDATION_ERROR'
    };
  }
}

/**
 * Estimates the size of JSON data in bytes
 * 
 * @param data - Data to estimate size for
 * @param options - Options for pretty printing
 * @returns Estimated size in bytes
 */
export function estimateJsonSize(
  data: any,
  options: { prettyPrint?: boolean } = {}
): number {
  const { prettyPrint = false } = options;
  
  const jsonString = prettyPrint 
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
  
  return Buffer.byteLength(jsonString, 'utf8');
}

/**
 * Creates a JSON file with proper error handling
 * 
 * @param data - Data to save
 * @param filePath - Path to save
 * @param options - Save options
 * @returns Promise with result object
 */
export async function createJsonFile(
  data: any,
  filePath: string,
  options: SaveAsJsonOptions = {}
): Promise<{
  success: boolean;
  filePath: string;
  size: number;
  error?: Error;
}> {
  try {
    await saveAsJson(data, filePath, options);
    const size = estimateJsonSize(data, options);
    
    return {
      success: true,
      filePath,
      size
    };
  } catch (error: any) {
    return {
      success: false,
      filePath,
      size: 0,
      error
    };
  }
}

/**
 * Batch save multiple JSON files
 * 
 * @param files - Array of file definitions
 * @param options - Common options for all files
 * @returns Promise with results
 */
export async function saveJsonFiles(
  files: Array<{
    data: any;
    filePath: string;
    options?: SaveAsJsonOptions;
  }>,
  commonOptions: SaveAsJsonOptions = {}
): Promise<Array<{
  success: boolean;
  filePath: string;
  size: number;
  error?: Error;
}>> {
  const results = [];
  
  for (const file of files) {
    const options = { ...commonOptions, ...file.options };
    const result = await createJsonFile(file.data, file.filePath, options);
    results.push(result);
  }
  
  return results;
}
