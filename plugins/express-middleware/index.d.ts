/**
 * TypeScript definitions для JTCSV Express Middleware
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

declare module '@jtcsv/express-middleware' {
  import { RequestHandler } from 'express';
  import { CsvToJsonOptions, JsonToCsvOptions } from 'jtcsv-converter';

  export interface JtcsvMiddlewareOptions {
    /** Максимальный размер тела запроса */
    maxSize?: string;
    
    /** Автоматическое определение формата */
    autoDetect?: boolean;
    
    /** Разделитель CSV */
    delimiter?: string;
    
    /** Включить Fast-Path Engine */
    enableFastPath?: boolean;
    
    /** Защита от CSV инъекций */
    preventCsvInjection?: boolean;
    
    /** Соответствие RFC 4180 */
    rfc4180Compliant?: boolean;
    
    /** Дополнительные опции конвертации */
    conversionOptions?: CsvToJsonOptions | JsonToCsvOptions;
  }

  export interface ConversionStats {
    /** Размер входных данных в байтах */
    inputSize: number;
    
    /** Размер выходных данных в байтах */
    outputSize: number;
    
    /** Время обработки в миллисекундах */
    processingTime: number;
    
    /** Тип конвертации */
    conversion: string;
  }

  export interface ConvertedData {
    /** Конвертированные данные */
    data: any;
    
    /** Формат выходных данных */
    format: 'json' | 'csv';
    
    /** Формат входных данных */
    inputFormat: 'json' | 'csv' | 'unknown';
    
    /** Формат выходных данных */
    outputFormat: 'json' | 'csv';
    
    /** Статистика конвертации */
    stats: ConversionStats;
    
    /** Использованные опции */
    options: CsvToJsonOptions | JsonToCsvOptions;
  }

  // Расширяем интерфейс Request Express
  declare global {
    namespace Express {
      interface Request {
        /** Конвертированные данные */
        converted?: ConvertedData;
        
        /** Время начала обработки запроса */
        startTime?: number;
      }
    }
  }

  /**
   * Express middleware для автоматической конвертации CSV/JSON
   */
  export function middleware(options?: JtcsvMiddlewareOptions): RequestHandler;
  
  /**
   * Express route для конвертации CSV в JSON
   */
  export function csvToJsonRoute(options?: CsvToJsonOptions): RequestHandler;
  
  /**
   * Express route для конвертации JSON в CSV
   */
  export function jsonToCsvRoute(options?: JsonToCsvOptions): RequestHandler;
  
  /**
   * Express route для загрузки CSV файла
   */
  export function uploadCsvRoute(options?: CsvToJsonOptions): RequestHandler;
  
  /**
   * Health check endpoint
   */
  export function healthCheck(): RequestHandler;
  
  // Aliases
  export const jtcsvMiddleware: typeof middleware;
  export const createMiddleware: typeof middleware;
}

export {};