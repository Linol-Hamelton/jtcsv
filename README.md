# jtcsv - Complete JSON ↔ CSV Converter

**Version 2.0** - Now with full browser support, Web Workers, and streaming!

[![npm version](https://img.shields.io/npm/v/jtcsvps://www.npmjs.com/package/jtcsv)jtcsv
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)](https://www.npmjs.com/package/jtcsv

A lightweight, efficient, and secure library for converting between JSON and CSV formats with full browser support, Web Workers for large files, and streaming capabilities.

## ✨ Features

### 🚀 Core Features
- **Bidirectional Conversion**: JSON ↔ CSV with full type preservation
- **Zero Dependencies**: Pure JavaScript/TypeScript, no external dependencies
- **TypeScript Support**: Full type definitions included
- **Security First**: Built-in CSV injection protection
- **RFC 4180 Compliant**: Proper CSV formatting and escaping

### 🌐 Browser Support
- **Full Browser Compatibility**: Chrome, Firefox, Safari, Edge, Mobile
- **Web Workers**: Process large files without blocking UI
- **File API Integration**: Direct file upload/download support
- **Streaming Processing**: Handle files of any size
- **Progress Tracking**: Real-time progress updates

### ⚡ Performance
- **High Speed**: Optimized parsing algorithms
- **Memory Efficient**: Streaming and chunked processing
- **Worker Pool**: Reusable Web Workers for parallel processing
- **Caching**: Intelligent caching for repeated operations

### 🔧 Advanced Features
- **Auto-detection**: Automatic delimiter detection
- **Custom Headers**: Flexible header mapping and renaming
- **Nested Objects**: Support for complex nested structures
- **Multiple Formats**: CSV, TSV, Excel-compatible output
- **Error Handling**: Comprehensive error reporting and recovery

## 📦 Installation

### Node.js
```bash
npm install jtcsv
```

### Browser (CDN)
```html
<!-- UMD version (global jtcsv variable) -->
<script src="https://cdn.jsdelivr.net/npm/jtcsvst/jtcsv.umd.js"></script>

<!-- ESM version -->
<script type="module">
  import { jsonToCsv } from 'https://cdn.jsdelivr.net/npm/jtcsvst/jtcsv.esm.js';
</script>
```

## 🚀 Quick Start

### Node.js Usage
```javascript
const { jsonToCsv, csvToJson } = require('jtcsv

// JSON to CSV
const data = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

const csv = jsonToCsv(data, {
  delimiter: ',',
  includeHeaders: true,
  preventCsvInjection: true
});

console.log(csv);
// id,name,email
// 1,John,john@example.com
// 2,Jane,jane@example.com

// CSV to JSON
const csvString = 'id,name,email\n1,John,john@example.com\n2,Jane,jane@example.com';
const json = csvToJson(csvString, {
  delimiter: ',',
  parseNumbers: true
});

console.log(json);
// [
//   { id: 1, name: 'John', email: 'john@example.com' },
//   { id: 2, name: 'Jane', email: 'jane@example.com' }
// ]
```

### Browser Usage
```javascript
// Using global variable (UMD)
const csv = window.jtcsv.jsonToCsv(data, { delimiter: ',' });

// Download as file
window.jtcsv.downloadAsCsv(data, 'export.csv', { delimiter: ',' });

// Parse uploaded file
const fileInput = document.querySelector('input[type="file"]');
const json = await window.jtcsv.parseCsvFile(fileInput.files[0], {
  delimiter: ',',
  parseNumbers: true
});

// Use Web Workers for large files
const largeFile = document.querySelector('input[type="file"]').files[0];
const result = await window.jtcsv.parseCSVWithWorker(largeFile, {}, (progress) => {
  console.log(`Progress: ${progress.percentage.toFixed(1)}%`);
});
```

## 🔧 API Reference

### Core Functions

#### `jsonToCsv(data, options)`
Converts an array of objects to CSV string.

**Options:**
- `delimiter` (string, default: ';'): CSV delimiter character
- `includeHeaders` (boolean, default: true): Include header row
- `renameMap` (object): Map for renaming column headers
- `preventCsvInjection` (boolean, default: true): Escape formulas for security
- `rfc4180Compliant` (boolean, default: true): RFC 4180 compliance
- `maxRecords` (number): Maximum records to process

#### `csvToJson(csv, options)`
Converts CSV string to array of objects.

**Options:**
Fast path parsing is the default pipeline; use `fastPathMode` to control row shape.
- `delimiter` (string): Delimiter (auto-detected if not specified)
- `autoDetect` (boolean, default: true): Auto-detect delimiter
- `hasHeaders` (boolean, default: true): CSV has header row
- `parseNumbers` (boolean, default: false): Parse numeric values
- `parseBooleans` (boolean, default: false): Parse boolean values
- `trim` (boolean, default: true): Trim whitespace
- `maxRows` (number): Maximum rows to process
- `useFastPath` (boolean, default: true): Enable fast-path parser (set `false` to force quote-aware path)
- `fastPathMode` (string, default: 'objects'): `'objects'` for object rows, `'compact'` for arrays (lower memory), `'stream'` to return an async iterator

#### `csvToJsonIterator(csv, options)`
Convert CSV to JSON rows as an async iterator for large inputs.
You can also call `csvToJson(csv, { fastPathMode: 'stream' })` to get the same async iterator.

**Example:**
```javascript
const { csvToJsonIterator } = require('jtcsv');

const csv = 'id,name\n1,Jane\n2,John';
for await (const row of csvToJsonIterator(csv, { fastPathMode: 'compact' })) {
  console.log(row);
}
```

### Browser-Specific Functions

#### `downloadAsCsv(data, filename, options)`
Converts and downloads JSON as CSV file.

#### `parseCsvFile(file, options)`
Parses CSV File object to JSON.

#### `createCsvBlob(data, options)`
Creates CSV Blob without downloading.

#### `parseCsvBlob(blob, options)`
Parses CSV Blob to JSON.

### Web Workers Functions

#### `createWorkerPool(options)`
Creates a pool of Web Workers for parallel processing.

**Options:**
- `workerCount` (number, default: 4): Number of workers
- `maxQueueSize` (number, default: 100): Maximum queue size
- `autoScale` (boolean, default: true): Auto-scale workers
- `idleTimeout` (number, default: 60000): Idle timeout in ms

#### `parseCSVWithWorker(csvInput, options, onProgress)`
Parses CSV using Web Workers with progress tracking.

## 💡 Examples

### React Component Example
```jsx
import React, { useState } from 'react';
import { parseCsvFile, downloadAsCsv } from 'jtcsv

export function CSVProcessor() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const jsonData = await parseCsvFile(file, {
        delimiter: ',',
        parseNumbers: true
      });
      setData(jsonData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = () => {
    downloadAsCsv(data, 'export.csv', { delimiter: ',' });
  };
  
  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      <button onClick={handleExport} disabled={!data.length}>
        Export to CSV
      </button>
      {loading && <div>Processing...</div>}
      <pre>{JSON.stringify(data.slice(0, 5), null, 2)}</pre>
    </div>
  );
}
```

### Large File Processing with Progress
```javascript
import { parseCSVWithWorker } from 'jtcsv

async function processLargeFile(file) {
  const progressBar = document.getElementById('progress-bar');
  const status = document.getElementById('status');
  
  try {
    const result = await parseCSVWithWorker(file, {}, (progress) => {
      const percent = Math.round(progress.percentage);
      progressBar.style.width = percent + '%';
      progressBar.textContent = percent + '%';
      
      status.textContent = 
        `Processing: ${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()} rows ` +
        `(${Math.round(progress.speed)} rows/sec)`;
    });
    
    status.textContent = `Processed ${result.length.toLocaleString()} rows successfully`;
    return result;
  } catch (error) {
    status.textContent = `Error: ${error.message}`;
    throw error;
  }
}
```

### Security: CSV Injection Protection
```javascript
const dangerousData = [
  { formula: '=SUM(1,2)', command: '=cmd|"/c calc"!A1' }
];

// With protection enabled (default)
const safeCsv = jsonToCsv(dangerousData, { preventCsvInjection: true });
// formula,command
// "'=SUM(1,2)","'=cmd|"/c calc"!A1"
// Formulas are prefixed with single quote to prevent execution

// Without protection
const unsafeCsv = jsonToCsv(dangerousData, { preventCsvInjection: false });
// formula,command
// =SUM(1,2),=cmd|"/c calc"!A1
// WARNING: This could execute commands in Excel!
```

## 📊 Performance

### Benchmark Results (Node.js 22, 10K rows/records)

**CSV → JSON (10K rows)**

| Library | Time | Memory | Rank |
|---------|------|--------|------|
| **JTCSV (FastPath Compact)** | 16.79 ms | 4.47 MB | 🥇 1st |
| **JTCSV (FastPath Stream)** | 18.27 ms | 6.03 MB | 🥈 2nd |
| **JTCSV** | 19.76 ms | 8.96 MB | 🥉 3rd |
| PapaParse | 21.57 ms | 6.97 MB | 4th |
| csv-parser | 30.52 ms | 6.53 MB | 5th |

**JSON → CSV (10K records)**

| Library | Time | Memory | Rank |
|---------|------|--------|------|
| **JTCSV** | 11.21 ms | 4.77 MB | 🥇 1st |
| json2csv | 12.27 ms | 12.11 MB | 🥈 2nd |

### Scaling (JTCSV only)

| Rows/Records | CSV→JSON Time (FastPath Compact) | JSON→CSV Time (JTCSV) | CSV→JSON Memory | JSON→CSV Memory |
|--------------|----------------------------------|-----------------------|-----------------|-----------------|
| 1,000 | 2.06 ms | 1.04 ms | 2.15 MB | 0.52 MB |
| 10,000 | 14.68 ms | 8.23 ms | 2.11 MB | 4.14 MB |
| 100,000 | 164.18 ms | 90.93 ms | 44.93 MB | 34.79 MB |

See `BENCHMARK-RESULTS.md` and `docs/PERFORMANCE.md` for environment details and methodology.

## 🛠️ Development

### Building from Source
```bash
# Clone repository
git clone https://github.com/Linol-Hamelton/jtcsv.git
cd jtcsv

# Install dependencies
npm install

# Build browser version
npm run build

# Run tests
npm test

# Start demo server
npm run demo
```

### Project Structure
```
jtcsv/
├── src/browser/           # Browser-specific code
│   ├── index.js          # Browser entry point
│   ├── *.js              # Browser modules
│   └── workers/          # Web Workers implementation
├── dist/                 # Built distributions
│   ├── jtcsv.umd.js     # UMD bundle
│   ├── jtcsv.esm.js     # ESM bundle
│   └── jtcsv.cjs.js     # CJS bundle
├── demo/                 # Demo application
├── __tests__/           # Test files
├── rollup.config.mjs     # Build configuration
└── package.json         # Project configuration
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need for secure, efficient CSV processing in browsers
- Thanks to all contributors who have helped improve this library
- Special thanks to the open source community for invaluable tools and libraries

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Linol-Hamelton/jtcsv/issues)
- **Documentation**: [Full API documentation](https://github.com/Linol-Hamelton/jtcsv#readme)
- **Examples**: [Example code and demos](https://github.com/Linol-Hamelton/jtcsv/tree/main/demo)

---

**Happy coding!** If you find this library useful, please consider giving it a star on GitHub ⭐
