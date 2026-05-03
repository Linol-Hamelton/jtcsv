const jtcsv = require('jtcsv');

function extractCsvText(input) {
  if (typeof input === 'string') {
    return input;
  }
  if (input && typeof input === 'object' && typeof input.csv === 'string') {
    return input.csv;
  }
  return null;
}

function createCsvProcedure(t, schema, options = {}) {
  if (!t || !t.procedure) {
    throw new Error('createCsvProcedure expects initTRPC instance');
  }

  return t.procedure
    .input(schema)
    .use(async ({ input, next }) => {
      const csvText = extractCsvText(input);
      if (!csvText) {
        throw new Error('CSV input must be a string or { csv: string }');
      }
      const parsed = jtcsv.csvToJson(csvText, options);
      return next({ input: parsed });
    });
}

module.exports = {
  createCsvProcedure
};
