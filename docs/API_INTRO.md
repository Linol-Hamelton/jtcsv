# jtcsv API Documentation
Current version: 3.1.0


Welcome to the jtcsv API documentation. This library provides complete JSON<->CSV bidirectional conversion with streaming support, security features, and TypeScript types.

## Quick Links

- [GitHub Repository](https://github.com/Linol-Hamelton/jtcsv)
- [npm Package](https://www.npmjs.com/package/jtcsv)
- [Migration Guide (from PapaParse)](./MIGRATION_PAPAPARSE.md)
- [FAQ](./FAQ.md)

## Installation

```bash
npm install jtcsv
```

## Core Features

### JSON to CSV Conversion
- `jsonToCsv()` - Convert JSON array to CSV string
- `saveAsCsv()` - Save JSON as CSV file
- `createJsonToCsvStream()` - Streaming conversion

### CSV to JSON Conversion
- `csvToJson()` - Convert CSV string to JSON array
- `readCsvAsJson()` - Read CSV file as JSON
- `csvToJsonIterator()` - Async iterator for large files
- `createCsvToJsonStream()` - Streaming conversion

### Format Support
- **NDJSON**: `jsonToNdjson()`, `ndjsonToJson()`, `parseNdjsonStream()`
- **TSV**: `jsonToTsv()`, `tsvToJson()`, `validateTsv()`

### Streaming API
All streaming functions support backpressure and work with Node.js streams:
- `streamJsonToCsv()` - Pipe JSON to CSV
- `streamCsvToJson()` - Pipe CSV to JSON
- `createNdjsonToCsvStream()` - NDJSON to CSV transform stream

### Security Features
- CSV injection prevention (enabled by default)
- Path traversal protection
- RFC 4180 compliance
- JSON Schema validation

## Type Safety

jtcsv provides complete TypeScript definitions:

```typescript
import {
  jsonToCsv,
  csvToJson,
  JsonToCsvOptions,
  CsvToJsonOptions
} from 'jtcsv';

const options: JsonToCsvOptions = {
  delimiter: ',',
  preventCsvInjection: true
};

const csv = jsonToCsv(data, options);
```

## Error Classes

jtcsv provides specialized error classes for better error handling:

- `JtcsvError` - Base error class
- `ValidationError` - Invalid input data
- `SecurityError` - Security violations
- `ParsingError` - CSV/JSON parsing failures
- `FileSystemError` - File operation errors
- `LimitError` - Exceeded limits
- `ConfigurationError` - Invalid options

## Performance

jtcsv is optimized for high performance:
- **625,000 rows/sec** for simple CSV parsing
- **Fast-path engine** for common CSV patterns
- **Delimiter cache** with 3.67x speedup
- **Memory-efficient streaming** for large files

## Browser Support

jtcsv works in browsers with Web Workers support:

```javascript
import { jsonToCsv, csvToJson } from 'jtcsv/browser';
```

See the individual API documentation below for detailed usage information.
