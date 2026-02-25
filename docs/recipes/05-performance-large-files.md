# Recipe 05: Performance for large files
Current version: 3.1.0

## Goal
Process large CSV files without blowing memory.

## Example (Node.js streaming)
```js
const { createCsvFileToJsonStream } = require('jtcsv');

(async () => {
  const stream = await createCsvFileToJsonStream('large.csv', {
    parseNumbers: true,
    hasHeaders: true
  });

  for await (const row of stream) {
    // Process row-by-row
  }
})();
```

## Tips
- Prefer streaming for files >10MB.
- Use `fastPathMode: 'compact'` if memory is tight.
- Avoid loading huge CSV strings into memory.

## Navigation
- Previous: [Convert between CSV, TSV, and NDJSON](04-convert-formats.md)
- Next: [Type coercion and custom parsing](06-type-coercion-custom-parsing.md)
