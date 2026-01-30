/**
 * Hono plugin for jtcsv
 * Provides middleware and response helpers for CSV processing in Hono applications
 * @module plugins/hono
 */

import { csvToJson, jsonToCsv } from '../../index-core';
import type { CsvToJsonOptions, JsonToCsvOptions } from '../../src/types';

/**
 * Hono context type (simplified)
 */
interface HonoContext {
  req: {
    text(): Promise<string>;
  };
  set(key: string, value: any): void;
}

/**
 * Options for CSV middleware
 */
export interface CsvMiddlewareOptions extends CsvToJsonOptions {
  // Additional options specific to CSV middleware
}

/**
 * Options for CSV response
 */
export interface CsvResponseOptions extends JsonToCsvOptions {
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
 * CSV middleware for Hono
 * Parses incoming CSV request bodies and attaches parsed data to context
 * 
 * @example
 * app.post('/upload', csvMiddleware(), async (c) => {
 *   const data = c.get('csv');
 *   return c.json({ success: true, data });
 * });
 */
export function csvMiddleware(options: CsvMiddlewareOptions = {}): any {
  return async (c: HonoContext, next: () => Promise<void>) => {
    try {
      const csvText = await c.req.text();
      const rows = await csvToJson(csvText, options);
      c.set('csv', rows);
      await next();
    } catch (error) {
      // Re-throw error for Hono error handling
      throw error;
    }
  };
}

/**
 * Async CSV middleware for Hono
 * Uses async/await for better performance with large files
 */
export function asyncCsvMiddleware(options: CsvMiddlewareOptions = {}): any {
  return async (c: HonoContext, next: () => Promise<void>) => {
    try {
      const csvText = await c.req.text();
      const rows = await csvToJson(csvText, options);
      c.set('csv', rows);
      await next();
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Creates a CSV response for Hono
 * Converts data to CSV and returns appropriate headers
 * 
 * @example
 * app.get('/export', async (c) => {
 *   const data = await getData();
 *   const response = createCsvResponse(data, 'export.csv');
 *   return new Response(response.csv, { headers: response.headers });
 * });
 */
export function createCsvResponse(
  data: any,
  filename: string = 'export.csv',
  options: CsvResponseOptions = {}
): { csv: string; headers: Record<string, string> } {
  const safeName = normalizeFilename(filename);
  const rows = Array.isArray(data) ? data : [data];
  const csv = jsonToCsv(rows, options);

  return {
    csv,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`
    }
  };
}

/**
 * Async version of createCsvResponse
 * Uses async/await for better performance with large files
 */
export async function createAsyncCsvResponse(
  data: any,
  filename: string = 'export.csv',
  options: CsvResponseOptions = {}
): Promise<{ csv: string; headers: Record<string, string> }> {
  const safeName = normalizeFilename(filename);
  const rows = Array.isArray(data) ? data : [data];
  const csv = await jsonToCsv(rows, options);

  return {
    csv,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`
    }
  };
}

/**
 * CSV response helper for Hono
 * Returns a Response object with CSV data
 * 
 * @example
 * app.get('/export', async (c) => {
 *   const data = await getData();
 *   return csvResponse(c, data, 'export.csv');
 * });
 */
export function csvResponse(
  data: any,
  filename: string = 'export.csv',
  options: CsvResponseOptions = {}
): Response {
  const { csv, headers } = createCsvResponse(data, filename, options);
  return new Response(csv, { headers });
}

/**
 * Async CSV response helper for Hono
 * Returns a Response object with CSV data using async processing
 */
export async function asyncCsvResponse(
  data: any,
  filename: string = 'export.csv',
  options: CsvResponseOptions = {}
): Promise<Response> {
  const { csv, headers } = await createAsyncCsvResponse(data, filename, options);
  return new Response(csv, { headers });
}

/**
 * CSV parsing endpoint helper
 * Creates a route handler that parses CSV and returns JSON
 * 
 * @example
 * app.post('/parse', csvParseEndpoint());
 */
export function csvParseEndpoint(options: CsvMiddlewareOptions = {}): any {
  return async (c: HonoContext) => {
    try {
      const csvText = await c.req.text();
      const rows = await csvToJson(csvText, options);
      return new Response(JSON.stringify(rows), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

/**
 * CSV download endpoint helper
 * Creates a route handler that returns CSV data
 * 
 * @example
 * app.get('/download', csvDownloadEndpoint(async () => await getData()));
 */
export function csvDownloadEndpoint(
  dataProvider: () => Promise<any> | any,
  filename: string = 'export.csv',
  options: CsvResponseOptions = {}
): any {
  return async (c: HonoContext) => {
    try {
      const data = await (typeof dataProvider === 'function' ? dataProvider() : dataProvider);
      return asyncCsvResponse(data, filename, options);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

export default {
  csvMiddleware,
  asyncCsvMiddleware,
  createCsvResponse,
  createAsyncCsvResponse,
  csvResponse,
  asyncCsvResponse,
  csvParseEndpoint,
  csvDownloadEndpoint,
};