// Streaming CSV -> JSON (Node.js)
// Run from repo root after `npm run build`
const { Readable } = require('stream');
const { createCsvToJsonStream } = require('../../dist/stream-csv-to-json.js');

const csv = `id,name
1,Jane
2,John`;
const input = Readable.from([csv]);

const stream = createCsvToJsonStream({ delimiter: ',', hasHeaders: true });
input.pipe(stream).on('data', (row) => {
  console.log('row', row);
});
