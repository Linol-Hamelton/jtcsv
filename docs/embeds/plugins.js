// Plugin system example
// Run from repo root after `npm run build`
const { create } = require('../../dist/src/index-with-plugins.js');

const jtcsv = create();

jtcsv.use('uppercase-name', {
  name: 'uppercase-name',
  version: '1.0.0',
  transformRow: (row) => ({
    ...row,
    name: String(row.name || '').toUpperCase()
  })
});

const csv = `id,name
1,Jane
2,John`;
const rows = jtcsv.csvToJson(csv, { delimiter: ',' });
console.log(rows);
