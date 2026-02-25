# Recipe 06: Type coercion and custom parsing
Current version: 3.1.0

## Goal
Normalize data types and apply custom parsing logic.

## Example
```js
const { csvToJson, isDate } = require('jtcsv');

const csv = 'id,amount,active,created_at
1,9.99,true,2024-01-01';

const rows = csvToJson(csv, {
  delimiter: ',',
  parseNumbers: true,
  parseBooleans: true,
  transform: (row) => ({
    ...row,
    created_at: isDate(row.created_at) ? new Date(row.created_at) : null
  })
});

console.log(rows);
```

## Notes
- `parseNumbers` and `parseBooleans` handle the common cases.
- Use `transform` to normalize dates or custom enums.

## Navigation
- Previous: [Performance for large files](05-performance-large-files.md)
- Next: [Special characters and encoding](07-special-characters-encoding.md)
