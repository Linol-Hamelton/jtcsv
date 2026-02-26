'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// Note: This is a simplified JS version
// For full functionality, use the TypeScript version

const { csvToJson, jsonToCsv, csvToJsonAsync, jsonToCsvAsync } = require('jtcsv');
const { switchMap } = require('rxjs/operators');

/**
 * Options for CSV parser interceptor
 */
const CsvParserOptions = {};

/**
 * Options for CSV download interceptor
 */
const CsvDownloadOptions = {};

/**
 * NestJS Service for CSV/JSON conversion
 */
class JtcsvService {
  /**
   * Convert CSV string to JSON array
   * @param {string} csv - CSV string
   * @param {Object} options - Conversion options
   * @returns {Array} JSON array
   */
  csvToJson(csv, options = {}) {
    return csvToJson(csv, options);
  }

  /**
   * Convert JSON array to CSV string
   * @param {Array} json - JSON array
   * @param {Object} options - Conversion options
   * @returns {string} CSV string
   */
  jsonToCsv(json, options = {}) {
    return jsonToCsv(json, options);
  }

  /**
   * Async CSV to JSON conversion
   * @param {string} csv - CSV string
   * @param {Object} options - Conversion options
   * @returns {Promise<Array>} Promise resolving to JSON array
   */
  async csvToJsonAsync(csv, options = {}) {
    return csvToJsonAsync(csv, options);
  }

  /**
   * Async JSON to CSV conversion
   * @param {Array} json - JSON array
   * @param {Object} options - Conversion options
   * @returns {Promise<string>} Promise resolving to CSV string
   */
  async jsonToCsvAsync(json, options = {}) {
    return jsonToCsvAsync(json, options);
  }
}

/**
 * NestJS Pipe for CSV parsing
 * Usage: @UsePipes(new ParseCsvPipe(options))
 */
class ParseCsvPipe {
  constructor(options = {}) {
    this.options = options;
  }

  transform(value) {
    if (typeof value === 'string') {
      return csvToJson(value, this.options);
    }
    if (Buffer.isBuffer(value)) {
      return csvToJson(value.toString('utf8'), this.options);
    }
    return value;
  }
}

/**
 * NestJS Pipe for JSON to CSV
 * Usage: @UsePipes(new JsonToCsvPipe(options))
 */
class JsonToCsvPipe {
  constructor(options = {}) {
    this.options = options;
  }

  transform(value) {
    if (Array.isArray(value)) {
      return jsonToCsv(value, this.options);
    }
    return value;
  }
}

/**
 * Normalize filename for CSV download
 */
function normalizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'export.csv';
  }
  return filename.includes('.') ? filename : `${filename}.csv`;
}

/**
 * Creates a CSV parser interceptor for NestJS
 */
function createCsvParserInterceptor(options = {}) {
  class CsvParserInterceptorImpl {
    async intercept(context, next) {
      const req = context.switchToHttp().getRequest();
      const body = req && req.body;

      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        const csv = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        req.body = await csvToJsonAsync(csv, options);
      }

      return next.handle();
    }
  }

  return CsvParserInterceptorImpl;
}

/**
 * Creates a CSV download interceptor for NestJS
 */
function createCsvDownloadInterceptor(options = {}) {
  class CsvDownloadInterceptorImpl {
    intercept(context, next) {
      const res = context.switchToHttp().getResponse();
      const filename = normalizeFilename(options.filename);
      const csvOptions = { ...options };
      delete csvOptions.filename;

      return next.handle().pipe(
        switchMap(async (data) => {
          const rows = Array.isArray(data) ? data : [data];
          const csv = await jsonToCsvAsync(rows, csvOptions);

          if (res && typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${filename}"`
            );
          }

          return csv;
        })
      );
    }
  }

  return CsvDownloadInterceptorImpl;
}

/**
 * Decorator for CSV parsing interceptor
 */
function CsvParserInterceptor(options = {}) {
  return createCsvParserInterceptor(options);
}

/**
 * Decorator for CSV download interceptor
 */
function CsvDownloadDecorator(options = {}) {
  return createCsvDownloadInterceptor(options);
}

/**
 * Creates an async CSV parser interceptor for NestJS
 * Parses incoming CSV request bodies into JSON (async version)
 */
function createAsyncCsvParserInterceptor(options = {}) {
  class AsyncCsvParserInterceptorImpl {
    async intercept(context, next) {
      const req = context.switchToHttp().getRequest();
      const body = req && req.body;

      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        const csv = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        req.body = await csvToJsonAsync(csv, options);
      }

      return next.handle();
    }
  }

  return AsyncCsvParserInterceptorImpl;
}

/**
 * Creates an async CSV download interceptor for NestJS
 * Converts JSON responses to CSV and sets appropriate headers (async version)
 */
function createAsyncCsvDownloadInterceptor(options = {}) {
  class AsyncCsvDownloadInterceptorImpl {
    async intercept(context, next) {
      const res = context.switchToHttp().getResponse();
      const filename = normalizeFilename(options.filename);
      const csvOptions = { ...options };
      delete csvOptions.filename;

      return next.handle().pipe(
        switchMap(async (data) => {
          const rows = Array.isArray(data) ? data : [data];
          const csv = await jsonToCsvAsync(rows, csvOptions);

          if (res && typeof res.setHeader === 'function') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${filename}"`
            );
          }

          return csv;
        })
      );
    }
  }

  return AsyncCsvDownloadInterceptorImpl;
}

/**
 * Async decorator for CSV parsing interceptor
 * Usage: @AsyncCsvParserInterceptor({ delimiter: ',' })
 */
function AsyncCsvParserInterceptor(options = {}) {
  const Interceptor = createAsyncCsvParserInterceptor(options);
  return Interceptor;
}

/**
 * Async decorator for CSV download interceptor
 * Usage: @AsyncCsvDownloadDecorator({ filename: 'data.csv' })
 */
function AsyncCsvDownloadDecorator(options = {}) {
  const Interceptor = createAsyncCsvDownloadInterceptor(options);
  return Interceptor;
}

/**
 * NestJS Module
 */
class JtcsvModule {
  static forRoot() {
    return {
      module: JtcsvModule,
      providers: [JtcsvService, ParseCsvPipe, JsonToCsvPipe],
      exports: [JtcsvService, ParseCsvPipe, JsonToCsvPipe]
    };
  }

  static forChild() {
    return {
      module: JtcsvModule,
      providers: [JtcsvService],
      exports: [JtcsvService]
    };
  }
}

exports.JtcsvService = JtcsvService;
exports.ParseCsvPipe = ParseCsvPipe;
exports.JsonToCsvPipe = JsonToCsvPipe;
exports.JtcsvModule = JtcsvModule;
exports.CsvParserInterceptor = CsvParserInterceptor;
exports.CsvDownloadDecorator = CsvDownloadDecorator;
exports.AsyncCsvParserInterceptor = AsyncCsvParserInterceptor;
exports.AsyncCsvDownloadDecorator = AsyncCsvDownloadDecorator;
exports.createCsvParserInterceptor = createCsvParserInterceptor;
exports.createCsvDownloadInterceptor = createCsvDownloadInterceptor;
exports.createAsyncCsvParserInterceptor = createAsyncCsvParserInterceptor;
exports.createAsyncCsvDownloadInterceptor = createAsyncCsvDownloadInterceptor;
