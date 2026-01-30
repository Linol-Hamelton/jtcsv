/**
 * Express middleware для JTCSV
 * Автоматическая конвертация CSV/JSON в HTTP запросах
 *
 * @version 2.0.0 - TypeScript версия с асинхронной поддержкой
 * @date 2026-01-29
 */

import { Request, Response, NextFunction } from 'express';
import { csvToJson, csvToJsonAsync, jsonToCsv, jsonToCsvAsync } from '../../index-core';
import { JtcsvError, ValidationError, SecurityError, FileSystemError } from '../../errors';

/**
 * Интерфейс опций Express middleware
 */
export interface JtcsvExpressMiddlewareOptions {
  /** Максимальный размер тела запроса (default: '10mb') */
  maxSize?: string;
  /** Максимальный размер файла (например, '500MB', default: '500MB') */
  maxFileSize?: string;
  /** Максимальный размер поля в байтах (default: 1MB) */
  maxFieldSize?: number;
  /** Таймаут обработки в миллисекундах (default: 300000 = 5 минут) */
  timeout?: number;
  /** Автоматическое определение формата (default: true) */
  autoDetect?: boolean;
  /** Разделитель CSV (default: ',') */
  delimiter?: string;
  /** Включить Fast-Path Engine (default: true) */
  enableFastPath?: boolean;
  /** Защита от CSV инъекций (default: true) */
  preventCsvInjection?: boolean;
  /** Соблюдение RFC4180 (default: true) */
  rfc4180Compliant?: boolean;
  /** Дополнительные опции конвертации */
  conversionOptions?: Record<string, any>;
  /** Использовать асинхронные версии функций (default: true) */
  useAsync?: boolean;
  /** Использовать многопоточную обработку для больших данных (default: auto-detect) */
  useWorkers?: boolean;
  /** Количество worker'ов для многопоточной обработки (default: CPU cores - 1) */
  workerCount?: number;
}

/**
 * Интерфейс конвертированных данных в request object
 */
export interface ConvertedData {
  /** Конвертированные данные */
  data: any;
  /** Формат вывода */
  format: 'json' | 'csv';
  /** Формат ввода */
  inputFormat: 'json' | 'csv' | 'unknown';
  /** Формат вывода */
  outputFormat: 'json' | 'csv';
  /** Статистика обработки */
  stats: {
    inputSize: number;
    outputSize: number;
    processingTime: number;
    conversion: string;
    workerCount?: number;
  };
  /** Опции конвертации */
  options: Record<string, any>;
}

/**
 * Расширенный интерфейс Request с конвертированными данными
 */
declare global {
  namespace Express {
    interface Request {
      /** Конвертированные данные */
      converted?: ConvertedData;
      /** Время начала обработки */
      startTime?: number;
    }
  }
}

/**
 * Преобразует строку размера (например, '500MB') в байты
 * @param sizeStr - Строка размера (например, '10MB', '1GB', '500KB')
 * @returns Размер в байтах
 */
function parseSizeToBytes(sizeStr: string | number): number {
  if (typeof sizeStr === 'number') {
    return sizeStr;
  }
  if (typeof sizeStr !== 'string') {
    return 10 * 1024 * 1024; // default 10MB
  }
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) {
    return 10 * 1024 * 1024;
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case 'B': return value;
    case 'KB': return value * 1024;
    case 'MB': return value * 1024 * 1024;
    case 'GB': return value * 1024 * 1024 * 1024;
    case 'TB': return value * 1024 * 1024 * 1024 * 1024;
    default: return value * 1024 * 1024;
  }
}

