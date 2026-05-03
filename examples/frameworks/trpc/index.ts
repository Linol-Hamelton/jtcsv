/**
 * tRPC plugin for jtcsv
 * Provides utilities for CSV parsing and generation in tRPC applications
 * @module plugins/trpc
 */

import { csvToJson, jsonToCsv } from '../../index-core';
import type { CsvToJsonOptions, JsonToCsvOptions } from '../../src/types';

/**
 * tRPC context type (simplified)
 */
interface TRPCContext {
  // tRPC context properties
}

/**
 * tRPC procedure type (simplified)
 */
interface TRPCProcedure {
  input(schema: any): any;
  use(middleware: any): any;
}

/**
 * tRPC instance type (simplified)
 */
interface TRPCInstance {
  procedure: TRPCProcedure;
}

/**
 * Options for CSV parsing in tRPC procedures
 */
export interface CsvProcedureOptions extends CsvToJsonOptions {
  /** Whether to return raw CSV text instead of parsed JSON */
  raw?: boolean;
  /** Whether to use async parsing */
  async?: boolean;
}

/**
 * Options for CSV generation in tRPC procedures
 */
export interface CsvResponseOptions extends JsonToCsvOptions {
  /** Filename for download (default: 'export.csv') */
  filename?: string;
  /** Whether to return as Response object */
  asResponse?: boolean;
  /** Whether to use async generation */
  async?: boolean;
}

/**
 * Extract CSV text from various input formats
 */
function extractCsvText(input: any): string | null {
  if (typeof input === 'string') {
    return input;
  }
  if (input && typeof input === 'object' && typeof input.csv === 'string') {
    return input.csv;
  }
  if (input && typeof input === 'object' && input.file && typeof input.file.text === 'function') {
    return input.file.text();
  }
  return null;
}

/**
 * Create a tRPC procedure for CSV parsing
 * 
 * @example
 * // In your tRPC router:
 * import { createCsvProcedure } from 'jtcsv/plugins/trpc';
 * 
 * export const csvRouter = t.router({
 *   parse: createCsvProcedure(t, z.string(), { delimiter: ',' })
 * });
 */
export function createCsvProcedure(
  t: TRPCInstance,
  schema: any,
  options: CsvProcedureOptions = {}
): any {
  if (!t || !t.procedure) {
    throw new Error('createCsvProcedure expects initTRPC instance');
  }

  return t.procedure
    .input(schema)
    .use(async ({ input, next }: { input: any; next: any }) => {
      const csvText = extractCsvText(input);
      if (!csvText) {
        throw new Error('CSV input must be a string or { csv: string }');
      }

      if (options.async) {
        const parsed = await csvToJson(csvText, options);
        return next({ input: parsed });
      } else {
        const parsed = csvToJson(csvText, options);
        return next({ input: parsed });
      }
    });
}

/**
 * Async version of createCsvProcedure
 */
export function createAsyncCsvProcedure(
  t: TRPCInstance,
  schema: any,
  options: CsvProcedureOptions = {}
): any {
  return createCsvProcedure(t, schema, { ...options, async: true });
}

/**
 * Create a tRPC procedure for CSV generation
 * 
 * @example
 * // In your tRPC router:
 * import { createCsvResponseProcedure } from 'jtcsv/plugins/trpc';
 * 
 * export const csvRouter = t.router({
 *   export: createCsvResponseProcedure(t, z.array(z.any()), { filename: 'data.csv' })
 * });
 */
export function createCsvResponseProcedure(
  t: TRPCInstance,
  schema: any,
  options: CsvResponseOptions = {}
): any {
  if (!t || !t.procedure) {
    throw new Error('createCsvResponseProcedure expects initTRPC instance');
  }

  return t.procedure
    .input(schema)
    .use(async ({ input, next }: { input: any; next: any }) => {
      const { filename = 'export.csv', asResponse = false, ...csvOptions } = options;
      const rows = Array.isArray(input) ? input : [input];
      
      if (options.async) {
        const csv = await jsonToCsv(rows, csvOptions);
        
        if (asResponse) {
          const response = new Response(csv, {
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="${filename}"`
            }
          });
          return next({ input: response });
        }
        
        return next({ input: csv });
      } else {
        const csv = jsonToCsv(rows, csvOptions);
        
        if (asResponse) {
          const response = new Response(csv, {
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="${filename}"`
            }
          });
          return next({ input: response });
        }
        
        return next({ input: csv });
      }
    });
}

/**
 * Async version of createCsvResponseProcedure
 */
export function createAsyncCsvResponseProcedure(
  t: TRPCInstance,
  schema: any,
  options: CsvResponseOptions = {}
): any {
  return createCsvResponseProcedure(t, schema, { ...options, async: true });
}

/**
 * Create a complete tRPC router for CSV operations
 * 
 * @example
 * // In your tRPC setup:
 * import { createCsvRouter } from 'jtcsv/plugins/trpc';
 * 
 * export const csvRouter = createCsvRouter(t);
 */
export function createCsvRouter(t: TRPCInstance, options: {
  parseOptions?: CsvProcedureOptions;
  responseOptions?: CsvResponseOptions;
} = {}) {
  if (!t || !t.procedure) {
    throw new Error('createCsvRouter expects initTRPC instance');
  }

  return {
    parse: createCsvProcedure(t, z.string(), options.parseOptions),
    parseAsync: createAsyncCsvProcedure(t, z.string(), options.parseOptions),
    export: createCsvResponseProcedure(t, z.array(z.any()), options.responseOptions),
    exportAsync: createAsyncCsvResponseProcedure(t, z.array(z.any()), options.responseOptions),
    batch: t.procedure
      .input(z.array(z.string()))
      .use(async ({ input, next }: { input: string[]; next: any }) => {
        const results = await Promise.all(
          input.map((csv: string) => csvToJson(csv, options.parseOptions))
        );
        return next({ input: results });
      }),
    batchAsync: t.procedure
      .input(z.array(z.string()))
      .use(async ({ input, next }: { input: string[]; next: any }) => {
        const results = await Promise.all(
          input.map((csv: string) => csvToJson(csv, options.parseOptions))
        );
        return next({ input: results });
      }),
  };
}

/**
 * tRPC middleware for CSV processing
 * Adds CSV utilities to tRPC context
 */
export function createCsvMiddleware(options: CsvProcedureOptions = {}) {
  return async ({ ctx, next }: { ctx: TRPCContext; next: any }) => {
    const enhancedCtx = {
      ...ctx,
      csv: {
        parse: (csvText: string) => csvToJson(csvText, options),
        parseAsync: async (csvText: string) => await csvToJson(csvText, options),
        generate: (data: any, opts?: JsonToCsvOptions) => jsonToCsv(data, { ...options, ...opts }),
        generateAsync: async (data: any, opts?: JsonToCsvOptions) => 
          await jsonToCsv(data, { ...options, ...opts }),
      }
    };

    return next({ ctx: enhancedCtx });
  };
}

/**
 * Zod schema for CSV input validation
 * Note: This is a placeholder - in real usage, import zod
 */
const z = {
  string: () => ({ _type: 'string' }),
  array: (schema: any) => ({ _type: 'array', schema }),
  any: () => ({ _type: 'any' }),
};

export default {
  createCsvProcedure,
  createAsyncCsvProcedure,
  createCsvResponseProcedure,
  createAsyncCsvResponseProcedure,
  createCsvRouter,
  createCsvMiddleware,
};