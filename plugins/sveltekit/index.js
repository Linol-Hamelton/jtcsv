const jtcsv = require('jtcsv');

function normalizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'export.csv';
  }
  return filename.includes('.') ? filename : `${filename}.csv`;
}

async function parseCsv(request, options = {}) {
  if (!request || typeof request.text !== 'function') {
    throw new Error('parseCsv expects a Request instance');
  }

  const { fieldName = 'file', ...csvOptions } = options;
  const contentType = request.headers?.get?.('content-type') || '';
  let csvText = null;

  if (options.formData || contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const value = formData.get(fieldName) ?? formData.values().next().value;
    if (value && typeof value.text === 'function') {
      csvText = await value.text();
    } else if (value !== null) {
      csvText = String(value);
    }
  } else {
    csvText = await request.text();
  }

  if (!csvText) {
    throw new Error('No CSV payload found in request');
  }

  return jtcsv.csvToJson(csvText, csvOptions);
}

function generateCsv(data, filename = 'export.csv', options = {}) {
  const safeName = normalizeFilename(filename);
  const rows = Array.isArray(data) ? data : [data];
  const csv = jtcsv.jsonToCsv(rows, options);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`
    }
  });
}

module.exports = {
  parseCsv,
  generateCsv
};