/**
 * Express middleware для обработки CSV/JSON конвертации
 * 
 * @param options - Опции middleware
 * @returns Express middleware
 * 
 * @example
 * // Базовое использование
 * const app = express();
 * app.use(express.json());
 * app.use(express.text({ type: 'text/csv' }));
 * app.use(jtcsvExpressMiddleware());
 * 
 * @example
 * // С кастомными опциями
 * app.use(jtcsvExpressMiddleware({
 *   maxSize: '50mb',
 *   maxFileSize: '1GB',
 *   maxFieldSize: 5 * 1024 * 1024, // 5MB
 *   timeout: 600000, // 10 минут
 *   delimiter: ';',
 *   enableFastPath: true,
 *   useAsync: true, // Использовать асинхронные функции
 *   useWorkers: true // Включить многопоточную обработку
 * }));
 */
export function jtcsvExpressMiddleware(options: JtcsvExpressMiddlewareOptions = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    maxSize = '10mb',
    maxFileSize = '500MB',
    maxFieldSize = 1024 * 1024, // 1MB
    timeout = 300000, // 5 minutes
    autoDetect = true,
    delimiter = ',',
    enableFastPath = true,
    preventCsvInjection = true,
    rfc4180Compliant = true,
    useAsync = true,
    useWorkers,
    workerCount,
    conversionOptions = {}
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[jtcsv-middleware] Request received:', req.method, req.url, req.headers['content-type']);
    }
    
    // Устанавливаем время начала обработки
    req.startTime = Date.now();
    
    // Пропускаем запросы без тела
    if (!req.body || (typeof req.body !== 'string' && typeof req.body !== 'object')) {
      if (process.env.NODE_ENV !== 'test') {
        console.log('[jtcsv-middleware] No body, skipping');
      }
      return next();
    }

    // Проверка размера файла
    const contentLength = req.get('content-length');
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[jtcsv-middleware] Content-Length: "${contentLength}"`);
    }
    if (contentLength && contentLength.trim() !== '') {
      const maxBytes = parseSizeToBytes(maxFileSize);
      const contentLengthInt = parseInt(contentLength, 10);
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[jtcsv-middleware] maxBytes: ${maxBytes}, contentLengthInt: ${contentLengthInt}`);
      }
      if (contentLengthInt > maxBytes) {
        if (process.env.NODE_ENV !== 'test') {
          console.log(`[jtcsv-middleware] File size limit exceeded: ${contentLengthInt} > ${maxBytes}`);
        }
        res.status(413).json({
          success: false,
          error: `File size exceeds limit of ${maxFileSize}`,
          code: 'FILE_SIZE_LIMIT_EXCEEDED'
        });
        return;
      }
    }

    const contentType = req.get('content-type') || '';
    const acceptHeader = req.get('accept') || 'application/json';
    
    // Определяем формат входных данных заранее
    let inputFormat: 'json' | 'csv' | 'unknown' = 'unknown';
    const inputData = req.body;
  
    if (autoDetect) {
      if (contentType.includes('application/json') ||
          (req.body !== null && typeof req.body === 'object' && !Array.isArray(req.body))) {
        inputFormat = 'json';
      } else if (contentType.includes('text/csv') ||
                contentType.includes('text/plain') ||
                (typeof req.body === 'string' && req.body.includes(','))) {
        inputFormat = 'csv';
      }
    } else {
      // Ручное определение на основе content-type
      if (contentType.includes('application/json')) {
        inputFormat = 'json';
      } else if (contentType.includes('text/csv')) {
        inputFormat = 'csv';
      }
    }

    // Если формат не определен, пропускаем
    if (inputFormat === 'unknown') {
      return next();
    }
    
    // Установка таймаута
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Request processing timeout (${timeout}ms)`));
      }, timeout);
    });
    
    try {
      // Обернем основную логику в Promise.race с таймаутом
      const processingPromise = (async () => {
        // Определяем желаемый формат вывода на основе Accept header
        let outputFormat: 'json' | 'csv' = 'json';
        if (acceptHeader.includes('text/csv')) {
          outputFormat = 'csv';
        } else if (req.query.format === 'csv') {
          outputFormat = 'csv';
        } else if ((req.body as any)?.format === 'csv') {
          outputFormat = 'csv';
        }

        // Опции конвертации
        const mergedConversionOptions: Record<string, any> = {
          delimiter,
          preventCsvInjection,
          rfc4180Compliant,
          useFastPath: enableFastPath,
          maxFieldSize,
          useWorkers,
          workerCount,
          ...req.query,
          ...conversionOptions
        };

        // Удаляем параметры, которые не относятся к конвертации
        delete mergedConversionOptions.maxSize;
        delete mergedConversionOptions.maxFileSize;
        delete mergedConversionOptions.maxFieldSize;
        delete mergedConversionOptions.timeout;
        delete mergedConversionOptions.autoDetect;
        delete mergedConversionOptions.enableFastPath;
        delete mergedConversionOptions.useAsync;
        delete mergedConversionOptions.useWorkers;
        delete mergedConversionOptions.workerCount;

        let result: any;
        const stats: ConvertedData['stats'] = {
          inputSize: 0,
          outputSize: 0,
          processingTime: 0,
          conversion: `${inputFormat}→${outputFormat}`
        };

        const startTime = Date.now();

        // Выполняем конвертацию
        if (inputFormat === 'json' && outputFormat === 'csv') {
          const jsonData = typeof inputData === 'string' ? JSON.parse(inputData) : inputData;
          stats.inputSize = Buffer.byteLength(JSON.stringify(jsonData));
          
          if (useAsync) {
            result = await jsonToCsvAsync(jsonData, mergedConversionOptions);
          } else {
            result = jsonToCsv(jsonData, mergedConversionOptions);
          }
          stats.outputSize = Buffer.byteLength(result);
          
        } else if (inputFormat === 'csv' && outputFormat === 'json') {
          const csvData = typeof inputData === 'string' ? inputData : String(inputData);
          stats.inputSize = Buffer.byteLength(csvData);
          
          if (useAsync) {
            result = await csvToJsonAsync(csvData, mergedConversionOptions);
          } else {
            result = csvToJson(csvData, mergedConversionOptions);
          }
          stats.outputSize = Buffer.byteLength(JSON.stringify(result));
          
        } else {
          // Нет необходимости в конвертации
          result = inputData;
          stats.conversion = 'none';
        }

        stats.processingTime = Date.now() - startTime;

        // Сохраняем результат в request object
        req.converted = {
          data: result,
          format: outputFormat,
          inputFormat,
          outputFormat,
          stats,
          options: mergedConversionOptions
        };

        // Устанавливаем соответствующий Content-Type для ответа
        if (outputFormat === 'csv') {
          res.set('Content-Type', 'text/csv; charset=utf-8');
        } else {
          res.set('Content-Type', 'application/json; charset=utf-8');
        }

        next();
      })();

      // Ждем либо обработку, либо таймаут
      await Promise.race([processingPromise, timeoutPromise]);
    } catch (error) {
      // Обработка ошибок конвертации
      const err = error as Error & { code?: string };
      if (process.env.NODE_ENV !== 'test') {
        console.log('[jtcsv-middleware] Conversion error:', err.message, err.stack?.split('\n')[0]);
      }
      
      // Определяем статус код на основе типа ошибки
      let statusCode = 400;
      if (err.message.includes('timeout') || err.message.includes('Timeout')) {
        statusCode = 408; // Request Timeout
      } else if (err.message.includes('File size exceeds limit')) {
        statusCode = 413; // Payload Too Large
      } else if (err instanceof SecurityError) {
        statusCode = 403; // Forbidden
      } else if (err instanceof ValidationError) {
        statusCode = 422; // Unprocessable Entity
      } else if (err instanceof FileSystemError) {
        statusCode = 500; // Internal Server Error
      } else if (err instanceof JtcsvError) {
        statusCode = 400; // Bad Request
      }
      
      const errorResponse: any = {
        success: false,
        error: err.message,
        code: err.code || 'CONVERSION_ERROR',
        timestamp: new Date().toISOString()
      };

      // Добавляем дополнительную информацию для отладки
      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = {
          contentType: req.get('content-type'),
          contentLength: req.get('content-length'),
          method: req.method,
          url: req.url
        };
      }

      res.status(statusCode).json(errorResponse);
    } finally {
      // Очищаем таймаут
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };
}

/**
 * Express route для конвертации CSV в JSON
 * 
 * @param options - Опции конвертации
 * @returns Express route handler
 * 
 * @example
 * app.post('/api/csv-to-json', jtcsvCsvToJsonRoute());
 */
export function jtcsvCsvToJsonRoute(options: Record<string, any> = {}): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const csvData = req.body;
      
      if (!csvData || (typeof csvData !== 'string' && !Buffer.isBuffer(csvData))) {
        res.status(400).json({
          success: false,
          error: 'CSV data is required'
        });
        return;
      }

      const csvString = Buffer.isBuffer(csvData) ? csvData.toString() : csvData;
      const result = await csvToJsonAsync(csvString, options);
      
      res.json({
        success: true,
        data: result,
        stats: {
          rows: result.length,
          processingTime: Date.now() - (req.startTime || Date.now())
        }
      });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        success: false,
        error: err.message
      });
    }
  };
}

/**
 * Express route для конвертации JSON в CSV
 * 
 * @param options - Опции конвертации
 * @returns Express route handler
 * 
 * @example
 * app.post('/api/json-to-csv', jtcsvJsonToCsvRoute());
 */
export function jtcsvJsonToCsvRoute(options: Record<string, any> = {}): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const jsonData = req.body;
      
      if (!jsonData || (typeof jsonData !== 'object' && typeof jsonData !== 'string')) {
        res.status(400).json({
          success: false,
          error: 'JSON data is required'
        });
        return;
      }

      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const result = await jsonToCsvAsync(data, options);
      
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="data.csv"');
      
      res.send(result);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        success: false,
        error: err.message
      });
    }
  };
}

/**
 * Express route для загрузки CSV файла
 * 
 * @param options - Опции конвертации
 * @returns Express route handler
 * 
 * @example
 * const multer = require('multer');
 * const upload = multer({ dest: 'uploads/' });
 * app.post('/api/upload-csv', upload.single('file'), jtcsvUploadCsvRoute());
 */
export function jtcsvUploadCsvRoute(options: Record<string, any> = {}): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(req as any).file) {
        res.status(400).json({
          success: false,
          error: 'CSV file is required'
        });
        return;
      }

      const fs = require('fs').promises;
      const csvData = await fs.readFile((req as any).file.path, 'utf8');
      
      const result = await csvToJsonAsync(csvData, options);
      
      // Очищаем временный файл
      await fs.unlink((req as any).file.path);
      
      res.json({
        success: true,
        data: result,
        stats: {
          rows: result.length,
          fileSize: (req as any).file.size,
          processingTime: Date.now() - (req.startTime || Date.now())
        }
      });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        success: false,
        error: err.message
      });
    }
  };
}

/**
 * Health check endpoint для JTCSV
 * 
 * @returns Express route handler
 * 
 * @example
 * app.get('/api/health', jtcsvHealthCheck());
 */
export function jtcsvHealthCheck(): (req: Request, res: Response) => void {
  return (req: Request, res: Response): void => {
    res.json({
      service: 'jtcsv-express-middleware',
      status: 'healthy',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      features: {
        csvToJson: true,
        jsonToCsv: true,
        fastPathEngine: true,
        csvInjectionProtection: true,
        streaming: true,
        asyncProcessing: true,
        workerPool: true
      }
    });
  };
}

// Экспорт всех функций
export default {
  middleware: jtcsvExpressMiddleware,
  csvToJsonRoute: jtcsvCsvToJsonRoute,
  jsonToCsvRoute: jtcsvJsonToCsvRoute,
  uploadCsvRoute: jtcsvUploadCsvRoute,
  healthCheck: jtcsvHealthCheck,
  
  // Aliases для удобства
  jtcsvMiddleware: jtcsvExpressMiddleware,
  createMiddleware: jtcsvExpressMiddleware
};

