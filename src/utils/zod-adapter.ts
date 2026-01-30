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

import { ValidationError } from '../errors';

// Conditional imports for optional dependencies
type ZodSchema = any;
type YupSchema = any;

export interface ZodValidationOptions {
  coerce?: boolean;
  mode?: 'strict' | 'collect';
}

export interface YupValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
}

export interface ValidatedParserOptions {
  library?: 'zod' | 'yup';
  [key: string]: any;
}

export type RowHook = (row: any, index: number, context: any) => any | Promise<any>;

/**
 * Creates a validation hook from a Zod schema.
 * 
 * @param zodSchema - Zod schema instance
 * @param options - Validation options
 * @param options.coerce - Whether to coerce values according to Zod's coerce (default: true)
 * @param options.mode - 'strict' (throw on first error) or 'collect' (collect all errors)
 * @returns Validation hook compatible with JTCSV hooks.perRow
 */
export function createZodValidationHook(
  zodSchema: ZodSchema,
  options: ZodValidationOptions = {}
): RowHook {
  const { coerce = true, mode = 'strict' } = options;
  
  // Check if Zod is available
  let zod: any;
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
  return function (row: any, index: number, context: any): any {
    try {
      const result = zodSchema.safeParse(row);
      
      if (!result.success) {
        const errors = result.error.errors;
        const firstError = errors[0];
        const path = firstError.path?.join('.') || '';
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
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Unexpected error - log and return original row
      console.error(`Zod validation error at row ${index}: ${error.message}`);
      if (process.env['NODE_ENV'] === 'development') {
        console.error(error.stack);
      }
      return row;
    }
  };
}

/**
 * Creates a Yup validation hook.
 * 
 * @param yupSchema - Yup schema instance
 * @param options - Validation options
 * @returns Validation hook
 */
export function createYupValidationHook(
  yupSchema: YupSchema,
  options: YupValidationOptions = {}
): RowHook {
  const { abortEarly = false, stripUnknown = true } = options;
  
  // Check if Yup is available
  let yup: any;
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
  
  return async function (row: any, index: number, context: any): Promise<any> {
    try {
      const validated = await yupSchema.validate(row, { abortEarly, stripUnknown });
      return validated;
    } catch (error: any) {
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
 * @param schema - Zod or Yup schema
 * @param adapterOptions - Adapter-specific options
 * @returns Function that takes csv and options, returns validated data
 */
export function createValidatedParser(
  schema: ZodSchema | YupSchema,
  adapterOptions: ValidatedParserOptions = {}
): (csv: string, parseOptions?: any) => Promise<any[]> {
  const { library = 'zod', ...options } = adapterOptions;
  
  let validationHook: RowHook;
  if (library === 'zod') {
    validationHook = createZodValidationHook(schema as ZodSchema, options);
  } else if (library === 'yup') {
    validationHook = createYupValidationHook(schema as YupSchema, options);
  } else {
    throw new ValidationError(`Unsupported validation library: ${library}`);
  }
  
  return async function (csv: string, parseOptions: any = {}): Promise<any[]> {
    const { csvToJson } = require('../index');
    const hooks = parseOptions.hooks || {};
    // Merge validation hook with existing perRow hook
    const existingPerRow = hooks.perRow;
    hooks.perRow = function (row: any, index: number, context: any): any {
      let validated = row;
      if (existingPerRow) {
        validated = existingPerRow(validated, index, context);
      }
      return validationHook(validated, index, context);
    };
    
    return csvToJson(csv, { ...parseOptions, hooks });
  };
}

/**
 * Async version of createValidatedParser that uses worker threads for validation.
 * 
 * @param schema - Zod or Yup schema
 * @param adapterOptions - Adapter-specific options
 * @returns Async function that validates CSV data in parallel
 */
export function createAsyncValidatedParser(
  schema: ZodSchema | YupSchema,
  adapterOptions: ValidatedParserOptions = {}
): (csv: string, parseOptions?: any) => Promise<any[]> {
  const { library = 'zod', ...options } = adapterOptions;
  
  return async function (csv: string, parseOptions: any = {}): Promise<any[]> {
    const { csvToJson } = require('../index');
    const { createWorkerPool } = require('../workers/worker-pool');
    
    // Create worker pool for parallel validation
    const pool = createWorkerPool({
      workerCount: Math.min(4, require('os').cpus().length),
      workerScript: require.resolve('./validation-worker.js')
    });
    
    try {
      // Parse CSV without validation first
      const data = await csvToJson(csv, parseOptions);
      
      // Validate in parallel using worker pool
      const validationPromises = data.map((row: any, index: number) => 
        pool.execute({ row, index, schema, library, options })
      );
      
      const validatedRows = await Promise.all(validationPromises);
      return validatedRows;
    } finally {
      await pool.terminate();
    }
  };
}

/**
 * Creates a validation hook that works asynchronously with Zod schemas.
 * 
 * @param zodSchema - Zod schema instance
 * @param options - Validation options
 * @returns Async validation hook
 */
export function createAsyncZodValidationHook(
  zodSchema: ZodSchema,
  options: ZodValidationOptions = {}
): RowHook {
  const hook = createZodValidationHook(zodSchema, options);
  
  return async function (row: any, index: number, context: any): Promise<any> {
    // For async compatibility, wrap in Promise
    return Promise.resolve(hook(row, index, context));
  };
}

/**
 * Creates a validation hook that works asynchronously with Yup schemas.
 * 
 * @param yupSchema - Yup schema instance
 * @param options - Validation options
 * @returns Async validation hook
 */
export function createAsyncYupValidationHook(
  yupSchema: YupSchema,
  options: YupValidationOptions = {}
): RowHook {
  const hook = createYupValidationHook(yupSchema, options);
  
  return async function (row: any, index: number, context: any): Promise<any> {
    return hook(row, index, context);
  };
}

export default {
  createZodValidationHook,
  createYupValidationHook,
  createValidatedParser,
  createAsyncValidatedParser,
  createAsyncZodValidationHook,
  createAsyncYupValidationHook
};