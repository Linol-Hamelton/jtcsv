const jtcsv = require('jtcsv');

function normalizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'export.csv';
  }
  return filename.includes('.') ? filename : `${filename}.csv`;
}

function csvMiddleware(options = {}) {
  return async (c, next) => {
    const csvText = await c.req.text();
    const rows = jtcsv.csvToJson(csvText, options);
    c.set('csv', rows);
    await next();
  };
}

function createCsvResponse(data, filename = 'export.csv', options = {}) {
  const safeName = normalizeFilename(filename);
  const rows = Array.isArray(data) ? data : [data];
  const csv = jtcsv.jsonToCsv(rows, options);

  return {
    csv,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`
    }
  };
}

module.exports = {
  csvMiddleware,
  createCsvResponse
};
