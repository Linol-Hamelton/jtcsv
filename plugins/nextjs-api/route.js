/**
 * Next.js API Route для JTCSV
 * Готовый API endpoint для конвертации CSV/JSON в Next.js приложениях
 * 
 * @version 1.0.0
 * @date 2026-01-23
 * 
 * @usage
 * 1. Скопируйте этот файл в pages/api/convert.js
 * 2. Или импортируйте функции в существующие API routes
 */

import { csvToJson, jsonToCsv } from 'jtcsv';

/**
 * Конфигурация Next.js API route
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',  // Максимальный размер тела запроса
      
      // Кастомный парсер для определения формата
      parse: (req) => {
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
          return JSON.parse(req.body);
        } else if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
          return req.body;
        }
        
        // Пытаемся определить автоматически
        try {
          return JSON.parse(req.body);
        } catch {
          return req.body;
        }
      }
    }
  }
};

/**
 * Основной обработчик API route
 * 
 * @param {import('next').NextApiRequest} req - Next.js request object
 * @param {import('next').NextApiResponse} res - Next.js response object
 * 
 * @example
 * // Пример запроса:
 * // POST /api/convert
 * // Content-Type: application/json
 * // Body: [{ "name": "John", "age": 30 }]
 * 
 * @example
 * // Пример запроса:
 * // POST /api/convert?format=csv
 * // Content-Type: text/csv
 * // Body: name,age\nJohn,30\nJane,25
 */
export default async function handler(req, res) {
  // Поддерживаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowed: ['POST']
    });
  }

  const startTime = Date.now();
  const contentType = req.headers['content-type'] || '';
  const acceptHeader = req.headers['accept'] || 'application/json';
  
  try {
    const { 
      format, 
      delimiter = ',',
      includeHeaders = 'true',
      parseNumbers = 'true',
      parseBooleans = 'true',
      useFastPath = 'true',
      preventCsvInjection = 'true'
    } = req.query;

    // Определяем желаемый формат вывода
    let outputFormat = format || (acceptHeader.includes('text/csv') ? 'csv' : 'json');
    
    // Определяем формат входных данных
    let inputFormat = 'unknown';
    
    if (contentType.includes('application/json') || Array.isArray(req.body)) {
      inputFormat = 'json';
    } else if (contentType.includes('text/csv') || 
              contentType.includes('text/plain') ||
              (typeof req.body === 'string' && req.body.includes(','))) {
      inputFormat = 'csv';
    }

    if (inputFormat === 'unknown') {
      return res.status(400).json({
        success: false,
        error: 'Unable to determine input format',
        code: 'UNKNOWN_FORMAT',
        suggestions: [
          'Set Content-Type header to application/json or text/csv',
          'Or send JSON array/object or CSV string'
        ]
      });
    }

    // Опции конвертации
    const options = {
      delimiter,
      includeHeaders: includeHeaders === 'true',
      parseNumbers: parseNumbers === 'true',
      parseBooleans: parseBooleans === 'true',
      useFastPath: useFastPath === 'true',
      preventCsvInjection: preventCsvInjection === 'true',
      rfc4180Compliant: true
    };

    let result;
    let stats = {
      inputSize: 0,
      outputSize: 0,
      processingTime: 0,
      conversion: `${inputFormat}→${outputFormat}`
    };

    // Выполняем конвертацию
    if (inputFormat === 'json' && outputFormat === 'csv') {
      const jsonData = Array.isArray(req.body) ? req.body : [req.body];
      stats.inputSize = Buffer.byteLength(JSON.stringify(jsonData));
      
      result = await jsonToCsv(jsonData, options);
      stats.outputSize = Buffer.byteLength(result);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
      
    } else if (inputFormat === 'csv' && outputFormat === 'json') {
      const csvData = typeof req.body === 'string' ? req.body : String(req.body);
      stats.inputSize = Buffer.byteLength(csvData);
      
      result = await csvToJson(csvData, options);
      stats.outputSize = Buffer.byteLength(JSON.stringify(result));
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      
    } else {
      // Нет необходимости в конвертации
      result = req.body;
      stats.conversion = 'none';
      stats.inputSize = Buffer.byteLength(JSON.stringify(result));
      stats.outputSize = stats.inputSize;
    }

    stats.processingTime = Date.now() - startTime;

    // Формируем ответ
    const response = {
      success: true,
      data: result,
      format: outputFormat,
      inputFormat,
      stats,
      options: {
        ...options,
        delimiter
      }
    };

    // Если запрашивали CSV, отправляем как plain text
    if (outputFormat === 'csv') {
      return res.status(200).send(result);
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Conversion error:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      code: error.code || 'CONVERSION_ERROR',
      timestamp: new Date().toISOString()
    };

    // Добавляем дополнительную информацию для отладки в development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.details = {
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        method: req.method,
        url: req.url,
        query: req.query
      };
    }

    return res.status(400).json(errorResponse);
  }
}

/**
 * Специализированный обработчик для CSV → JSON
 */
export async function csvToJsonHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowed: ['POST']
    });
  }

  const startTime = Date.now();
  
  try {
    const csvData = req.body;
    
    if (!csvData || (typeof csvData !== 'string' && !Buffer.isBuffer(csvData))) {
      return res.status(400).json({
        success: false,
        error: 'CSV data is required'
      });
    }

    const {
      delimiter = ',',
      parseNumbers = 'true',
      parseBooleans = 'true',
      useFastPath = 'true'
    } = req.query;

    const result = await csvToJson(csvData, {
      delimiter,
      parseNumbers: parseNumbers === 'true',
      parseBooleans: parseBooleans === 'true',
      useFastPath: useFastPath === 'true',
      preventCsvInjection: true,
      rfc4180Compliant: true
    });

    return res.status(200).json({
      success: true,
      data: result,
      stats: {
        rows: result.length,
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Специализированный обработчик для JSON → CSV
 */
export async function jsonToCsvHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowed: ['POST']
    });
  }

  const startTime = Date.now();
  
  try {
    const jsonData = req.body;
    
    if (!jsonData || (typeof jsonData !== 'object' && typeof jsonData !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'JSON data is required'
      });
    }

    const {
      delimiter = ',',
      includeHeaders = 'true',
      useFastPath = 'true'
    } = req.query;

    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    const result = await jsonToCsv(data, {
      delimiter,
      includeHeaders: includeHeaders === 'true',
      useFastPath: useFastPath === 'true',
      preventCsvInjection: true,
      rfc4180Compliant: true
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
    
    return res.status(200).send(result);

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Health check endpoint
 */
export async function healthCheckHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowed: ['GET']
    });
  }

  return res.status(200).json({
    service: 'jtcsv-nextjs-api',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      csvToJson: true,
      jsonToCsv: true,
      fastPathEngine: true,
      csvInjectionProtection: true,
      streaming: true,
      ndjson: true
    }
  });
}

/**
 * Утилита для создания кастомных API endpoints
 */
export function createJtcsvApiEndpoint(options = {}) {
  const {
    route = '/api/convert',
    allowedMethods = ['POST'],
    defaultFormat = 'json',
    ...defaultOptions
  } = options;

  return async function customHandler(req, res) {
    // Проверяем разрешенные методы
    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`,
        allowed: allowedMethods
      });
    }

    // Здесь можно добавить кастомную логику
    // Пока просто используем основной handler
    return handler(req, res);
  };
}

