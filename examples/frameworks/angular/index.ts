/**
 * Angular module for jtcsv
 * Provides service, pipes, and module for CSV/JSON conversion in Angular applications
 * @module plugins/angular
 */

import { Injectable, Pipe, PipeTransform, NgModule } from '@angular/core';
import { CsvToJsonOptions, JsonToCsvOptions, csvToJson, jsonToCsv } from 'jtcsv';

/**
 * Angular service for CSV/JSON conversion
 */
@Injectable({
  providedIn: 'root'
})
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
   * Parse CSV file from File object (browser)
   * @param file - File object from input[type=file]
   * @param options - Conversion options
   * @returns Promise resolving to JSON array
   */
  parseCsvFile(file: File, options?: CsvToJsonOptions): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (typeof File === 'undefined' || !(file instanceof File)) {
        reject(new Error('Expected File object'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const result = csvToJson(event.target?.result as string, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Generate CSV file and trigger download (browser)
   * @param json - JSON array
   * @param filename - Download filename
   * @param options - Conversion options
   */
  downloadCsv(json: any[], filename: string = 'data.csv', options?: JsonToCsvOptions): void {
    const csv = jsonToCsv(json, options);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for older browsers
      window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    }
  }

  /**
   * Create a readable stream that converts CSV to JSON
   * @param input - Input stream or string
   * @param options - Stream options
   * @returns JSON stream
   */
  streamCsvToJson(input: any, options?: CsvToJsonOptions): any {
    return csvToJson(input, options);
  }

  /**
   * Create a readable stream that converts JSON to CSV
   * @param input - Input stream or JSON array
   * @param options - Stream options
   * @returns CSV stream
   */
  streamJsonToCsv(input: any, options?: JsonToCsvOptions): any {
    return jsonToCsv(input, options);
  }
}

/**
 * Angular Pipe for CSV to JSON conversion in templates
 * Usage: {{ csvString | csvToJson | json }}
 */
@Pipe({
  name: 'csvToJson',
  standalone: true
})
export class CsvToJsonPipe implements PipeTransform {
  transform(value: string, options?: CsvToJsonOptions): any[] {
    if (!value) return [];
    return csvToJson(value, options);
  }
}

/**
 * Angular Pipe for JSON to CSV conversion in templates
 * Usage: {{ jsonArray | jsonToCsv }}
 */
@Pipe({
  name: 'jsonToCsv',
  standalone: true
})
export class JsonToCsvPipe implements PipeTransform {
  transform(value: any[], options?: JsonToCsvOptions): string {
    if (!value || !value.length) return '';
    return jsonToCsv(value, options);
  }
}

/**
 * Angular Module
 */
@NgModule({
  declarations: [
    CsvToJsonPipe,
    JsonToCsvPipe
  ],
  exports: [
    CsvToJsonPipe,
    JsonToCsvPipe
  ],
  providers: [
    JtcsvService
  ]
})
export class JtcsvModule {
  static forRoot() {
    return {
      ngModule: JtcsvModule,
      providers: [JtcsvService]
    };
  }

  static forChild() {
    return {
      ngModule: JtcsvModule
    };
  }
}

// Export everything
export { JtcsvService, CsvToJsonPipe, JsonToCsvPipe, JtcsvModule };
export type { CsvToJsonOptions, JsonToCsvOptions };

export default JtcsvModule;
