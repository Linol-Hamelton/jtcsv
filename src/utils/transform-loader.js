/**
 * Transform Loader Utility
 * 
 * Utility for loading and applying transform functions from JavaScript files
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  ValidationError,
  SecurityError,
  ConfigurationError
} = require('../errors');

/**
 * Validates transform function
 * @private
 */
function validateTransformFunction(fn) {
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
 * @param {string} transformPath - Path to JavaScript file with transform function
 * @returns {Function} Transform function
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
function loadTransform(transformPath) {
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
    const transformFn = context.module.exports || context.exports;
    
    // Handle default export for ES6 modules
    const finalTransform = transformFn.default || transformFn;
    
    // Validate the transform function
    validateTransformFunction(finalTransform);
    
    return finalTransform;
  } catch (error) {
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
 * @param {string|Function} transform - Transform function or path to transform file
 * @returns {Function} Transform hook function
 */
function createTransformHook(transform) {
  let transformFn;
  
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
  return function (row, index, context) {
    try {
      return transformFn(row, index);
    } catch (error) {
      // Log error but don't crash - return original row
      console.error(`Transform error at row ${index}: ${error.message}`);
      if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
      }
      return row;
    }
  };
}

/**
 * Applies transform to data array
 * 
 * @param {Array} data - Array of data to transform
 * @param {string|Function} transform - Transform function or path to transform file
 * @returns {Array} Transformed data
 */
function applyTransform(data, transform) {
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
 * @param {string|Function} transform - Transform function or path to transform file
 * @returns {TransformHooks} TransformHooks instance
 */
function createTransformHooksWithTransform(transform) {
  const { TransformHooks } = require('../core/transform-hooks');
  const hooks = new TransformHooks();
  
  const transformHook = createTransformHook(transform);
  hooks.perRow(transformHook);
  
  return hooks;
}

module.exports = {
  loadTransform,
  createTransformHook,
  applyTransform,
  createTransformHooksWithTransform,
  validateTransformFunction
};