/**
 * Zod adapter for JTCSV schema validation.
 * 
 * Provides integration with Zod schemas for CSV validation.
 * 
 * @example
 * const { z } = require('zod');
 * const { createZodValidationHook } = require('./zod-adapter');
 * 
 * const schema = z.object({
 *   name: z.string().min(1),
 *   age: z.number().int().min(0).max(150),
 *   email: z.string().email()
 * });
 * 
 * const validationHook = createZodValidationHook(schema);
 * 
 * // Use with csvToJson
 * const data = await csvToJson(csv, {
 *   hooks: { perRow: validationHook }
 * });
 */

const { ValidationError } = require('../errors');

/**
 * Creates a validation hook from a Zod schema.
 * 
 * @param {import('zod').ZodSchema} zodSchema - Zod schema instance
 * @param {Object} options - Validation options
 * @param {boolean} options.coerce - Whether to coerce values according to Zod's coerce (default: true)
 * @param {string} options.mode - 'strict' (throw on first error) or 'collect' (collect all errors)
 * @returns {Function} Validation hook compatible with JTCSV hooks.perRow
 */
function createZodValidationHook(zodSchema, options = {}) {
  const { coerce = true, mode = 'strict' } = options;
  
  // Check if Zod is available
  let zod;
  try {
    zod = require('zod');
  } catch (error) {
    throw new Error(
      'Zod is not installed. Please install zod: npm install zod'
    );
  }
  
  // Ensure the passed schema is a Zod schema
  if (!zodSchema || typeof zodSchema.safeParse !== 'function') {
    throw new ValidationError('Provided schema is not a valid Zod schema');
  }
  
  // Return hook function
  return function(row, index, context) {
    try {
      const result = zodSchema.safeParse(row);
      
      if (!result.success) {
        const errors = result.error.errors;
        const firstError = errors[0];
        const path = firstError.path.join('.');
        const message = firstError.message;
        
        if (mode === 'strict') {
          throw new ValidationError(
            `Row ${index + 1}: ${path ? `Field "${path}": ` : ''}${message}`
          );
        } else {
          // In collect mode, we attach errors to row metadata
          // For simplicity, we still throw but could be extended
          console.warn(`Row ${index + 1}: ${path ? `Field "${path}": ` : ''}${message}`);
          return row;
        }
      }
      
      // Return validated (and possibly coerced) data
      return result.data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Unexpected error - log and return original row
      console.error(`Zod validation error at row ${index}: ${error.message}`);
      if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
      }
      return row;
    }
  };
}

/**
 * Creates a Yup validation hook.
 * 
 * @param {import('yup').Schema} yupSchema - Yup schema instance
 * @param {Object} options - Validation options
 * @returns {Function} Validation hook
 */
function createYupValidationHook(yupSchema, options = {}) {
  const { abortEarly = false, stripUnknown = true } = options;
  
  // Check if Yup is available
  let yup;
  try {
    yup = require('yup');
  } catch (error) {
    throw new Error(
      'Yup is not installed. Please install yup: npm install yup'
    );
  }
  
  if (!yupSchema || typeof yupSchema.validate !== 'function') {
    throw new ValidationError('Provided schema is not a valid Yup schema');
  }
  
  return async function(row, index, context) {
    try {
      const validated = await yupSchema.validate(row, { abortEarly, stripUnknown });
      return validated;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ValidationError(`Row ${index + 1}: ${error.message}`);
      }
      console.error(`Yup validation error at row ${index}: ${error.message}`);
      return row;
    }
  };
}

/**
 * Higher-order function that creates a csvToJson wrapper with schema validation.
 * 
 * @param {import('zod').ZodSchema|import('yup').Schema} schema - Zod or Yup schema
 * @param {Object} adapterOptions - Adapter-specific options
 * @returns {Function} Function that takes csv and options, returns validated data
 */
function createValidatedParser(schema, adapterOptions = {}) {
  const { library = 'zod', ...options } = adapterOptions;
  
  let validationHook;
  if (library === 'zod') {
    validationHook = createZodValidationHook(schema, options);
  } else if (library === 'yup') {
    validationHook = createYupValidationHook(schema, options);
  } else {
    throw new ValidationError(`Unsupported validation library: ${library}`);
  }
  
  return async function(csv, parseOptions = {}) {
    const { csvToJson } = require('../index');
    const hooks = parseOptions.hooks || {};
    // Merge validation hook with existing perRow hook
    const existingPerRow = hooks.perRow;
    hooks.perRow = function(row, index, context) {
      let validated = row;
      if (existingPerRow) {
        validated = existingPerRow(validated, index, context);
      }
      return validationHook(validated, index, context);
    };
    
    return csvToJson(csv, { ...parseOptions, hooks });
  };
}

module.exports = {
  createZodValidationHook,
  createYupValidationHook,
  createValidatedParser
};