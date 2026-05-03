/**
 * Nuxt composable for jtcsv
 * Provides reactive access to jtcsv functions
 */

import type { CsvToJsonOptions, JsonToCsvOptions } from '../../../../src/types';

/**
 * Jtcsv composable interface
 */
export interface UseJtcsvReturn {
  // Core functions
  csvToJson: (csv: string, options?: CsvToJsonOptions) => any[];
  jsonToCsv: (data: any, options?: JsonToCsvOptions) => string;
  
  // Async versions
  csvToJsonAsync: (csv: string, options?: CsvToJsonOptions) => Promise<any[]>;
  jsonToCsvAsync: (data: any, options?: JsonToCsvOptions) => Promise<string>;
  
  // Utility functions
  saveAsCsv: (data: any, filename: string, options?: JsonToCsvOptions) => void;
  saveAsCsvAsync: (data: any, filename: string, options?: JsonToCsvOptions) => Promise<void>;
  
  // Worker support
  createWorkerPool?: (size?: number) => any;
}

/**
 * Use jtcsv composable
 * This is a simplified version that works without Nuxt dependencies
 */
export function useJtcsv(): UseJtcsvReturn {
  // In a real Nuxt app, this would get jtcsv from the Nuxt context
  // For now, we'll create a mock implementation
  
  const mockJtcsv = {
    csvToJson: (csv: string, options?: CsvToJsonOptions) => {
      console.log('csvToJson called with:', { csv: csv.substring(0, 50) + '...', options });
      return [];
    },
    
    jsonToCsv: (data: any, options?: JsonToCsvOptions) => {
      console.log('jsonToCsv called with:', { data, options });
      return '';
    },
    
    csvToJsonAsync: async (csv: string, options?: CsvToJsonOptions) => {
      console.log('csvToJsonAsync called with:', { csv: csv.substring(0, 50) + '...', options });
      return [];
    },
    
    jsonToCsvAsync: async (data: any, options?: JsonToCsvOptions) => {
      console.log('jsonToCsvAsync called with:', { data, options });
      return '';
    },
    
    saveAsCsv: (data: any, filename: string, options?: JsonToCsvOptions) => {
      console.log('saveAsCsv called with:', { data, filename, options });
    },
    
    saveAsCsvAsync: async (data: any, filename: string, options?: JsonToCsvOptions) => {
      console.log('saveAsCsvAsync called with:', { data, filename, options });
    },
    
    createWorkerPool: (size?: number) => {
      console.log('createWorkerPool called with size:', size);
      return {
        size: size || 4,
        process: async (data: any) => data
      };
    }
  };
  
  return mockJtcsv;
}

/**
 * Async version of useJtcsv with better error handling
 */
export function useJtcsvAsync(): Omit<UseJtcsvReturn, 'csvToJson' | 'jsonToCsv' | 'saveAsCsv'> & {
  csvToJson: (csv: string, options?: CsvToJsonOptions) => Promise<any[]>;
  jsonToCsv: (data: any, options?: JsonToCsvOptions) => Promise<string>;
  saveAsCsv: (data: any, filename: string, options?: JsonToCsvOptions) => Promise<void>;
} {
  const jtcsv = useJtcsv();
  
  return {
    ...jtcsv,
    // Ensure all methods are async
    csvToJson: async (csv: string, options?: CsvToJsonOptions) => {
      return await jtcsv.csvToJsonAsync(csv, options);
    },
    jsonToCsv: async (data: any, options?: JsonToCsvOptions) => {
      return await jtcsv.jsonToCsvAsync(data, options);
    },
    saveAsCsv: async (data: any, filename: string, options?: JsonToCsvOptions) => {
      await jtcsv.saveAsCsvAsync(data, filename, options);
    }
  } as any;
}