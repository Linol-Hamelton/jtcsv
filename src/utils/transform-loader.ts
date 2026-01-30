/**
 * Transform Loader Utility
 * 
 * Utility for loading and applying transform functions from JavaScript files
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as vm from 'vm';
import {
  ValidationError,
  SecurityError,
  ConfigurationError
} from '../errors';

/**
 * Validates transform function
 */
function validateTransformFunction(fn: Function): boolean {
  if (typeof fn !== 'function') {
    throw new ValidationError('Transform must export a function');
  }
  
  // Check function arity (should accept 1-2 parameters)
  const functionString = fn.toString();
  const paramMatch = functionString.match(/\(([^)]*)\)/);
  if (paramMatch) {
    const params = paramMatch[1].split(',').map(p => p.trim()).filter(p => p);
    if (params.length === 0 || params.length > 2) {
      throw new ValidationError('Transform function should accept 1-2 parameters: (row, index)');
    }
  }
  
  return true;
}

/**
 * Loads transform function from a JavaScript file
 * 
 * @param transformPath - Path to JavaScript file with transform function
 * @returns Transform function
 * 
 * @example
 * // transform.js
 * module.exports = function(row, index) {
 *   return { ...row, processed: true, index };
 * };
 * 
 * // Usage
 * const transform = loadTransform('./transform.js');
 * const result = transform({ id: 1, name: 'John' }, 0);
 */
export function loadTransform(transformPath: string): Function {
  if (!transformPath || typeof transformPath !== 'string') {
    throw new ValidationError('Transform path must be a string');
  }
  
  // Validate file path
  const safePath = path.resolve(transformPath);
  
  // Prevent directory traversal
  const normalizedPath = path.normalize(transformPath);
  if (normalizedPath.includes('..') || 
      /\\\.\.\\|\/\.\.\//.test(transformPath) ||
      transformPath.startsWith('..') ||
      transformPath.includes('/..')) {
    throw new SecurityError('Directory traversal detected in transform file path');
  }
  
  // Check file exists and has .js extension
  if (!fs.existsSync(safePath)) {
    throw new ValidationError(`Transform file not found: ${transformPath}`);
  }
  
  if (!safePath.toLowerCase().endsWith('.js')) {
    throw new ValidationError('Transform file must have .js extension');
  }
  
  try {
    // Read and evaluate the transform file in a safe context
    const transformCode = fs.readFileSync(safePath, 'utf8');
    
    // Create a safe context with limited access
    const sandbox = {
      console,
      require,
      module: { exports: {} },
      exports: {},
      __filename: safePath,
      __dirname: path.dirname(safePath),
      Buffer,
      process: {
        env: process.env,
        cwd: process.cwd,
        platform: process.platform
      }
    };
    
    // Create a context and run the code
    const context = vm.createContext(sandbox);
    const script = new vm.Script(transformCode, { filename: safePath });
    script.runInContext(context);
    
    // Get the exported function
    const transformFn = (context as any).module.exports || (context as any).exports;
    
    // Handle default export for ES6 modules
    const finalTransform = transformFn.default || transformFn;
    
    // Validate the transform function
    validateTransformFunction(finalTransform);
    
    return finalTransform;
  } catch (error: any) {
    if (error instanceof ValidationError || error instanceof SecurityError) {
      throw error;
    }
    
    if (error.code === 'EACCES') {
      throw new SecurityError(`Permission denied reading transform file: ${transformPath}`);
    }
    
    throw new ValidationError(`Failed to load transform function: ${error.message}`);
  }
}

/**
 * Creates a transform hook for use with csvToJson/jsonToCsv hooks system
 * 
 * @param transform - Transform function or path to transform file
 * @returns Transform hook function
 */
export function createTransformHook(transform: string | Function): (row: any, index: number, context: any) => any {
  let transformFn: Function;
  
  if (typeof transform === 'string') {
    // Load transform from file
    transformFn = loadTransform(transform);
  } else if (typeof transform === 'function') {
    // Use provided function
    validateTransformFunction(transform);
    transformFn = transform;
  } else {
    throw new ValidationError('Transform must be a function or a path to a JavaScript file');
  }
  
  // Return a hook function compatible with hooks.perRow
  return function (row: any, index: number, context: any): any {
    try {
      return transformFn(row, index);
    } catch (error: any) {
      // Log error but don't crash - return original row
      console.error(`Transform error at row ${index}: ${error.message}`);
      if (process.env['NODE_ENV'] === 'development') {
        console.error(error.stack);
      }
      return row;
    }
  };
}

/**
 * Applies transform to data array
 * 
 * @param data - Array of data to transform
 * @param transform - Transform function or path to transform file
 * @returns Transformed data
 */
export function applyTransform(data: any[], transform: string | Function): any[] {
  if (!Array.isArray(data)) {
    throw new ValidationError('Data must be an array');
  }
  
  const transformHook = createTransformHook(transform);
  
  return data.map((row, index) => {
    return transformHook(row, index, { operation: 'applyTransform' });
  });
}

/**
 * Creates a TransformHooks instance with transform function
 * 
 * @param transform - Transform function or path to transform file
 * @returns TransformHooks instance
 */
export function createTransformHooksWithTransform(transform: string | Function): any {
  const { TransformHooks } = require('../core/transform-hooks');
  const hooks = new TransformHooks();
  
  const transformHook = createTransformHook(transform);
  hooks.perRow(transformHook);
  
  return hooks;
}

