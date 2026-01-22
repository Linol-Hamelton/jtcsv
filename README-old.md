"# jtcsv - **The Complete JSON↔CSV Converter for Node.js**

⚡ **Zero dependencies** | 🚀 **Streaming for large files** | 🔄 **Bidirectional conversion** | 🔒 **Security built-in** | 📊 **100% test coverage**

## 🚀 Quick Start

### JSON → CSV
```javascript
const { jsonToCsv } = require('jtcsv');

const csv = jsonToCsv([
  { id: 1, name: 'John Doe' },
  { id: 2, name: 'Jane Smith' }
], { delimiter: ',' });

console.log(csv);
// Output:
// id,name
// 1,John Doe
// 2,Jane Smith
```

### CSV → JSON
```javascript
const { csvToJson } = require('jtcsv');

// Auto-detect delimiter (no need to specify)
const csv = 'id,name\\n1,John\\n2,Jane';
const json = csvToJson(csv); // Automatically detects comma delimiter

console.log(json);
// Output: [{id: '1', name: 'John'}, {id: '2', name: 'Jane'}]

// Works with any delimiter
const csvSemicolon = 'id;name;email\\n1;John;john@example.com';
const json2 = csvToJson(csvSemicolon); // Automatically detects semicolon

// Disable auto-detect if needed
const csvCustom = 'id|name|age\\n1|John|30';
const json3 = csvToJson(csvCustom, { 
  delimiter: '|', 
  autoDetect: false 
});
```

## 📦 Installation

```bash
npm install jtcsv-converter
```

## 🖥️ Command Line Interface

JTCSV includes a powerful CLI tool for command-line conversions:

### Basic Usage
```bash
# Convert CSV to JSON
jtcsv csv-to-json data.csv output.json

# Convert JSON to CSV  
jtcsv json-to-csv data.json output.csv

# Auto-detect delimiter
jtcsv csv-to-json data.csv output.json --auto-detect

# Parse numbers and booleans
jtcsv csv-to-json data.csv output.json --parse-numbers --parse-booleans
```

### Full CLI Documentation
See [CLI.md](./CLI.md) for complete CLI documentation with examples.

## ✨ Key Features

### ✅ **Complete JSON↔CSV Conversion**
- **JSON → CSV**: Convert arrays of objects to CSV format
- **CSV → JSON**: Parse CSV strings back to JSON arrays
- **File Operations**: Read/write CSV files with security validation

### ✅ **Streaming API for Large Files**
- Process files >100MB without loading into memory
- Real-time transformation with backpressure handling
- Schema validation during streaming

### ✅ **Enterprise-Grade Security**
- **CSV Injection Protection**: Automatic escaping of Excel formulas
- **Path Traversal Protection**: Safe file path validation
- **Input Validation**: Type checking and size limits

### ✅ **Performance Optimized**
- Zero dependencies, ~8KB package size
- Memory-efficient streaming
- RFC 4180 compliant output

### ✅ **TypeScript Ready**
- Full TypeScript definitions included
- IntelliSense support in modern editors

## 📊 Performance Benchmark

### CSV → JSON Conversion (10,000 rows):
- **PapaParse**: 18.62 ms 🥇 (Fastest, CSV→JSON only)
- **csv-parser**: 31.51 ms 🥈 (Streaming focused)  
- **JTCSV**: 45.22 ms 🥉 (**Bidirectional + Security**)

### JSON → CSV Conversion (10,000 records):
- **json2csv**: 12.23 ms 🥇 (JSON→CSV only)
- **JTCSV**: 14.89 ms 🥈 (**Only 21.8% slower, but bidirectional**)

### Throughput:
- CSV → JSON: ~221,000 rows/second
- JSON → CSV: ~671,000 records/second

*See [BENCHMARK-RESULTS.md](./BENCHMARK-RESULTS.md) for full details*

## 📊 Real-World Examples

### 1. Database Export to CSV
```javascript
const { saveAsCsv } = require('jtcsv');

// Export users from database
const users = await db.query('SELECT * FROM users');
await saveAsCsv(users, './exports/users.csv', {
  delimiter: ',',
  renameMap: {
    id: 'User ID',
    email: 'Email Address',
    created_at: 'Registration Date'
  }
});
```

### 2. CSV Import to Database
```javascript
const { readCsvAsJson } = require('jtcsv');

// Import users from CSV file
const users = await readCsvAsJson('./imports/users.csv', {
  delimiter: ',',
  parseNumbers: true,
  parseBooleans: true
});

await db.insert('users', users);
```

