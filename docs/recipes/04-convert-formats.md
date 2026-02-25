# Recipe 04: Convert between CSV, TSV, and NDJSON
Current version: 3.1.0

## Goal
Convert between CSV and TSV, and output NDJSON for streaming pipelines.

## CSV <-> TSV (Node.js)
```js
const { csvToJson, jsonToCsv } = require('jtcsv');

const csv = 'id,name
1,Jane
2,John';
const rows = csvToJson(csv, { delimiter: ',' });

const tsv = jsonToCsv(rows, { delimiter: '	', includeHeaders: true });
console.log(tsv);
```

## CSV -> NDJSON (CLI)
```bash
npx jtcsv csv-to-ndjson data.csv output.ndjson --stream
```

## Notes
- For NDJSON in code, use `jsonToNdjsonStream` or the CLI.

## Navigation
- Previous: [Transform CSV (rename, filter, map)](03-transform-rename-filter.md)
- Next: [Performance for large files](05-performance-large-files.md)
