/**
 * NestJS plugin for jtcsv
 * Provides service, pipes, module, and interceptors for CSV parsing and downloading in NestJS applications
 * @module plugins/nestjs
 */

import {
  Injectable,
  PipeTransform,
  Pipe,
  Module,
  NestInterceptor,
  Inject,
  DynamicModule
} from '@nestjs/common';
import { switchMap } from 'rxjs/operators';
import { 
  csvToJson, 
  jsonToCsv, 
  csvToJsonAsync, 
  jsonToCsvAsync,
  type CsvToJsonOptions, 
  type JsonToCsvOptions 
} from 'jtcsv';

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
 * NestJS Service for CSV/JSON conversion
 */
@Injectable()
export class JtcsvService {
  /**
   * Convert CSV string to JSON array
   * @param csv - CSV string
   * @param options - Conversion options
   * @returns JSON array
   */
  csvToJson(csv: string, options?: CsvToJsonOptions): any[] {
    return csvToJson(csv, options);
  }

  /**
   * Convert JSON array to CSV string
   * @param json - JSON array
   * @param options - Conversion options
   * @returns CSV string
   */
  jsonToCsv(json: any[], options?: JsonToCsvOptions): string {
    return jsonToCsv(json, options);
  }

  /**
   * Async CSV to JSON conversion
   * @param csv - CSV string
   * @param options - Conversion options
   * @returns Promise resolving to JSON array
   */
  async csvToJsonAsync(csv: string, options?: CsvToJsonOptions): Promise<any[]> {
    return csvToJsonAsync(csv, options);
  }

  /**
   * Async JSON to CSV conversion
   * @param json - JSON array
   * @param options - Conversion options
   * @returns Promise resolving to CSV string
   */
  async jsonToCsvAsync(json: any[], options?: JsonToCsvOptions): Promise<string> {
    return jsonToCsvAsync(json, options);
  }
}

/**
 * NestJS Pipe for CSV parsing
 * Usage: @UsePipes(new ParseCsvPipe(options))
 */
@Injectable()
export class ParseCsvPipe implements PipeTransform {
  constructor(private options?: CsvToJsonOptions) {}

  transform(value: any): any[] {
    if (typeof value === 'string') {
      return csvToJson(value, this.options);
    }
    if (Buffer.isBuffer(value)) {
      return csvToJson(value.toString('utf8'), this.options);
    }
    return value;
  }
}

/**
 * NestJS Pipe for JSON to CSV
 * Usage: @UsePipes(new JsonToCsvPipe(options))
 */
@Injectable()
export class JsonToCsvPipe implements PipeTransform {
  constructor(private options?: JsonToCsvOptions) {}

  transform(value: any): string {
    if (Array.isArray(value)) {
      return jsonToCsv(value, this.options);
    }
    return value;
  }
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
    async intercept(context: any, next: any): Promise<any> {
      const req = context.switchToHttp().getRequest();
      const body = req && req.body;

      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        const csv = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        req.body = await csvToJsonAsync(csv, options);
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
    intercept(context: any, next: any): any {
      const res = context.switchToHttp().getResponse();
      const filename = normalizeFilename(options.filename);
      const csvOptions = { ...options } as JsonToCsvOptions;
      delete (csvOptions as any).filename;

      return next.handle().pipe(
        switchMap(async (data: any) => {
          const rows = Array.isArray(data) ? data : [data];
          const csv = await jsonToCsvAsync(rows, csvOptions);

          if (res && typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${filename}"`
            );
          }

          return csv;
        })
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
    async intercept(context: any, next: any): Promise<any> {
      const req = context.switchToHttp().getRequest();
      const body = req && req.body;

      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        const csv = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        req.body = await csvToJsonAsync(csv, options);
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
    async intercept(context: any, next: any): Promise<any> {
      const res = context.switchToHttp().getResponse();
      const filename = normalizeFilename(options.filename);
      const csvOptions = { ...options } as JsonToCsvOptions;
      delete (csvOptions as any).filename;

      return next.handle().pipe(
        switchMap(async (data: any) => {
          const rows = Array.isArray(data) ? data : [data];
          const csv = await jsonToCsvAsync(rows, csvOptions);

          if (res && typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${filename}"`
            );
          }

          return csv;
        })
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

/**
 * NestJS Module
 */
@Module({
  providers: [JtcsvService, ParseCsvPipe, JsonToCsvPipe],
  exports: [JtcsvService, ParseCsvPipe, JsonToCsvPipe]
})
export class JtcsvModule {
  static forRoot(): DynamicModule {
    return {
      module: JtcsvModule,
      providers: [JtcsvService, ParseCsvPipe, JsonToCsvPipe],
      exports: [JtcsvService, ParseCsvPipe, JsonToCsvPipe]
    };
  }

  static forChild(): DynamicModule {
    return {
      module: JtcsvModule,
      providers: [JtcsvService],
      exports: [JtcsvService]
    };
  }
}

// Export types
export type { CsvToJsonOptions, JsonToCsvOptions };

export default JtcsvModule;
