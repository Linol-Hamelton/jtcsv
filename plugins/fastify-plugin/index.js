/**
 * Fastify plugin для JTCSV
 * Плагин для автоматической конвертации CSV/JSON в Fastify приложениях
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

const fp = require('fastify-plugin');
const { csvToJson, jsonToCsv } = require('../../index.js');

/**
 * Fastify plugin для JTCSV
 * 
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Опции плагина
 * @param {Function} next - Callback
 * 
 * @example
 * // Базовое использование
 * const fastify = require('fastify')();
 * await fastify.register(require('@jtcsv/fastify'), {
 *   prefix: '/api/convert'
 * });
 * 
 * @example
 * // С кастомными опциями
 * await fastify.register(require('@jtcsv/fastify'), {
 *   prefix: '/api',
 *   enableFastPath: true,
 *   delimiter: ';'
 * });
 */
async function jtcsvFastifyPlugin(fastify, options = {}) {
  const {
    prefix = '/convert',
    delimiter = ',',
    enableFastPath = true,
    preventCsvInjection = true,
    rfc4180Compliant = true
  } = options;

  // Health check endpoint
  fastify.get(`${prefix}/health`, async () => {
    return {
      service: 'jtcsv-fastify-plugin',
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      features: {
        csvToJson: true,
        jsonToCsv: true,
        fastPathEngine: enableFastPath,
        csvInjectionProtection: preventCsvInjection,
        streaming: true,
        ndjson: true
      }
    };
  });

  // CSV to JSON endpoint
  fastify.post(`${prefix}/csv-to-json`, {
    schema: {
      body: {
        type: 'object',
        required: ['csv'],
        properties: {
          csv: { type: 'string' },
          delimiter: { type: 'string', default: delimiter },
          parseNumbers: { type: 'boolean', default: true },
          parseBooleans: { type: 'boolean', default: true },
          useFastPath: { type: 'boolean', default: enableFastPath }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            stats: {
              type: 'object',
              properties: {
                rows: { type: 'number' },
                processingTime: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();
    const {
      csv,
      delimiter: reqDelimiter = delimiter,
      parseNumbers = true,
      parseBooleans = true,
      useFastPath = enableFastPath
    } = request.body;

    try {
      const json = await csvToJson(csv, {
        delimiter: reqDelimiter,
        parseNumbers,
        parseBooleans,
        useFastPath,
        preventCsvInjection,
        rfc4180Compliant
      });

      return {
        success: true,
        data: json,
        stats: {
          rows: json.length,
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error.message,
        code: 'CSV_CONVERSION_ERROR'
      };
    }
  });

  // JSON to CSV endpoint
  fastify.post(`${prefix}/json-to-csv`, {
    schema: {
      body: {
        type: 'object',
        required: ['json'],
        properties: {
          json: { type: 'array' },
          delimiter: { type: 'string', default: delimiter },
          includeHeaders: { type: 'boolean', default: true },
          useFastPath: { type: 'boolean', default: enableFastPath }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'string' },
            stats: {
              type: 'object',
              properties: {
                size: { type: 'number' },
                processingTime: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();
    const {
      json,
      delimiter: reqDelimiter = delimiter,
      includeHeaders = true,
      useFastPath = enableFastPath
    } = request.body;

    try {
      const csv = await jsonToCsv(json, {
        delimiter: reqDelimiter,
        includeHeaders,
        useFastPath,
        preventCsvInjection,
        rfc4180Compliant
      });

      return {
        success: true,
        data: csv,
        stats: {
          size: Buffer.byteLength(csv),
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error.message,
        code: 'JSON_CONVERSION_ERROR'
      };
    }
  });

  // Универсальный endpoint для автоматической конвертации
  fastify.post(`${prefix}/auto`, {
    schema: {
      body: {
        oneOf: [
          { type: 'string' },  // CSV data
          { type: 'array' },   // JSON array
          { type: 'object' }   // JSON object
        ]
      },
      headers: {
        type: 'object',
        properties: {
          'content-type': { 
            type: 'string',
            enum: ['application/json', 'text/csv', 'text/plain']
          },
          'accept': { 
            type: 'string',
            enum: ['application/json', 'text/csv']
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv'] },
          delimiter: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();
    const contentType = request.headers['content-type'] || '';
    const acceptHeader = request.headers['accept'] || 'application/json';
    const { format, delimiter: queryDelimiter } = request.query;
    
    const reqDelimiter = queryDelimiter || delimiter;
    
    try {
      let inputFormat = 'unknown';
      let outputFormat = format || (acceptHeader.includes('text/csv') ? 'csv' : 'json');
      
      // Определяем формат входных данных
      if (contentType.includes('application/json') || Array.isArray(request.body)) {
        inputFormat = 'json';
      } else if (contentType.includes('text/csv') || 
                contentType.includes('text/plain') ||
                (typeof request.body === 'string' && request.body.includes(','))) {
        inputFormat = 'csv';
      }

      if (inputFormat === 'unknown') {
        reply.code(400);
        return {
          success: false,
          error: 'Unable to determine input format',
          code: 'UNKNOWN_FORMAT'
        };
      }

      let result;
      let stats = {
        inputSize: 0,
        outputSize: 0,
        processingTime: 0,
        conversion: `${inputFormat}→${outputFormat}`
      };

      const conversionOptions = {
        delimiter: reqDelimiter,
        useFastPath: enableFastPath,
        preventCsvInjection,
        rfc4180Compliant
      };

      if (inputFormat === 'json' && outputFormat === 'csv') {
        const jsonData = Array.isArray(request.body) ? request.body : [request.body];
        stats.inputSize = Buffer.byteLength(JSON.stringify(jsonData));
        
        result = await jsonToCsv(jsonData, {
          ...conversionOptions,
          includeHeaders: true
        });
        stats.outputSize = Buffer.byteLength(result);
        
        reply.header('Content-Type', 'text/csv; charset=utf-8');
        
      } else if (inputFormat === 'csv' && outputFormat === 'json') {
        const csvData = typeof request.body === 'string' ? request.body : String(request.body);
        stats.inputSize = Buffer.byteLength(csvData);
        
        result = await csvToJson(csvData, {
          ...conversionOptions,
          parseNumbers: true,
          parseBooleans: true
        });
        stats.outputSize = Buffer.byteLength(JSON.stringify(result));
        
        reply.header('Content-Type', 'application/json; charset=utf-8');
        
      } else {
        // Нет необходимости в конвертации
        result = request.body;
        stats.conversion = 'none';
        stats.inputSize = Buffer.byteLength(JSON.stringify(result));
        stats.outputSize = stats.inputSize;
      }

      stats.processingTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        format: outputFormat,
        inputFormat,
        stats
      };

    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: error.message,
        code: 'CONVERSION_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  });

  // Streaming endpoint для больших файлов
  fastify.post(`${prefix}/stream`, {
    schema: {
      body: {
        type: 'object',
        required: ['direction'],
        properties: {
          direction: { 
            type: 'string', 
            enum: ['csv-to-json', 'json-to-csv'] 
          },
          delimiter: { type: 'string', default: delimiter }
        }
      }
    }
  }, async (request, reply) => {
    const { direction, delimiter: reqDelimiter = delimiter } = request.body;
    
    if (direction === 'csv-to-json') {
      reply.header('Content-Type', 'application/x-ndjson');
      reply.header('Transfer-Encoding', 'chunked');
      
      // Здесь будет реализация streaming
      // Пока возвращаем заглушку
      reply.send(JSON.stringify({
        success: false,
        error: 'Streaming endpoint not implemented yet',
        code: 'NOT_IMPLEMENTED'
      }));
      
    } else if (direction === 'json-to-csv') {
      reply.header('Content-Type', 'text/csv');
      reply.header('Transfer-Encoding', 'chunked');
      
      // Здесь будет реализация streaming
      reply.send('Streaming endpoint not implemented yet\n');
    }
  });

  // Декоратор для прямого доступа к функциям конвертации
  fastify.decorate('jtcsv', {
    csvToJson: async (csv, options = {}) => {
      return csvToJson(csv, {
        delimiter,
        useFastPath: enableFastPath,
        preventCsvInjection,
        rfc4180Compliant,
        ...options
      });
    },
    
    jsonToCsv: async (json, options = {}) => {
      return jsonToCsv(json, {
        delimiter,
        useFastPath: enableFastPath,
        preventCsvInjection,
        rfc4180Compliant,
        ...options
      });
    },
    
    health: () => ({
      service: 'jtcsv-fastify-plugin',
      status: 'healthy',
      version: '1.0.0'
    })
  });

  console.log(`✅ JTCSV Fastify plugin зарегистрирован с префиксом: ${prefix}`);
}

// Экспортируем как Fastify plugin
module.exports = fp(jtcsvFastifyPlugin, {
  fastify: '4.x',
  name: '@jtcsv/fastify'
});

// Экспортируем также как обычную функцию
module.exports.jtcsvFastifyPlugin = jtcsvFastifyPlugin;


