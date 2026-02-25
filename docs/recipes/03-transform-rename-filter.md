# Recipe 03: Transform CSV (rename, filter, map)
Current version: 3.1.0

## Goal
Rename columns, filter rows, and apply transformations during parsing.

## Example
```js
const { csvToJson } = require('jtcsv');

const csv = 'user_id,full_name,score\n1,Jane Doe,98\n2,John Smith,42';

const rows = csvToJson(csv, {
  delimiter: ',',
  renameMap: {
    user_id: 'id',
    full_name: 'name'
  },
  transform: (row) => {
    if (Number(row.score) < 50) return null;
    return {
      ...row,
      score: Number(row.score),
      passed: Number(row.score) >= 80
    };
  }
}).filter(Boolean);

console.log(rows);
```

## Notes
- If your `transform` can return `null`, filter it out after parsing.
- For more advanced hooks, see `TransformHooks` in `csv-to-json`.

## Navigation
- Previous: [CSV validation and error detection](02-csv-validation-errors.md)
- Next: [Convert between CSV, TSV, and NDJSON](04-convert-formats.md)
