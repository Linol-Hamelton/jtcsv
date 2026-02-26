/**
 * TypeScript definitions for @jtcsv/nestjs
 * NestJS module for jtcsv - CSV/JSON conversion in NestJS applications
 * 
 * @version 1.0.0
 * @date 2026-02-26
 */

import { PipeTransform, Injectable, NestInterceptor, Module } from '@nestjs/common';
import { CsvToJsonOptions, JsonToCsvOptions } from 'jtcsv';

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
   */
  csvToJson(csv: string, options?: CsvToJsonOptions): any[];
  
  /**
   * Convert JSON array to CSV string
   */
  jsonToCsv(json: any[], options?: JsonToCsvOptions): string;
  
  /**
   * Async CSV to JSON conversion
   */
  csvToJsonAsync(csv: string, options?: CsvToJsonOptions): Promise<any[]>;
  
  /**
   * Async JSON to CSV conversion
   */
  jsonToCsvAsync(json: any[], options?: JsonToCsvOptions): Promise<string>;
}

/**
 * NestJS Pipe for CSV parsing
 * Usage: @UsePipes(new ParseCsvPipe(options))
 */
@Injectable()
export class ParseCsvPipe implements PipeTransform {
  constructor(private options?: CsvToJsonOptions);
  transform(value: any): any[];
}

/**
 * Creates a CSV parser interceptor
 */
export function createCsvParserInterceptor(options?: CsvParserOptions): typeof NestInterceptor;

/**
 * Creates a CSV download interceptor
 */
export function createCsvDownloadInterceptor(options?: CsvDownloadOptions): typeof NestInterceptor;

/**
 * Decorator for CSV parsing interceptor
 */
export function CsvParserInterceptor(options?: CsvParserOptions): any;

/**
 * Decorator for CSV download interceptor
 */
export function CsvDownloadDecorator(options?: CsvDownloadOptions): any;

/**
 * Async version of CSV parser interceptor
 */
export function AsyncCsvParserInterceptor(options?: CsvParserOptions): any;

/**
 * Async version of CSV download interceptor
 */
export function AsyncCsvDownloadDecorator(options?: CsvDownloadOptions): any;

/**
 * NestJS Module
 */
@Module({
  providers: [JtcsvService],
  exports: [JtcsvService]
})
export class JtcsvModule {
  static forRoot(): DynamicModule;
  static forChild(): DynamicModule;
}

// Re-export types
export type { CsvToJsonOptions, JsonToCsvOptions };
