/**
 * Remix plugin for jtcsv
 * Provides utilities for CSV parsing and generation in Remix applications
 * @module plugins/remix
 */

import { csvToJson, jsonToCsv } from '../../index-core';
import type { CsvToJsonOptions, JsonToCsvOptions } from '../../src/types';

/**
 * Remix Request type (simplified)
 */
interface RemixRequest {
  formData(): Promise<FormData>;
}

/**
 * Options for CSV parsing from form data
 */
export interface ParseFormDataOptions extends CsvToJsonOptions {
  /** Field name containing the CSV file (default: 'file') */
  fieldName?: string;
}

/**
 * Options for CSV response generation
 */
export interface GenerateCsvResponseOptions extends JsonToCsvOptions {
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
 * Parse CSV from Remix form data
 * 
 * @example
 * // In a Remix action:
 * export async function action({ request }: ActionArgs) {
 *   const data = await parseFormData(request, { delimiter: ',' });
 *   return json({ success: true, data });
 * }
 */
export async function parseFormData(
  request: RemixRequest,
  options: ParseFormDataOptions = {}
): Promise<any[]> {
  if (!request || typeof request.formData !== 'function') {
    throw new Error('parseFormData expects a Remix Request with formData()');
  }

  const { fieldName = 'file', ...csvOptions } = options;
  const formData = await request.formData();
  const csvText = await extractCsvText(formData, fieldName);

  if (!csvText) {
    throw new Error('No CSV file or field found in form data');
  }

  return await csvToJson(csvText, csvOptions);
}

/**
 * Async version of parseFormData with better error handling
 */
export async function parseFormDataAsync(
  request: RemixRequest,
  options: ParseFormDataOptions = {}
): Promise<any[]> {
  try {
    return await parseFormData(request, options);
  } catch (error) {
    throw new Error(`Failed to parse CSV from form data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a CSV response for Remix
 * 
 * @example
 * // In a Remix loader:
 * export async function loader() {
 *   const data = await getData();
 *   return generateCsvResponse(data, 'export.csv');
 * }
 */
export function generateCsvResponse(
  data: any,
  filename: string = 'export.csv',
  options: GenerateCsvResponseOptions = {}
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
 * Async version of generateCsvResponse
 */
export async function generateAsyncCsvResponse(
  data: any,
  filename: string = 'export.csv',
  options: GenerateCsvResponseOptions = {}
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
 * CSV loader helper for Remix
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
  options: GenerateCsvResponseOptions = {}
): () => Promise<Response> {
  return async () => {
    try {
      const data = await (typeof dataLoader === 'function' ? dataLoader() : dataLoader);
      return generateCsvResponse(data, filename, options);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * CSV action helper for Remix
 * Creates an action that parses CSV from form data
 * 
 * @example
 * export const action = createCsvAction({ delimiter: ',' });
 */
export function createCsvAction(
  options: ParseFormDataOptions = {}
): (args: { request: RemixRequest }) => Promise<Response> {
  return async ({ request }) => {
    try {
      const data = await parseFormData(request, options);
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
 * Handles multiple CSV files in a single form
 */
export async function parseMultiPartFormData(
  request: RemixRequest,
  options: ParseFormDataOptions & { multiple?: boolean } = {}
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
 * CSV export utility for Remix routes
 */
export function csvExport(
  data: any,
  filename?: string,
  options?: GenerateCsvResponseOptions
): () => Promise<Response> {
  return () => generateAsyncCsvResponse(data, filename, options);
}

export default {
  parseFormData,
  parseFormDataAsync,
  generateCsvResponse,
  generateAsyncCsvResponse,
  createCsvLoader,
  createCsvAction,
  parseMultiPartFormData,
  csvExport,
};