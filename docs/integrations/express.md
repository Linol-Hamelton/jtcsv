# Express: CSV upload API
Current version: 3.1.0

## Problem
Accept CSV uploads in an Express API and return JSON or NDJSON with solid error handling.

## Complete working example
```js
const express = require('express');
const Busboy = require('busboy');
const { Transform } = require('stream');
const { createCsvToJsonStream } = require('jtcsv/stream-csv-to-json');

const app = express();

app.post('/api/csv/upload', (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  let handledFile = false;

  busboy.on('file', (_name, file, info) => {
    handledFile = true;
    const parser = createCsvToJsonStream({
      delimiter: ',',
      hasHeaders: true,
      parseNumbers: true,
      parseBooleans: true
    });

    const toNdjson = new Transform({
      objectMode: true,
      transform(row, _enc, cb) {
        cb(null, JSON.stringify(row) + '\n');
      }
    });

    res.setHeader('Content-Type', 'application/x-ndjson');
    file.pipe(parser).pipe(toNdjson).pipe(res);

    parser.on('error', (err) => {
      res.status(400).end(JSON.stringify({ error: err.message }));
    });
  });

  busboy.on('finish', () => {
    if (!handledFile) {
      res.status(400).json({ error: 'No file uploaded' });
    }
  });

  busboy.on('error', (err) => {
    res.status(400).json({ error: err.message });
  });

  req.pipe(busboy);
});

app.listen(3001, () => console.log('Listening on :3001'));
```

## Common pitfalls
- Ensure you stream and do not buffer large files in memory.
- Use `createCsvToJsonStream` for large files instead of `csvToJson`.
- Make sure the client sets `Content-Type: multipart/form-data`.

## Testing
```bash
curl -F "file=@./data.csv" http://localhost:3001/api/csv/upload
```
