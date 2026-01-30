/**
 * NestJS plugin for jtcsv
 * Provides interceptors and decorators for CSV parsing and downloading in NestJS applications
 * @module plugins/nestjs
 */

// Note: NestJS and RxJS types are optional - users need to install @nestjs/common and rxjs
// We use conditional imports to avoid breaking the build
type Injectable = any;
type UseInterceptors = any;
type ExecutionContext = any;
type CallHandler = any;
type NestInterceptor = any;
type Observable<T> = any;

import { csvToJson, jsonToCsv } from '../../index-core';
import type { CsvToJsonOptions, JsonToCsvOptions } from '../../src/types';

/**
 * Options for CSV parser interceptor
 */
export interface CsvParserOptions extends CsvToJsonOptions {
  // Additional options specific to CSV parsing
}

/**
 * Options for CSV download interceptor
 */
export interface CsvDownloadOptions extends JsonToCsvOptions {
  /** Filename for the downloaded CSV file */
  filename?: string;
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
 * Creates a CSV parser interceptor for NestJS
 * Parses incoming CSV request bodies into JSON
 */
export function createCsvParserInterceptor(options: CsvParserOptions = {}): any {
  class CsvParserInterceptorImpl {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const req = context.switchToHttp().getRequest();
      const body = req && req.body;

      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        const csv = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        req.body = await csvToJson(csv, options);
      }

      return next.handle();
    }
  }

  return CsvParserInterceptorImpl;
}

/**
 * Creates a CSV download interceptor for NestJS
 * Converts JSON responses to CSV and sets appropriate headers
 */
export function createCsvDownloadInterceptor(options: CsvDownloadOptions = {}): any {
  class CsvDownloadInterceptorImpl {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const res = context.switchToHttp().getResponse();
      const filename = normalizeFilename(options.filename);
      const csvOptions = { ...options } as JsonToCsvOptions;
      delete (csvOptions as any).filename;

      return next.handle().pipe(
        (async (data: any) => {
          const rows = Array.isArray(data) ? data : [data];
          const csv = await jsonToCsv(rows, csvOptions);

          if (res && typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${filename}"`
            );
          }

          return csv;
        }) as any
      );
    }
  }

  return CsvDownloadInterceptorImpl;
}

/**
 * Decorator for CSV parsing interceptor
 * Usage: @CsvParserInterceptor({ delimiter: ',' })
 */
export function CsvParserInterceptor(options: CsvParserOptions = {}): any {
  const Interceptor = createCsvParserInterceptor(options);
  return Interceptor;
}

/**
 * Decorator for CSV download interceptor
 * Usage: @CsvDownloadDecorator({ filename: 'data.csv' })
 */
export function CsvDownloadDecorator(options: CsvDownloadOptions = {}): any {
  const Interceptor = createCsvDownloadInterceptor(options);
  return Interceptor;
}

/**
 * Async version of CSV parser interceptor
 * Uses async/await for better performance with large files
 */
export function createAsyncCsvParserInterceptor(options: CsvParserOptions = {}): any {
  class AsyncCsvParserInterceptorImpl {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const req = context.switchToHttp().getRequest();
      const body = req && req.body;

      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        const csv = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        req.body = await csvToJson(csv, options);
      }

      return next.handle();
    }
  }

  return AsyncCsvParserInterceptorImpl;
}

/**
 * Async version of CSV download interceptor
 * Uses async/await for better performance with large files
 */
export function createAsyncCsvDownloadInterceptor(options: CsvDownloadOptions = {}): any {
  class AsyncCsvDownloadInterceptorImpl {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const res = context.switchToHttp().getResponse();
      const filename = normalizeFilename(options.filename);
      const csvOptions = { ...options } as JsonToCsvOptions;
      delete (csvOptions as any).filename;

      return next.handle().pipe(
        (async (data: any) => {
          const rows = Array.isArray(data) ? data : [data];
          const csv = await jsonToCsv(rows, csvOptions);

          if (res && typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${filename}"`
            );
          }

          return csv;
        }) as any
      );
    }
  }

  return AsyncCsvDownloadInterceptorImpl;
}

/**
 * Async decorator for CSV parsing interceptor
 * Usage: @AsyncCsvParserInterceptor({ delimiter: ',' })
 */
export function AsyncCsvParserInterceptor(options: CsvParserOptions = {}): any {
  const Interceptor = createAsyncCsvParserInterceptor(options);
  return Interceptor;
}

/**
 * Async decorator for CSV download interceptor
 * Usage: @AsyncCsvDownloadDecorator({ filename: 'data.csv' })
 */
export function AsyncCsvDownloadDecorator(options: CsvDownloadOptions = {}): any {
  const Interceptor = createAsyncCsvDownloadInterceptor(options);
  return Interceptor;
}

export default {
  CsvParserInterceptor,
  CsvDownloadDecorator,
  createCsvParserInterceptor,
  createCsvDownloadInterceptor,
  AsyncCsvParserInterceptor,
  AsyncCsvDownloadDecorator,
  createAsyncCsvParserInterceptor,
  createAsyncCsvDownloadInterceptor,
};