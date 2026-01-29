/// <reference path="../../index.d.ts" />
/**
 * Express middleware для JTCSV
 * Автоматическая конвертация CSV/JSON в HTTP запросах
 *
 * @version 1.0.0
 * @date 2026-01-23
 */

// @ts-ignore
const { csvToJson, jsonToCsv } = require('../../index.js');

/**
 * Преобразует строку размера (например, '500MB') в байты
 * @param {string} sizeStr - Строка размера (например, '10MB', '1GB', '500KB')
 * @returns {number} Размер в байтах
 */
function parseSizeToBytes(sizeStr) {
  if (typeof sizeStr === 'number') return sizeStr;
  if (typeof sizeStr !== 'string') return 10 * 1024 * 1024; // default 10MB
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return 10 * 1024 * 1024;
  
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
 * @param {Object} options - Опции middleware
 * @param {string} options.maxSize - Максимальный размер тела запроса (default: '10mb')
 * @param {string} options.maxFileSize - Максимальный размер файла (например, '500MB', default: '500MB')
 * @param {number} options.maxFieldSize - Максимальный размер поля в байтах (default: 1MB)
 * @param {number} options.timeout - Таймаут обработки в миллисекундах (default: 300000 = 5 минут)
 * @param {boolean} options.autoDetect - Автоматическое определение формата (default: true)
 * @param {string} options.delimiter - Разделитель CSV (default: ',')
 * @param {boolean} options.enableFastPath - Включить Fast-Path Engine (default: true)
 * @param {boolean} options.preventCsvInjection - Защита от CSV инъекций (default: true)
 * 
 * @returns {Function} Express middleware
 * 
 * @example
 * // Базовое использование
 * const app = express();
 * app.use(express.json());
 * app.use(express.text({ type: 'text/csv' }));
 * app.use(jtcsvMiddleware());
 * 
 * @example
 * // С кастомными опциями
 * app.use(jtcsvMiddleware({
 *   maxSize: '50mb',
 *   maxFileSize: '1GB',
 *   maxFieldSize: 5 * 1024 * 1024, // 5MB
 *   timeout: 600000, // 10 минут
 *   delimiter: ';',
 *   enableFastPath: true
 * }));
 * 
 * @example
 * // Использование с rate limiting
 * import rateLimit from 'express-rate-limit';
 * const importLimiter = rateLimit({
 *   windowMs: 15 * 60 * 1000,
 *   max: 10
 * });
 * app.post('/api/import', importLimiter, jtcsvMiddleware());
 * 
 * @example
 * // Использование в роуте
 * app.post('/api/convert', (req, res) => {
 *   // Конвертированные данные доступны в req.converted
 *   res.json({
 *     success: true,
 *     data: req.converted.data,
 *     format: req.converted.format
 *   });
 * });
 */
/**
 * @typedef {Object} JtcsvExpressMiddlewareOptions
 * @property {string} [maxSize='10mb'] - Максимальный размер тела запроса
 * @property {string} [maxFileSize='500MB'] - Максимальный размер файла
 * @property {number} [maxFieldSize=1048576] - Максимальный размер поля в байтах (1MB)
 * @property {number} [timeout=300000] - Таймаут обработки в миллисекундах (5 минут)
 * @property {boolean} [autoDetect=true] - Автоматическое определение формата
 * @property {string} [delimiter=','] - Разделитель CSV
 * @property {boolean} [enableFastPath=true] - Включить Fast-Path Engine
 * @property {boolean} [preventCsvInjection=true] - Защита от CSV инъекций
 * @property {boolean} [rfc4180Compliant=true] - Соблюдение RFC4180
 * @property {Object} [conversionOptions] - Дополнительные опции конвертации
 */

/**
 * Express middleware для обработки CSV/JSON конвертации
 * 
 * @param {JtcsvExpressMiddlewareOptions} options - Опции middleware
 * @returns {Function} Express middleware
 */
function jtcsvExpressMiddleware(options = {}) {
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
    conversionOptions = {}
  } = options;

  return async (/** @type {import('express').Request} */ req, /** @type {import('express').Response} */ res, /** @type {import('express').NextFunction} */ next) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[jtcsv-middleware] Request received:', req.method, req.url, req.headers['content-type']);
    }
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
        return res.status(413).json({
          success: false,
          error: `File size exceeds limit of ${maxFileSize}`,
          code: 'FILE_SIZE_LIMIT_EXCEEDED'
        });
      }
    }

    const contentType = req.get('content-type') || '';
    const acceptHeader = req.get('accept') || 'application/json';
    
    // Определяем формат входных данных заранее
    let inputFormat = 'unknown';
    let inputData = req.body;
  
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
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Request processing timeout (${timeout}ms)`));
      }, timeout);
    });
    
    try {
      // Обернем основную логику в Promise.race с таймаутом
      const processingPromise = (async () => {

        // Определяем желаемый формат вывода на основе Accept header
        let outputFormat = 'json';
        if (acceptHeader.includes('text/csv')) {
          outputFormat = 'csv';
        } else if (req.query.format === 'csv') {
          outputFormat = 'csv';
        } else if (req.body.format === 'csv') {
          outputFormat = 'csv';
        }

        // Опции конвертации
        const conversionOptions = {
          delimiter,
          preventCsvInjection,
          rfc4180Compliant,
          useFastPath: enableFastPath,
          maxFieldSize,
          ...req.query,
          ...options.conversionOptions
        };

        // Удаляем параметры, которые не относятся к конвертации
        // @ts-ignore
        delete conversionOptions.maxSize;
        // @ts-ignore
        delete conversionOptions.maxFileSize;
        // @ts-ignore
        delete conversionOptions.maxFieldSize;
        // @ts-ignore
        delete conversionOptions.timeout;
        // @ts-ignore
        delete conversionOptions.autoDetect;
        // @ts-ignore
        delete conversionOptions.enableFastPath;

        let result;
        let stats = {
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
          
          result = await jsonToCsv(jsonData, conversionOptions);
          stats.outputSize = Buffer.byteLength(result);
          
        } else if (inputFormat === 'csv' && outputFormat === 'json') {
          const csvData = typeof inputData === 'string' ? inputData : String(inputData);
          stats.inputSize = Buffer.byteLength(csvData);
          
          result = await csvToJson(csvData, conversionOptions);
          stats.outputSize = Buffer.byteLength(JSON.stringify(result));
          
        } else {
          // Нет необходимости в конвертации
          result = inputData;
          stats.conversion = 'none';
        }

        stats.processingTime = Date.now() - startTime;

        // Сохраняем результат в request object
        // @ts-ignore
        req.converted = {
          data: result,
          format: outputFormat,
          inputFormat,
          outputFormat,
          stats,
          options: conversionOptions
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
      const err = /** @type {Error & { code?: string }} */ (error);
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[jtcsv-middleware] Conversion error:`, err.message, err.stack?.split('\n')[0]);
      }
      
      // Определяем статус код на основе типа ошибки
      let statusCode = 400;
      if (err.message.includes('timeout') || err.message.includes('Timeout')) {
        statusCode = 408; // Request Timeout
      } else if (err.message.includes('File size exceeds limit')) {
        statusCode = 413; // Payload Too Large
      }
      
      const errorResponse = {
        success: false,
        error: err.message,
        code: err.code || 'CONVERSION_ERROR',
        timestamp: new Date().toISOString()
      };

      // Добавляем дополнительную информацию для отладки
      if (process.env.NODE_ENV === 'development') {
        // @ts-ignore
        errorResponse.stack = err.stack;
        // @ts-ignore
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
 * @param {Object} options - Опции конвертации
 * @returns {Function} Express route handler
 * 
 * @example
 * app.post('/api/csv-to-json', jtcsvCsvToJsonRoute());
 */
function jtcsvCsvToJsonRoute(options = {}) {
  return async (/** @type {import('express').Request} */ req, /** @type {import('express').Response} */ res) => {
    try {
      const csvData = req.body;
      
      if (!csvData || (typeof csvData !== 'string' && !Buffer.isBuffer(csvData))) {
        return res.status(400).json({
          success: false,
          error: 'CSV data is required'
        });
      }

      const csvString = Buffer.isBuffer(csvData) ? csvData.toString() : csvData;
      const result = await csvToJson(csvString, options);
      
      return res.json({
        success: true,
        data: result,
        stats: {
          rows: result.length,
          processingTime: Date.now() - (/** @type {any} */ (req).startTime || Date.now())
        }
      });
    } catch (error) {
      const err = /** @type {Error} */ (error);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  };
}

/**
 * Express route для конвертации JSON в CSV
 * 
 * @param {Object} options - Опции конвертации
 * @returns {Function} Express route handler
 * 
 * @example
 * app.post('/api/json-to-csv', jtcsvJsonToCsvRoute());
 */
function jtcsvJsonToCsvRoute(options = {}) {
  return async (/** @type {import('express').Request} */ req, /** @type {import('express').Response} */ res) => {
    try {
      const jsonData = req.body;
      
      if (!jsonData || (typeof jsonData !== 'object' && typeof jsonData !== 'string')) {
        return res.status(400).json({
          success: false,
          error: 'JSON data is required'
        });
      }

      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      const result = await jsonToCsv(data, options);
      
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="data.csv"');
      
      return res.send(result);
    } catch (error) {
      const err = /** @type {Error} */ (error);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  };
}

/**
 * Express route для загрузки CSV файла
 * 
 * @param {Object} options - Опции конвертации
 * @returns {Function} Express route handler
 * 
 * @example
 * const multer = require('multer');
 * const upload = multer({ dest: 'uploads/' });
 * app.post('/api/upload-csv', upload.single('file'), jtcsvUploadCsvRoute());
 */
function jtcsvUploadCsvRoute(options = {}) {
  return async (/** @type {import('express').Request} */ req, /** @type {import('express').Response} */ res) => {
    try {
      // @ts-ignore
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'CSV file is required'
        });
      }

      const fs = require('fs').promises;
      // @ts-ignore
      const csvData = await fs.readFile(req.file.path, 'utf8');
      
      const result = await csvToJson(csvData, options);
      
      // Очищаем временный файл
      // @ts-ignore
      await fs.unlink(req.file.path);
      
      return res.json({
        success: true,
        data: result,
        stats: {
          rows: result.length,
          // @ts-ignore
          fileSize: req.file.size,
          processingTime: Date.now() - (/** @type {any} */ (req).startTime || Date.now())
        }
      });
    } catch (error) {
      const err = /** @type {Error} */ (error);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  };
}

/**
 * Health check endpoint для JTCSV
 * 
 * @returns {Function} Express route handler
 * 
 * @example
 * app.get('/api/health', jtcsvHealthCheck());
 */
function jtcsvHealthCheck() {
  return (/** @type {import('express').Request} */ req, /** @type {import('express').Response} */ res) => {
    res.json({
      service: 'jtcsv-express-middleware',
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      features: {
        csvToJson: true,
        jsonToCsv: true,
        fastPathEngine: true,
        csvInjectionProtection: true,
        streaming: true
      }
    });
  };
}

module.exports = {
  middleware: jtcsvExpressMiddleware,
  csvToJsonRoute: jtcsvCsvToJsonRoute,
  jsonToCsvRoute: jtcsvJsonToCsvRoute,
  uploadCsvRoute: jtcsvUploadCsvRoute,
  healthCheck: jtcsvHealthCheck,
  
  // Aliases для удобства
  jtcsvMiddleware: jtcsvExpressMiddleware,
  createMiddleware: jtcsvExpressMiddleware
};


