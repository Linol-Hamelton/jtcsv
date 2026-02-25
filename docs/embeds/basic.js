// Basic CSV -> JSON and JSON -> CSV
// Run from repo root after `npm run build`
const { csvToJson, jsonToCsv } = require('../../dist/index.js');

const csv = `id,name
1,Jane
2,John`;
const rows = csvToJson(csv, { delimiter: ',' });
console.log(rows);

const backToCsv = jsonToCsv(rows, { delimiter: ',', includeHeaders: true });
console.log(backToCsv);