### 3. Streaming Large Dataset
```javascript
const { createJsonToCsvStream, saveJsonStreamAsCsv } = require('./stream-json-to-csv.js');
const fs = require('fs');

// Process 1GB JSON file without loading into memory
const jsonStream = fs.createReadStream('./large-data.jsonl', 'utf8');
await saveJsonStreamAsCsv(jsonStream, './output.csv', {
  delimiter: ','
});
```

### 4. API Response Conversion
```javascript
const { jsonToCsv } = require('jtcsv');

// Convert API response to downloadable CSV
app.get('/api/users/export', async (req, res) => {
  const users = await fetchUsersFromAPI();
  const csv = jsonToCsv(users, {
    delimiter: ',',
    preventCsvInjection: true,
    rfc4180Compliant: true
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=\"users.csv\"');
  res.send(csv);
});
```

## 🔧 API Reference

### Core Functions

#### `jsonToCsv(data, options)`
Convert JSON array to CSV string.

**Options:**
- `delimiter` (default: ';') - CSV delimiter character
- `includeHeaders` (default: true) - Include headers row
  - `renameMap` - Rename column headers `{ oldKey: newKey }`
  - `template` - Ensure consistent column order
  - `maxRecords` (optional) - Maximum records to process (no limit by default)
  - `preventCsvInjection` (default: true) - Escape Excel formulas
  - `rfc4180Compliant` (default: true) - RFC 4180 compliance

#### `csvToJson(csv, options)`
Convert CSV string to JSON array.

**Options:**
- `delimiter` (default: auto-detected) - CSV delimiter character
- `autoDetect` (default: true) - Auto-detect delimiter if not specified
- `candidates` (default: [';', ',', '\t', '|']) - Candidate delimiters for auto-detection
- `hasHeaders` (default: true) - CSV has headers row
- `renameMap` - Rename column headers `{ newKey: oldKey }`
- `parseNumbers` (default: false) - Parse numeric values
- `parseBooleans` (default: false) - Parse boolean values
- `maxRows` (optional) - Maximum rows to process (no limit by default)

#### `autoDetectDelimiter(csv, candidates)`
Auto-detect CSV delimiter from content.

**Parameters:**
- `csv` - CSV content string
- `candidates` (optional) - Array of candidate delimiters (default: [';', ',', '\t', '|'])

**Returns:** Detected delimiter string

**Example:**
```javascript
const { autoDetectDelimiter } = require('jtcsv');

const delimiter = autoDetectDelimiter('id,name,age\\n1,John,30');
console.log(delimiter); // Output: ','
```

#### `saveAsCsv(data, filePath, options)`
Save JSON data as CSV file with security validation.

#### `readCsvAsJson(filePath, options)`
Read CSV file and convert to JSON array.

#### `readCsvAsJsonSync(filePath, options)`
Synchronous version of `readCsvAsJson`.

### Streaming API (stream-json-to-csv.js)

#### `createJsonToCsvStream(options)`
Create transform stream for JSON→CSV conversion.

#### `streamJsonToCsv(inputStream, outputStream, options)`
Pipe JSON stream through CSV transformation.

#### `saveJsonStreamAsCsv(inputStream, filePath, options)`
Stream JSON to CSV file.

#### `createJsonReadableStream(data)`
Create readable stream from JSON array.

#### `createCsvCollectorStream()`
Create writable stream that collects CSV data.

### Error Handling

Custom error classes for better debugging:
- `JtcsvError` - Base error class
- `ValidationError` - Input validation errors
- `SecurityError` - Security violations
- `FileSystemError` - File system operations
- `ParsingError` - CSV/JSON parsing errors
- `LimitError` - Size limit exceeded
- `ConfigurationError` - Invalid configuration

## 🛡️ Security Features

### CSV Injection Protection
```javascript
// Dangerous data with Excel formulas
const dangerous = [
  { id: 1, formula: '=HYPERLINK(\"http://evil.com\",\"Click\")' },
  { id: 2, formula: '@IMPORTANT' }
];

// Automatically escaped
const safeCsv = jsonToCsv(dangerous);
// Formulas are prefixed with ' to prevent execution
```

### Path Traversal Protection
```javascript
try {
  // This will throw SecurityError
  await saveAsCsv(data, '../../../etc/passwd.csv');
} catch (error) {
  console.error('Security violation:', error.message);
}
```

### Input Validation
```javascript
// All inputs are validated
jsonToCsv('not an array'); // throws ValidationError
jsonToCsv([], { delimiter: 123 }); // throws ConfigurationError
jsonToCsv(largeArray, { maxRecords: 100 }); // throws LimitError if >100 records
```

## 🔄 Complete Roundtrip Example

