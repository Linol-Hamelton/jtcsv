const jtcsv = require('jtcsv');

function normalizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'export.csv';
  }
  return filename.includes('.') ? filename : `${filename}.csv`;
}

async function extractCsvText(formData, fieldName) {
  if (formData.has(fieldName)) {
    const value = formData.get(fieldName);
    if (value && typeof value.text === 'function') {
      return await value.text();
    }
    if (value != null) {
      return String(value);
    }
  }

  for (const value of formData.values()) {
    if (value && typeof value.text === 'function') {
      return await value.text();
    }
  }

  return null;
}

async function parseFormData(request, options = {}) {
  if (!request || typeof request.formData !== 'function') {
    throw new Error('parseFormData expects a Remix Request with formData()');
  }

  const { fieldName = 'file', ...csvOptions } = options;
  const formData = await request.formData();
  const csvText = await extractCsvText(formData, fieldName);

  if (!csvText) {
    throw new Error('No CSV file or field found in form data');
  }

  return jtcsv.csvToJson(csvText, csvOptions);
}

function generateCsvResponse(data, filename = 'export.csv', options = {}) {
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
  parseFormData,
  generateCsvResponse
};
