# Recipe 02: CSV validation and error detection
Current version: 3.1.0

## Goal
Validate CSV input and produce actionable error messages.

## When to use
- You receive user-generated CSV.
- You need to show line-level failures.

## Example (Node.js)
```js
const { csvToJson } = require('jtcsv');

const csv = 'id,email
1,jane@example.com
2,not-an-email';

const schema = {
  properties: {
    id: { type: 'integer' },
    email: { type: 'string', format: 'email' }
  },
  required: ['id', 'email']
};

const rows = csvToJson(csv, {
  delimiter: ',',
  schema,
  onError: 'warn',
  errorHandler: (error, line, lineNumber) => {
    console.warn('Bad row', lineNumber, error.message, line);
  }
});

console.log(rows);
```

## Notes
- `onError` can be `throw`, `warn`, or `skip`.
- Use `errorHandler` to log or collect failures.

## Navigation
- Previous: [Upload CSV, parse, and render a table](01-upload-parse-table.md)
- Next: [Transform CSV (rename, filter, map)](03-transform-rename-filter.md)
