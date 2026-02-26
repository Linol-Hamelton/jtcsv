/**
 * TypeScript definitions for @jtcsv/angular
 * Angular module for jtcsv - CSV/JSON conversion in Angular applications
 * 
 * @version 1.0.0
 * @date 2026-02-26
 */

import { PipeTransform, Injectable } from '@angular/core';
import { CsvToJsonOptions, JsonToCsvOptions } from 'jtcsv';

/**
 * Angular service for CSV/JSON conversion
 */
@Injectable({
  providedIn: 'root'
})
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
   * Parse CSV file from File object (browser)
   */
  parseCsvFile(file: File, options?: CsvToJsonOptions): Promise<any[]>;
  
  /**
   * Generate CSV file and trigger download (browser)
   */
  downloadCsv(json: any[], filename?: string, options?: JsonToCsvOptions): void;
  
  /**
   * Create a readable stream that converts CSV to JSON
   */
  streamCsvToJson(input: any, options?: CsvToJsonOptions): any;
  
  /**
   * Create a readable stream that converts JSON to CSV
   */
  streamJsonToCsv(input: any, options?: JsonToCsvOptions): any;
}

/**
 * Angular Pipe for CSV parsing in templates
 * Usage: {{ csvString | csvToJson | json }}
 */
@Injectable({
  providedIn: 'root'
})
export class CsvToJsonPipe implements PipeTransform {
  transform(value: string, options?: CsvToJsonOptions): any[];
}

/**
 * Angular Pipe for JSON to CSV in templates
 * Usage: {{ jsonArray | jsonToCsv }}
 */
@Injectable({
  providedIn: 'root'
})
export class JsonToCsvPipe implements PipeTransform {
  transform(value: any[], options?: JsonToCsvOptions): string;
}

/**
 * Angular Module
 */
export declare class JtcsvModule {
  static forRoot(): JtcsvModule;
  static forChild(): JtcsvModule;
}

// Re-export types
export type { CsvToJsonOptions, JsonToCsvOptions };
