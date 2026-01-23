/**
 * Express middleware для JTCSV
 * Автоматическая конвертация CSV/JSON в HTTP запросах
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

const { csvToJson, jsonToCsv } = require('../../index.js');

/**
 * Express middleware для обработки CSV/JSON конвертации
 * 
 * @param {Object} options - Опции middleware
 * @param {string} options.maxSize - Максимальный размер тела запроса (default: '10mb')
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
 *   delimiter: ';',
 *   enableFastPath: true
 * }));
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
function jtcsvExpressMiddleware(options = {}) {
  const {
    maxSize = '10mb',
    autoDetect = true,
    delimiter = ',',
    enableFastPath = true,
    preventCsvInjection = true,
    rfc4180Compliant = true
  } = options;

  return async (req, res, next) => {
    // Пропускаем запросы без тела
    if (!req.body || (typeof req.body !== 'string' && typeof req.body !== 'object')) {
      return next();
    }

    const contentType = req.get('content-type') || '';
    const acceptHeader = req.get('accept') || 'application/json';
    
    try {
      // Определяем формат входных данных
      let inputFormat = 'unknown';
      let inputData = req.body;
      
      if (autoDetect) {
        if (contentType.includes('application/json') || 
            (typeof req.body === 'object' && !Array.isArray(req.body))) {
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
        ...req.query,
        ...options.conversionOptions
      };

      // Удаляем параметры, которые не относятся к конвертации
      delete conversionOptions.maxSize;
      delete conversionOptions.autoDetect;
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

    } catch (error) {
      // Обработка ошибок конвертации
      const errorResponse = {
        success: false,
        error: error.message,
        code: error.code || 'CONVERSION_ERROR',
        timestamp: new Date().toISOString()
      };

      // Добавляем дополнительную информацию для отладки
      if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
        errorResponse.details = {
          contentType: req.get('content-type'),
          contentLength: req.get('content-length'),
          method: req.method,
          url: req.url
        };
      }

      res.status(400).json(errorResponse);
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
  return async (req, res) => {
    try {
      const csvData = req.body;
      
      if (!csvData || (typeof csvData !== 'string' && !Buffer.isBuffer(csvData))) {
        return res.status(400).json({
          success: false,
          error: 'CSV data is required'
        });
      }

      const result = await csvToJson(csvData, options);
      
      res.json({
        success: true,
        data: result,
        stats: {
          rows: result.length,
          processingTime: Date.now() - req.startTime
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
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
  return async (req, res) => {
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
      
      res.send(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
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
  return async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'CSV file is required'
        });
      }

      const fs = require('fs').promises;
      const csvData = await fs.readFile(req.file.path, 'utf8');
      
      const result = await csvToJson(csvData, options);
      
      // Очищаем временный файл
      await fs.unlink(req.file.path);
      
      res.json({
        success: true,
        data: result,
        stats: {
          rows: result.length,
          fileSize: req.file.size,
          processingTime: Date.now() - req.startTime
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
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
  return (req, res) => {
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