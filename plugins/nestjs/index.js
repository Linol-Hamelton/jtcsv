const { Injectable, UseInterceptors } = require('@nestjs/common');
const { map } = require('rxjs/operators');
const jtcsv = require('jtcsv');

function normalizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'export.csv';
  }
  return filename.includes('.') ? filename : `${filename}.csv`;
}

function createCsvParserInterceptor(options = {}) {
  class CsvParserInterceptorImpl {
    intercept(context, next) {
      const req = context.switchToHttp().getRequest();
      const body = req && req.body;

      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        const csv = Buffer.isBuffer(body) ? body.toString('utf8') : body;
        req.body = jtcsv.csvToJson(csv, options);
      }

      return next.handle();
    }
  }

  Injectable()(CsvParserInterceptorImpl);
  return CsvParserInterceptorImpl;
}

function createCsvDownloadInterceptor(options = {}) {
  class CsvDownloadInterceptorImpl {
    intercept(context, next) {
      const res = context.switchToHttp().getResponse();
      const filename = normalizeFilename(options.filename);
      const csvOptions = { ...options };
      delete csvOptions.filename;

      return next.handle().pipe(
        map(data => {
          const rows = Array.isArray(data) ? data : [data];
          const csv = jtcsv.jsonToCsv(rows, csvOptions);

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

  Injectable()(CsvDownloadInterceptorImpl);
  return CsvDownloadInterceptorImpl;
}

function CsvParserInterceptor(options = {}) {
  const Interceptor = createCsvParserInterceptor(options);
  return UseInterceptors(new Interceptor());
}

function CsvDownloadDecorator(options = {}) {
  const Interceptor = createCsvDownloadInterceptor(options);
  return UseInterceptors(new Interceptor());
}

module.exports = {
  CsvParserInterceptor,
  CsvDownloadDecorator,
  createCsvParserInterceptor,
  createCsvDownloadInterceptor
};
