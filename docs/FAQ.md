# jtcsv FAQ (Frequently Asked Questions)
Current version: 3.1.0


## Table of Contents

- [General Questions](#general-questions)
- [Installation & Setup](#installation--setup)
- [CSV Parsing](#csv-parsing)
- [JSON to CSV Conversion](#json-to-csv-conversion)
- [Streaming & Large Files](#streaming--large-files)
- [Security](#security)
- [Performance](#performance)
- [TypeScript](#typescript)
- [Browser Usage](#browser-usage)
- [Troubleshooting](#troubleshooting)

---

## General Questions

### What is jtcsv?

jtcsv is a complete JSON↔CSV bidirectional converter for Node.js and browsers. It provides:
- Zero-dependency core
- Streaming support for large files
- CSV injection protection
- TypeScript support
- NDJSON and TSV formats
- Framework integrations (Express, Fastify, Next.js, etc.)

### How does jtcsv compare to PapaParse?

| Feature | jtcsv | PapaParse |
|---------|-------|-----------|
| CSV Injection Protection | Built-in (default) | Manual |
| TypeScript | Native types | @types package |
| Streaming Generation | Yes | No |
| NDJSON Support | Yes | No |
| RFC 4180 Compliance | Full | Partial |
| Bundle Size | ~55KB | ~47KB |

See [Migration Guide](./MIGRATION_PAPAPARSE.md) for detailed comparison.

### Is jtcsv production-ready?

Yes. jtcsv has:
- 555+ tests with 100% coverage
- Used in production applications
- Active maintenance
- Semantic versioning

---

## Installation & Setup

### How do I install jtcsv?

```bash
npm install jtcsv
# or
yarn add jtcsv
# or
pnpm add jtcsv
```

### What Node.js versions are supported?

Node.js 12.0.0 and higher.

### How do I use jtcsv with ES Modules?

```javascript
// ES Modules
import { csvToJson, jsonToCsv } from 'jtcsv';

// CommonJS
const { csvToJson, jsonToCsv } = require('jtcsv');
```

### How do I use jtcsv in the browser?

```html
<!-- UMD build -->
<script src="node_modules/jtcsv/dist/jtcsv.umd.js"></script>
<script>
  const { csvToJson, jsonToCsv } = jtcsv;
</script>

<!-- ES Module -->
<script type="module">
  import { csvToJson } from 'jtcsv/browser';
</script>
```

---

## CSV Parsing

### How do I parse a CSV string?

```javascript
const { csvToJson } = require('jtcsv');

const csv = `name,age,city
John,30,NYC
Jane,25,LA`;

const data = csvToJson(csv);
// [{ name: 'John', age: '30', city: 'NYC' }, ...]
```

### How do I parse numbers and booleans automatically?

```javascript
const data = csvToJson(csv, {
  parseNumbers: true,   // "30" → 30
  parseBooleans: true   // "true" → true
});
```

### How does delimiter auto-detection work?

jtcsv automatically detects delimiters by analyzing the first few lines:

```javascript
// Auto-detection (default)
csvToJson(csv); // Detects , ; \t |

// Specify delimiter explicitly
csvToJson(csv, { delimiter: ';', autoDetect: false });
```

### How do I handle CSV without headers?

```javascript
const csv = `John,30,NYC
Jane,25,LA`;

const data = csvToJson(csv, { hasHeaders: false });
// [['John', '30', 'NYC'], ['Jane', '25', 'LA']]
```

### How do I rename columns during parsing?

```javascript
const data = csvToJson(csv, {
  renameMap: {
    'Full Name': 'name',  // newKey: oldKey
    'Years': 'age'
  }
});
```

### How do I limit the number of rows?

```javascript
const data = csvToJson(csv, { maxRows: 100 });
```

---

## JSON to CSV Conversion

### How do I convert JSON to CSV?

```javascript
const { jsonToCsv } = require('jtcsv');

const data = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 }
];

const csv = jsonToCsv(data);
```

### How do I change the delimiter?

```javascript
const csv = jsonToCsv(data, { delimiter: ';' });
// name;age
// John;30
```

### How do I control column order?

```javascript
const csv = jsonToCsv(data, {
  template: { age: 0, name: '' }  // age first, then name
});
```

### How do I rename headers in output?

```javascript
const csv = jsonToCsv(data, {
  renameMap: {
    name: 'Full Name',
    age: 'Years Old'
  }
});
```

### How do I handle nested objects?

jtcsv automatically flattens nested objects:

```javascript
const data = [{ user: { name: 'John', address: { city: 'NYC' } } }];
const csv = jsonToCsv(data);
// user.name,user.address.city
// John,NYC
```

### How do I exclude headers?

```javascript
const csv = jsonToCsv(data, { includeHeaders: false });
```

---

## Streaming & Large Files

### How do I process large CSV files?

Use streaming to avoid loading the entire file in memory:

```javascript
const { createCsvToJsonStream } = require('jtcsv');
const fs = require('fs');

const stream = createCsvToJsonStream();

fs.createReadStream('large.csv')
  .pipe(stream)
  .on('data', (row) => {
    // Process each row
  })
  .on('end', () => {
    console.log('Done');
  });
```

### How do I use async iteration?

```javascript
const { csvToJsonIterator } = require('jtcsv');

for await (const row of csvToJsonIterator(csv)) {
  console.log(row);
}
```

### How do I stream JSON to CSV file?

```javascript
const { streamJsonToCsv, createJsonReadableStream } = require('jtcsv');
const fs = require('fs');

const input = createJsonReadableStream(data);
const output = fs.createWriteStream('output.csv');

await streamJsonToCsv(input, output);
```

### What's the maximum file size jtcsv can handle?

With streaming, jtcsv can process files of any size. Memory usage stays constant regardless of file size when using streams.

---

## Security

### What is CSV injection and how does jtcsv prevent it?

CSV injection occurs when malicious formulas (starting with `=`, `+`, `-`, `@`) are executed when opening CSV in Excel. jtcsv prevents this by prefixing dangerous values:

```javascript
// Enabled by default
jsonToCsv(data, { preventCsvInjection: true });

// Dangerous input: =HYPERLINK("http://evil.com")
// Safe output: '=HYPERLINK("http://evil.com")
```

### How does path validation work?

jtcsv prevents path traversal attacks:

```javascript
await saveAsCsv(data, '../../../etc/passwd.csv');
// Throws SecurityError: Path traversal detected
```

### Is jtcsv RFC 4180 compliant?

Yes, by default. jtcsv properly handles:
- Quoted fields with commas
- Escaped quotes (`""`)
- Multiline values
- CRLF line endings

---

## Performance

### How fast is jtcsv?

- **CSV Parsing**: ~625,000 rows/sec (simple CSV)
- **NDJSON**: ~80,000 objects/sec
- **TSV**: ~59,524 objects/sec
- **Delimiter Cache**: 3.67x speedup

### What is the Fast-Path engine?

Fast-Path is an optimized parser for simple CSV without quotes or special characters. It's enabled by default and automatically falls back to standard parsing when needed:

```javascript
csvToJson(csv, { useFastPath: true }); // default
```

### How can I improve performance?

1. **Use streaming** for large files
2. **Disable auto-detection** if you know the delimiter
3. **Use Fast-Path** (enabled by default)
4. **Limit rows** if you only need a sample

```javascript
csvToJson(csv, {
  delimiter: ',',
  autoDetect: false,
  useFastPath: true,
  maxRows: 10000
});
```

---

## TypeScript

### Does jtcsv have TypeScript support?

Yes, jtcsv includes native TypeScript definitions in `index.d.ts`.

### How do I use jtcsv with TypeScript?

```typescript
import {
  csvToJson,
  jsonToCsv,
  CsvToJsonOptions,
  JsonToCsvOptions
} from 'jtcsv';

interface User {
  name: string;
  age: number;
}

const options: CsvToJsonOptions = {
  parseNumbers: true
};

const users = csvToJson(csv, options) as User[];
```

### Are error types available?

Yes:

```typescript
import {
  JtcsvError,
  ValidationError,
  SecurityError,
  ParsingError,
  FileSystemError,
  LimitError,
  ConfigurationError
} from 'jtcsv';

try {
  csvToJson(input);
} catch (error) {
  if (error instanceof ParsingError) {
    console.log(`Line ${error.lineNumber}: ${error.message}`);
  }
}
```

---

## Browser Usage

### Can I use jtcsv in the browser?

Yes, jtcsv works in modern browsers:

```javascript
import { csvToJson, jsonToCsv } from 'jtcsv/browser';
```

### Does jtcsv support Web Workers?

Yes, for heavy processing:

```javascript
// In worker
import { csvToJson } from 'jtcsv/browser';

self.onmessage = (e) => {
  const result = csvToJson(e.data.csv);
  self.postMessage(result);
};
```

### How do I download CSV in the browser?

```javascript
const csv = jsonToCsv(data);
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'data.csv';
a.click();
```

---

## Troubleshooting

### "ValidationError: Input must be a string"

You're passing non-string data to `csvToJson`:

```javascript
// Wrong
csvToJson(123);
csvToJson(null);

// Correct
csvToJson('a,b\n1,2');
```

### "ParsingError: Unterminated quoted field"

Your CSV has an unclosed quote:

```csv
name,description
John,"This is a "broken" description
```

Fix by escaping quotes:

```csv
name,description
John,"This is a ""fixed"" description"
```

### Numbers are parsed as strings

Enable number parsing:

```javascript
csvToJson(csv, { parseNumbers: true });
```

### Wrong delimiter detected

Specify delimiter explicitly:

```javascript
csvToJson(csv, { delimiter: ';', autoDetect: false });
```

### Memory issues with large files

Use streaming instead of loading entire file:

```javascript
// Instead of
const data = csvToJson(fs.readFileSync('huge.csv', 'utf8'));

// Use streaming
const stream = createCsvToJsonStream();
fs.createReadStream('huge.csv').pipe(stream);
```

### Excel shows garbled characters

Add BOM for UTF-8:

```javascript
const csv = jsonToCsv(data);
const csvWithBom = '\ufeff' + csv;
fs.writeFileSync('output.csv', csvWithBom, 'utf8');
```

Or use streaming which adds BOM by default:

```javascript
await saveJsonStreamAsCsv(input, 'output.csv', { addBOM: true });
```

---

## Still Have Questions?

- [GitHub Issues](https://github.com/Linol-Hamelton/jtcsv/issues)
- [API Documentation](./api/index.html)
- [Examples](../examples/)
