/**
 * SvelteKit plugin for jtcsv
 * Provides utilities for CSV parsing and generation in SvelteKit applications
 * @module plugins/sveltekit
 */

import { csvToJson, jsonToCsv } from '../../index-core';
import type { CsvToJsonOptions, JsonToCsvOptions } from '../../src/types';

/**
 * SvelteKit Request type (simplified)
 */
interface SvelteKitRequest {
  text(): Promise<string>;
  formData(): Promise<FormData>;
  headers?: {
    get(name: string): string | null;
  };
}

/**
 * Options for CSV parsing from request
 */
export interface ParseCsvOptions extends CsvToJsonOptions {
  /** Field name containing the CSV file (default: 'file') */
  fieldName?: string;
  /** Force form data parsing (default: auto-detect) */
  formData?: boolean;
}

/**
 * Options for CSV response generation
 */
export interface GenerateCsvOptions extends JsonToCsvOptions {
  // Additional options specific to CSV response
}

/**
 * Normalize filename for CSV download
 */
function normalizeFilename(filename?: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'export.csv';
  }
  return filename.includes('.') ? filename : `${filename}.csv`;
}

/**
 * Extract CSV text from FormData
 */
async function extractCsvText(formData: FormData, fieldName: string): Promise<string | null> {
  if (formData.has(fieldName)) {
    const value = formData.get(fieldName);
    if (value && typeof (value as any).text === 'function') {
      return await (value as any).text();
    }
    if (value !== null) {
      return String(value);
    }
  }

  for (const value of formData.values()) {
    if (value && typeof (value as any).text === 'function') {
      return await (value as any).text();
    }
  }

  return null;
}

/**
 * Parse CSV from SvelteKit request
 * 
 * @example
 * // In a SvelteKit endpoint:
 * export async function POST({ request }) {
 *   const data = await parseCsv(request, { delimiter: ',' });
 *   return json({ success: true, data });
 * }
 */
export async function parseCsv(
  request: SvelteKitRequest,
  options: ParseCsvOptions = {}
): Promise<any[]> {
  if (!request || typeof request.text !== 'function') {
    throw new Error('parseCsv expects a Request instance');
  }

  const { fieldName = 'file', formData: forceFormData, ...csvOptions } = options;
  const contentType = request.headers?.get?.('content-type') || '';
  let csvText: string | null = null;

  if (forceFormData || contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    csvText = await extractCsvText(formData, fieldName);
  } else {
    csvText = await request.text();
  }

  if (!csvText) {
    throw new Error('No CSV payload found in request');
  }

  return await csvToJson(csvText, csvOptions);
}

/**
 * Async version of parseCsv with better error handling
 */
export async function parseCsvAsync(
  request: SvelteKitRequest,
  options: ParseCsvOptions = {}
): Promise<any[]> {
  try {
    return await parseCsv(request, options);
  } catch (error) {
    throw new Error(`Failed to parse CSV from request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a CSV response for SvelteKit
 * 
 * @example
 * // In a SvelteKit endpoint:
 * export async function GET() {
 *   const data = await getData();
 *   return generateCsv(data, 'export.csv');
 * }
 */
export function generateCsv(
  data: any,
  filename: string = 'export.csv',
  options: GenerateCsvOptions = {}
): Response {
  const safeName = normalizeFilename(filename);
  const rows = Array.isArray(data) ? data : [data];
  const csv = jsonToCsv(rows, options);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`
    }
  });
}

/**
 * Async version of generateCsv
 */
export async function generateAsyncCsv(
  data: any,
  filename: string = 'export.csv',
  options: GenerateCsvOptions = {}
): Promise<Response> {
  const safeName = normalizeFilename(filename);
  const rows = Array.isArray(data) ? data : [data];
  const csv = await jsonToCsv(rows, options);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`
    }
  });
}

/**
 * CSV loader helper for SvelteKit
 * Creates a loader that returns CSV data
 * 
 * @example
 * export const loader = createCsvLoader(async () => {
 *   return await getData();
 * }, 'data.csv');
 */
export function createCsvLoader(
  dataLoader: () => Promise<any> | any,
  filename: string = 'export.csv',
  options: GenerateCsvOptions = {}
): () => Promise<Response> {
  return async () => {
    try {
      const data = await (typeof dataLoader === 'function' ? dataLoader() : dataLoader);
      return generateCsv(data, filename, options);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * CSV action helper for SvelteKit
 * Creates an action that parses CSV from form data
 * 
 * @example
 * export const action = createCsvAction({ delimiter: ',' });
 */
export function createCsvAction(
  options: ParseCsvOptions = {}
): (args: { request: SvelteKitRequest }) => Promise<Response> {
  return async ({ request }) => {
    try {
      const data = await parseCsv(request, options);
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * Multi-part form data CSV parser
 * Handles multiple CSV files in a single request
 */
export async function parseMultiPartCsv(
  request: SvelteKitRequest,
  options: ParseCsvOptions & { multiple?: boolean } = {}
): Promise<any[] | any[][]> {
  const { multiple = false, ...csvOptions } = options;
  const formData = await request.formData();
  const results: any[][] = [];

  for (const [fieldName, value] of formData.entries()) {
    if (value && typeof (value as any).text === 'function') {
      const csvText = await (value as any).text();
      if (csvText) {
        const parsed = await csvToJson(csvText, csvOptions);
        results.push(parsed);
      }
    }
  }

  if (!multiple && results.length > 0) {
    return results[0];
  }

  return results;
}

/**
 * CSV export utility for SvelteKit routes
 */
export function csvExport(
  data: any,
  filename?: string,
  options?: GenerateCsvOptions
): () => Promise<Response> {
  return () => generateAsyncCsv(data, filename, options);
}

/**
 * SvelteKit server hook for CSV processing
 * Can be used in hooks.server.js/ts
 */
export function createCsvHook(options: {
  parseOptions?: ParseCsvOptions;
  generateOptions?: GenerateCsvOptions;
} = {}) {
  return {
    async handle({ event, resolve }: { event: any; resolve: any }) {
      // Add CSV utilities to event.locals
      event.locals.csv = {
        parse: (request: SvelteKitRequest, opts?: ParseCsvOptions) => 
          parseCsv(request, { ...options.parseOptions, ...opts }),
        parseAsync: (request: SvelteKitRequest, opts?: ParseCsvOptions) => 
          parseCsvAsync(request, { ...options.parseOptions, ...opts }),
        generate: (data: any, filename?: string, opts?: GenerateCsvOptions) => 
          generateCsv(data, filename, { ...options.generateOptions, ...opts }),
        generateAsync: (data: any, filename?: string, opts?: GenerateCsvOptions) => 
          generateAsyncCsv(data, filename, { ...options.generateOptions, ...opts }),
      };

      return resolve(event);
    }
  };
}

export default {
  parseCsv,
  parseCsvAsync,
  generateCsv,
  generateAsyncCsv,
  createCsvLoader,
  createCsvAction,
  parseMultiPartCsv,
  csvExport,
  createCsvHook,
};