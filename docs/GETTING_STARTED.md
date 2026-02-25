# Getting Started (5 mins)
Current version: 3.1.0

This guide gives you copy-paste examples for the most common JTCSV use cases.

## Step 1: Install
```bash
npm install jtcsv
```

## Step 2: Choose your use case
- I have CSV and want JSON -> `csvToJson()`
- I have JSON and want CSV -> `jsonToCsv()`
- I have a large CSV file in Node.js -> `createCsvFileToJsonStream()`
- I am in a browser with file upload -> `parseCsvFile()`
- I have custom delimiters (TSV) -> `delimiter: "\t"`

## Step 3: Copy-paste examples

### 1) CSV -> JSON (string)
```javascript
const { csvToJson } = require('jtcsv');

const csv = 'id,name\n1,Jane\n2,John';
const rows = csvToJson(csv, { delimiter: ',' });

console.log(rows);
```

### 2) JSON -> CSV (string)
```javascript
const { jsonToCsv } = require('jtcsv');

const data = [
  { id: 1, name: 'Jane' },
  { id: 2, name: 'John' }
];

const csv = jsonToCsv(data, { delimiter: ',', includeHeaders: true });
console.log(csv);
```

### 3) Browser file upload
```javascript
import { parseCsvFile } from 'jtcsv/browser';

const input = document.querySelector('input[type="file"]');
input.addEventListener('change', async () => {
  const file = input.files?.[0];
  if (!file) return;

  const rows = await parseCsvFile(file, { delimiter: ',' });
  console.log(rows);
});
```

### 4) Large file (Node.js streaming)
```javascript
const { createCsvFileToJsonStream } = require('jtcsv');

(async () => {
  const stream = await createCsvFileToJsonStream('large.csv', {
    parseNumbers: true,
    hasHeaders: true
  });

  for await (const row of stream) {
    // Process row-by-row without loading the full file
    console.log(row);
  }
})();
```

### 5) Custom delimiter (TSV)
```javascript
const { csvToJson, jsonToCsv } = require('jtcsv');

const tsv = jsonToCsv([{ id: 1, name: 'Jane' }], { delimiter: '\t' });
const rows = csvToJson(tsv, { delimiter: '\t' });

console.log(tsv);
console.log(rows);
```

## Step 4: Customize (3 options most people use)
- `delimiter`: ',', ';', '|', or '\t'
- `parseNumbers`: convert numeric strings to numbers (CSV -> JSON)
- `includeHeaders` / `hasHeaders`: include or read header row

## Next steps
- `docs/API_DECISION_TREE.md` - pick the right API for your scenario.
- `docs/STREAMING_GUIDE.md` - streaming patterns and memory tips.
- `docs/BROWSER.md` - browser API and worker helpers.
- `docs/ERRORS.md` - error handling reference.