/**
 * Async version of loadTransform that reads file asynchronously
 * 
 * @param transformPath - Path to JavaScript file with transform function
 * @returns Promise with transform function
 */
export async function loadTransformAsync(transformPath: string): Promise<Function> {
  if (!transformPath || typeof transformPath !== 'string') {
    throw new ValidationError('Transform path must be a string');
  }
  
  // Validate file path
  const safePath = path.resolve(transformPath);
  
  // Prevent directory traversal
  const normalizedPath = path.normalize(transformPath);
  if (normalizedPath.includes('..') || 
      /\\\.\.\\|\/\.\.\//.test(transformPath) ||
      transformPath.startsWith('..') ||
      transformPath.includes('/..')) {
    throw new SecurityError('Directory traversal detected in transform file path');
  }
  
  // Check file exists and has .js extension
  try {
    await fsPromises.access(safePath);
  } catch {
    throw new ValidationError(`Transform file not found: ${transformPath}`);
  }
  
  if (!safePath.toLowerCase().endsWith('.js')) {
    throw new ValidationError('Transform file must have .js extension');
  }
  
  try {
    // Read and evaluate the transform file in a safe context
    const transformCode = await fsPromises.readFile(safePath, 'utf8');
    
    // Create a safe context with limited access
    const sandbox = {
      console,
      require,
      module: { exports: {} },
      exports: {},
      __filename: safePath,
      __dirname: path.dirname(safePath),
      Buffer,
      process: {
        env: process.env,
        cwd: process.cwd,
        platform: process.platform
      }
    };
    
    // Create a context and run the code
    const context = vm.createContext(sandbox);
    const script = new vm.Script(transformCode, { filename: safePath });
    script.runInContext(context);
    
    // Get the exported function
    const transformFn = (context as any).module.exports || (context as any).exports;
    
    // Handle default export for ES6 modules
    const finalTransform = transformFn.default || transformFn;
    
    // Validate the transform function
    validateTransformFunction(finalTransform);
    
    return finalTransform;
  } catch (error: any) {
    if (error instanceof ValidationError || error instanceof SecurityError) {
      throw error;
    }
    
    if (error.code === 'EACCES') {
      throw new SecurityError(`Permission denied reading transform file: ${transformPath}`);
    }
    
    throw new ValidationError(`Failed to load transform function: ${error.message}`);
  }
}

/**
 * Async version of applyTransform that uses worker threads for parallel transformation
 * 
 * @param data - Array of data to transform
 * @param transform - Transform function or path to transform file
 * @returns Promise with transformed data
 */
export async function applyTransformAsync(data: any[], transform: string | Function): Promise<any[]> {
  if (!Array.isArray(data)) {
    throw new ValidationError('Data must be an array');
  }
  
  // For large datasets, use worker pool
  if (data.length > 1000) {
    const { createWorkerPool } = require('../workers/worker-pool');
    const pool = createWorkerPool({
      workerCount: Math.min(4, require('os').cpus().length),
      workerScript: require.resolve('./transform-worker.js')
    });
    
    try {
      // Load transform function
      const transformFn = typeof transform === 'string' 
        ? await loadTransformAsync(transform)
        : transform;
      
      // Execute transforms in parallel
      const transformPromises = data.map((row, index) => 
        pool.execute({ row, index, transform: transformFn.toString() })
      );
      
      const results = await Promise.all(transformPromises);
      return results.map(result => result.transformedRow);
    } finally {
      await pool.terminate();
    }
  }
  
  // For small datasets, transform synchronously
  return applyTransform(data, transform);
}

/**
 * Creates an async transform hook that can be used with async hooks
 * 
 * @param transform - Transform function or path to transform file
 * @returns Async transform hook function
 */
export function createAsyncTransformHook(transform: string | Function): (row: any, index: number, context: any) => Promise<any> {
  const syncHook = createTransformHook(transform);
  
  return async function (row: any, index: number, context: any): Promise<any> {
    return Promise.resolve(syncHook(row, index, context));
  };
}

/**
 * Validates that a transform function can be safely executed
 * 
 * @param transformFn - Transform function to validate
 * @returns Validation result
 */
export function validateTransformSafety(transformFn: Function): { safe: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for dangerous patterns
  const functionString = transformFn.toString().toLowerCase();
  
  const dangerousPatterns = [
    'eval(',
    'new function',
    'settimeout',
    'setinterval',
    'process.exit',
    'require(',
    'fs.',
    'child_process',
    'exec(',
    'spawn(',
    'vm.run'
  ];
  
  for (const pattern of dangerousPatterns) {
    if (functionString.includes(pattern)) {
      issues.push(`Potentially dangerous pattern detected: ${pattern}`);
    }
  }
  
  // Check for infinite loops
  if (functionString.includes('while(true)') || functionString.includes('for(;;)')) {
    issues.push('Potential infinite loop detected');
  }
  
  return {
    safe: issues.length === 0,
    issues
  };
}

export default {
  loadTransform,
  loadTransformAsync,
  createTransformHook,
  createAsyncTransformHook,
  applyTransform,
  applyTransformAsync,
  createTransformHooksWithTransform,
  validateTransformFunction,
  validateTransformSafety
};