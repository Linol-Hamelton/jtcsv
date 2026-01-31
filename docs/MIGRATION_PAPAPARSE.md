# Migration Guide: PapaParse to jtcsv
Current version: 3.1.0


This guide helps you migrate from [PapaParse](https://www.papaparse.com/) to jtcsv. Both libraries handle CSV parsing and generation, but jtcsv offers additional security features, streaming support, and TypeScript-first design.

## Table of Contents

- [Why Migrate?](#why-migrate)
- [Installation](#installation)
- [Quick Comparison](#quick-comparison)
- [API Mapping](#api-mapping)
  - [Parsing CSV](#parsing-csv)
  - [Converting to CSV](#converting-to-csv)
  - [Streaming](#streaming)
  - [Configuration Options](#configuration-options)
- [Feature Comparison](#feature-comparison)
- [Common Migration Patterns](#common-migration-patterns)
- [Breaking Changes to Watch](#breaking-changes-to-watch)

## Why Migrate?

| Feature | PapaParse | jtcsv |
|---------|-----------|-------|
| CSV Injection Protection | Manual | Built-in (default) |
| TypeScript Support | @types package | Native |
| Streaming | Basic | Full Node.js streams |
| NDJSON Support | No | Yes |
| TSV Support | Via delimiter | Native API |
| RFC 4180 Compliance | Partial | Full |
| Security Validation | No | Path traversal, Schema validation |
| Bundle Size | ~47KB | ~55KB |
| Zero Dependencies (core) | No | Yes |

## Installation

```bash
# Remove PapaParse
npm uninstall papaparse @types/papaparse

# Install jtcsv
npm install jtcsv
```

## Quick Comparison

### PapaParse
```javascript
import Papa from 'papaparse';

// Parse CSV
const result = Papa.parse(csvString, { header: true });
const data = result.data;

// Generate CSV
const csv = Papa.unparse(jsonData);
```

### jtcsv
```javascript
import { csvToJson, jsonToCsv } from 'jtcsv';

// Parse CSV
const data = csvToJson(csvString);

// Generate CSV
const csv = jsonToCsv(jsonData);
```

## API Mapping

### Parsing CSV

#### Basic Parsing

**PapaParse:**
```javascript
const result = Papa.parse(csvString, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true
});
const data = result.data;
const errors = result.errors;
```

**jtcsv:**
```javascript
import { csvToJson } from 'jtcsv';

const data = csvToJson(csvString, {
  hasHeaders: true,        // equivalent to header: true
  trim: true,              // trims whitespace, skips empty
  parseNumbers: true,      // equivalent to dynamicTyping for numbers
  parseBooleans: true      // parse "true"/"false" as booleans
});
```

#### Parsing with Custom Delimiter

**PapaParse:**
```javascript
Papa.parse(csvString, { delimiter: ';' });
```

**jtcsv:**
```javascript
csvToJson(csvString, { delimiter: ';' });
// Or let jtcsv auto-detect (default behavior)
csvToJson(csvString, { autoDetect: true });
```

#### Parsing File

**PapaParse:**
```javascript
Papa.parse(file, {
  header: true,
  complete: (results) => {
    console.log(results.data);
  }
});
```

**jtcsv:**
```javascript
import { readCsvAsJson } from 'jtcsv';

// Async/await
const data = await readCsvAsJson('./data.csv');

// Sync version available
import { readCsvAsJsonSync } from 'jtcsv';
const data = readCsvAsJsonSync('./data.csv');
```

#### Row Limit

**PapaParse:**
```javascript
Papa.parse(csvString, { preview: 100 }); // First 100 rows
```

**jtcsv:**
```javascript
csvToJson(csvString, { maxRows: 100 });
```

### Converting to CSV

#### Basic Conversion

**PapaParse:**
```javascript
const csv = Papa.unparse(data, {
  quotes: true,
  delimiter: ','
});
```

**jtcsv:**
```javascript
import { jsonToCsv } from 'jtcsv';

const csv = jsonToCsv(data, {
  delimiter: ',',
  rfc4180Compliant: true  // Handles quoting automatically
});
```

#### Custom Headers

**PapaParse:**
```javascript
Papa.unparse(data, {
  columns: ['name', 'email', 'age']
});
```

**jtcsv:**
```javascript
jsonToCsv(data, {
  template: { name: '', email: '', age: '' }  // Guarantees order
});
```

#### Header Renaming

**PapaParse:**
```javascript
// Not built-in, requires manual transformation
const renamed = data.map(row => ({
  'Full Name': row.name,
  'Email Address': row.email
}));
Papa.unparse(renamed);
```

**jtcsv:**
```javascript
jsonToCsv(data, {
  renameMap: {
    name: 'Full Name',
    email: 'Email Address'
  }
});
```

#### Saving to File

**PapaParse:**
```javascript
const csv = Papa.unparse(data);
fs.writeFileSync('output.csv', csv);
```

**jtcsv:**
```javascript
import { saveAsCsv } from 'jtcsv';

await saveAsCsv(data, 'output.csv', {
  validatePath: true  // Security: prevents path traversal
});
```

### Streaming

#### Stream Parsing

**PapaParse:**
```javascript
Papa.parse(fs.createReadStream('large.csv'), {
  header: true,
  step: (row) => {
    console.log('Row:', row.data);
  },
  complete: () => {
    console.log('Done');
  }
});
```

**jtcsv:**
```javascript
import { createCsvToJsonStream } from 'jtcsv';
import { createReadStream } from 'fs';

const csvStream = createCsvToJsonStream({ hasHeaders: true });

createReadStream('large.csv')
  .pipe(csvStream)
  .on('data', (row) => {
    console.log('Row:', row);
  })
  .on('end', () => {
    console.log('Done');
  });

// Or use async iterator
import { csvToJsonIterator } from 'jtcsv';

for await (const row of csvToJsonIterator(csvString)) {
  console.log('Row:', row);
}
```

#### Stream Generation

**PapaParse:**
```javascript
// No native streaming support for generation
```

**jtcsv:**
```javascript
import { createJsonToCsvStream, streamJsonToCsv } from 'jtcsv';

// Using transform stream
const csvTransform = createJsonToCsvStream({ delimiter: ',' });
jsonReadable.pipe(csvTransform).pipe(fileWritable);

// Or direct streaming
await streamJsonToCsv(inputStream, outputStream, { delimiter: ',' });
```

### Configuration Options

| PapaParse Option | jtcsv Equivalent | Notes |
|------------------|------------------|-------|
| `delimiter` | `delimiter` | Same |
| `header` | `hasHeaders` | Same concept |
| `dynamicTyping` | `parseNumbers`, `parseBooleans` | Split into specific options |
| `skipEmptyLines` | `trim` | `trim: true` handles empty lines |
| `preview` | `maxRows` | Same concept |
| `step` | Use streaming API | `createCsvToJsonStream()` |
| `complete` | Promise resolution | Async/await pattern |
| `error` | try/catch | Error classes: `ParsingError`, etc. |
| `quotes` | `rfc4180Compliant` | Auto-quoting with RFC 4180 |
| `quoteChar` | N/A | Always uses standard `"` |
| `escapeChar` | N/A | RFC 4180 standard escaping |
| `columns` | `template` | Object defines order |
| `newline` | N/A | Auto-detected on parse, CRLF on generate |

## Feature Comparison

### Error Handling

**PapaParse:**
```javascript
const result = Papa.parse(csv);
if (result.errors.length > 0) {
  result.errors.forEach(err => console.error(err));
}
```

**jtcsv:**
```javascript
import { csvToJson, ParsingError, ValidationError } from 'jtcsv';

try {
  const data = csvToJson(csv);
} catch (error) {
  if (error instanceof ParsingError) {
    console.error(`Line ${error.lineNumber}: ${error.message}`);
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  }
}
```

### CSV Injection Protection

**PapaParse:**
```javascript
// Manual protection required
const sanitize = (value) => {
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
};
const safeData = data.map(row =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, sanitize(v)])
  )
);
```

**jtcsv:**
```javascript
// Built-in, enabled by default
jsonToCsv(data, { preventCsvInjection: true }); // default

// Disable if needed (not recommended)
jsonToCsv(data, { preventCsvInjection: false });
```

### NDJSON Support

**PapaParse:**
```javascript
// Not supported
```

**jtcsv:**
```javascript
import { jsonToNdjson, ndjsonToJson, parseNdjsonStream } from 'jtcsv';

// Convert JSON array to NDJSON
const ndjson = jsonToNdjson(data);

// Parse NDJSON string
const data = ndjsonToJson(ndjsonString);

// Stream NDJSON
for await (const obj of parseNdjsonStream(stream)) {
  process(obj);
}
```

### TSV Support

**PapaParse:**
```javascript
Papa.parse(tsvString, { delimiter: '\t' });
```

**jtcsv:**
```javascript
import { tsvToJson, jsonToTsv, validateTsv } from 'jtcsv';

// Native TSV API
const data = tsvToJson(tsvString);
const tsv = jsonToTsv(data);

// Validation
const result = validateTsv(tsvString);
if (!result.valid) {
  console.error(result.errors);
}
```

## Common Migration Patterns

### Pattern 1: Simple Parse and Generate

**Before (PapaParse):**
```javascript
import Papa from 'papaparse';

function processCSV(input) {
  const parsed = Papa.parse(input, { header: true });
  const processed = parsed.data.map(transform);
  return Papa.unparse(processed);
}
```

**After (jtcsv):**
```javascript
import { csvToJson, jsonToCsv } from 'jtcsv';

function processCSV(input) {
  const parsed = csvToJson(input);
  const processed = parsed.map(transform);
  return jsonToCsv(processed);
}
```

### Pattern 2: File Processing

**Before (PapaParse):**
```javascript
import Papa from 'papaparse';
import fs from 'fs';

async function convertFile(inputPath, outputPath) {
  const content = fs.readFileSync(inputPath, 'utf-8');
  const { data } = Papa.parse(content, { header: true });
  const csv = Papa.unparse(data);
  fs.writeFileSync(outputPath, csv);
}
```

**After (jtcsv):**
```javascript
import { readCsvAsJson, saveAsCsv } from 'jtcsv';

async function convertFile(inputPath, outputPath) {
  const data = await readCsvAsJson(inputPath);
  await saveAsCsv(data, outputPath);
}
```

### Pattern 3: Streaming Large Files

**Before (PapaParse):**
```javascript
let results = [];
Papa.parse(fs.createReadStream('large.csv'), {
  header: true,
  step: (row) => results.push(row.data),
  complete: () => processResults(results)
});
```

**After (jtcsv):**
```javascript
import { createCsvFileToJsonStream } from 'jtcsv';

const stream = await createCsvFileToJsonStream('large.csv');
const results = [];

for await (const row of stream) {
  results.push(row);
}
processResults(results);

// Or with proper streaming (memory-efficient)
import { streamCsvToJson, createJsonCollectorStream } from 'jtcsv';

const collector = createJsonCollectorStream();
await streamCsvToJson(inputStream, collector);
const results = collector.data;
```

### Pattern 4: Browser Usage

**Before (PapaParse):**
```html
<script src="papaparse.min.js"></script>
<script>
  Papa.parse(csvString, { header: true });
</script>
```

**After (jtcsv):**
```html
<script src="node_modules/jtcsv/dist/jtcsv.umd.js"></script>
<script>
  const { csvToJson, jsonToCsv } = jtcsv;
  const data = csvToJson(csvString);
</script>

<!-- Or with ES modules -->
<script type="module">
  import { csvToJson } from 'jtcsv/browser';
  const data = csvToJson(csvString);
</script>
```

## Breaking Changes to Watch

### 1. Return Value Structure

**PapaParse** returns an object with `data`, `errors`, and `meta`:
```javascript
const result = Papa.parse(csv);
// result = { data: [...], errors: [...], meta: {...} }
```

**jtcsv** returns data directly (errors are thrown):
```javascript
const data = csvToJson(csv);
// data = [...]
```

### 2. Error Handling

**PapaParse** collects errors in result object:
```javascript
if (result.errors.length) { /* handle */ }
```

**jtcsv** throws typed exceptions:
```javascript
try {
  csvToJson(csv);
} catch (e) {
  if (e instanceof ParsingError) { /* handle */ }
}
```

### 3. Default Delimiter

**PapaParse** defaults to `,` (comma)
**jtcsv** auto-detects delimiter by default, or uses `;` (semicolon) if specified

```javascript
// To match PapaParse behavior:
csvToJson(csv, { delimiter: ',', autoDetect: false });
```

### 4. Dynamic Typing

**PapaParse** has single `dynamicTyping` option:
```javascript
Papa.parse(csv, { dynamicTyping: true });
```

**jtcsv** splits this into explicit options:
```javascript
csvToJson(csv, {
  parseNumbers: true,   // "123" -> 123
  parseBooleans: true   // "true" -> true
});
```

### 5. Streaming Callbacks vs Streams

**PapaParse** uses callbacks:
```javascript
Papa.parse(stream, {
  step: (row) => {},
  complete: () => {}
});
```

**jtcsv** uses Node.js streams and async iterators:
```javascript
const transform = createCsvToJsonStream();
inputStream.pipe(transform).pipe(outputStream);

// Or async iteration
for await (const row of csvToJsonIterator(csv)) {}
```

## Need Help?

- [jtcsv Documentation](https://github.com/Linol-Hamelton/jtcsv#readme)
- [API Reference](./api/index.html)
- [GitHub Issues](https://github.com/Linol-Hamelton/jtcsv/issues)
- [FAQ](./FAQ.md)
