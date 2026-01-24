# jtcsv Browser API

This document describes the browser bundle and helpers exported from `src/browser`.

## Install
```bash
npm install jtcsv
```

If you publish a browser-only package, the name used in this repo is `jtcsv-browser`
(see `package-browser.json`).

## CDN
```html
<!-- UMD (window.jtcsv) -->
<script src="https://cdn.jsdelivr.net/npm/jtcsv/dist/jtcsv.umd.js"></script>

<!-- ESM -->
<script type="module">
  import { jsonToCsv } from 'https://cdn.jsdelivr.net/npm/jtcsv/dist/jtcsv.esm.js';
</script>
```

## Bundler usage
```javascript
import { csvToJson, jsonToCsv } from 'jtcsv/browser';

const csv = jsonToCsv([{ id: 1, name: 'Jane' }], { delimiter: ',' });
const json = csvToJson('id,name\n1,Jane', { delimiter: ',' });
```

## File helpers
```javascript
import { parseCsvFile, parseCsvFileStream } from 'jtcsv/browser';

const fileInput = document.querySelector('input[type="file"]');
const json = await parseCsvFile(fileInput.files[0], { delimiter: ',' });

for await (const row of parseCsvFileStream(fileInput.files[0], { delimiter: ',' })) {
  console.log(row);
}
```

## Worker helpers
```javascript
import { parseCSVWithWorker, createWorkerPool } from 'jtcsv/browser';

const result = await parseCSVWithWorker(file, {}, (progress) => {
  console.log(progress.percentage);
});

const pool = createWorkerPool({ workerCount: 2 });
const rows = await pool.exec('parseCSV', [csvText, { delimiter: ',' }]);
```

## Streaming helpers
```javascript
import { jsonToCsvStream, csvToJsonStream } from 'jtcsv/browser';

const csvStream = jsonToCsvStream([{ id: 1 }]);
const jsonStream = csvToJsonStream('id,name\n1,Jane', { outputFormat: 'ndjson' });
```

## Exported API
- jsonToCsv, csvToJson, csvToJsonIterator
- parseCsvFile, parseCsvFileStream, downloadAsCsv
- jsonToCsvStream, jsonToNdjsonStream, csvToJsonStream
- autoDetectDelimiter
- createWorkerPool, parseCSVWithWorker
- createWorkerPoolLazy, parseCSVWithWorkerLazy
- ValidationError, SecurityError, FileSystemError, ParsingError, LimitError, ConfigurationError

Note: parseCSVWithWorker accepts a CSV string, File, ArrayBuffer, or typed array.