```javascript
const { jsonToCsv, csvToJson } = require('jtcsv');

// Original data
const original = [
  { id: 1, name: 'John', active: true, score: 95.5 },
  { id: 2, name: 'Jane', active: false, score: 88.0 }
];

// Convert to CSV
const csv = jsonToCsv(original, {
  delimiter: ',',
  parseNumbers: true,
  parseBooleans: true
});

// Convert back to JSON
const restored = csvToJson(csv, {
  delimiter: ',',
  parseNumbers: true,
  parseBooleans: true
});

// restored is identical to original
console.assert(JSON.stringify(original) === JSON.stringify(restored));
```

## 🧪 Testing

```bash
# Run all tests (108 tests)
npm test

# Test with coverage
npm run test:coverage

# Run specific test suites
npm test -- --testPathPattern=csv-to-json
npm test -- --testPathPattern=stream

# Lint code
npm run lint

# Security audit
npm run security-check
```

**Test Coverage: 100%** (108 passing tests)

## 📁 Project Structure

```
jtcsv/
├── index.js              # Main entry point
├── index.d.ts           # TypeScript definitions
├── json-to-csv.js       # JSON→CSV conversion
├── csv-to-json.js       # CSV→JSON conversion
├── errors.js            # Error classes
├── stream-json-to-csv.js # Streaming API
├── stream-csv-to-json.js # Streaming API
├── json-save.js         # File utilities
├── bin/jtcsv.js         # CLI tool
├── cli-tui.js           # Terminal UI (optional)
├── examples/            # Usage examples
├── __tests__/           # Test suites
├── benchmark.js         # Performance tests
├── CLI.md              # CLI documentation
├── BENCHMARK-RESULTS.md # Benchmark results
└── package.json
```

## 🚀 Getting Started

### Basic Usage
```javascript
const jtcsv = require('jtcsv');

// Convert JSON to CSV
const csv = jtcsv.jsonToCsv(data);

// Convert CSV to JSON
const json = jtcsv.csvToJson(csv);

// Save to file
await jtcsv.saveAsCsv(data, 'output.csv');

// Read from file
const data = await jtcsv.readCsvAsJson('input.csv');
```

### TypeScript Usage
```typescript
import { jsonToCsv, csvToJson } from 'jtcsv';

interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [...];
const csv = jsonToCsv(users);
const parsed = csvToJson<User>(csv);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a Pull Request

## 📄 License

MIT © Ruslan Fomenko

## 🔗 Links

- **GitHub**: https://github.com/Linol-Hamelton/jtcsv
- **npm**: https://www.npmjs.com/package/jtcsv-converter
- **Issues**: https://github.com/Linol-Hamelton/jtcsv/issues

---

## 🎯 When to Use jtcsv

### ✅ **Perfect For:**
- Simple JSON↔CSV conversion needs
- Security-conscious applications
- Large file processing (via streaming)
- Embedding in other packages (zero deps)
- TypeScript projects
- Enterprise applications requiring RFC compliance
- Command-line data processing

### ⚠️ **Consider Alternatives For:**
- Browser-only applications (use PapaParse)
- Extremely complex CSV formats
- Real-time streaming in browsers

## 📊 Comparison with Alternatives

| Feature | jtcsv | json2csv | PapaParse | csv-parser |
|---------|-------|----------|-----------|------------|
| **Size** | 8KB | 45KB | 35KB | 1.5KB |
| **Dependencies** | 0 | 4 | 0 | 0 |
| **JSON→CSV** | ✅ | ✅ | ✅ | ❌ |
| **CSV→JSON** | ✅ | ✅ | ✅ | ✅ |
| **Streaming** | ✅ | ❌ | ✅ | ✅ |
| **Auto-detect Delimiter** | ✅ | ❌ | ✅ | ❌ |
| **CSV Injection Protection** | ✅ | ❌ | ⚠️ | ❌ |
| **TypeScript** | ✅ | ✅ | ✅ | ❌ |
| **RFC 4180** | ✅ | ✅ | ✅ | ✅ |
| **CLI Tool** | ✅ | ✅ | ❌ | ❌ |
| **Bidirectional** | ✅ ⭐ | ❌ | ❌ | ❌ |

## 🆕 What's New in v1.2.0

- **Complete CLI tool** with rich features
- **Performance benchmarks** vs competitors
- **Auto-detect delimiter** improvements
- **Enhanced security** with CSV injection protection
- **TypeScript definitions** for all functions
- **100% test coverage** (152 passing tests)
- **Streaming API** for large files (>100MB)
- **Comprehensive documentation**

---

**Ready for production use with enterprise-grade security and performance.**"