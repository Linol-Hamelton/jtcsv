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
- **CSV injection prevention** – automatic escaping of Excel formulas (`=`, `+`, `-`, `@`), enabled by default (`preventCsvInjection: true`)
- **Path traversal protection** – validation of file paths to prevent `../` attacks, restricts to `.csv`/`.json` extensions only
- **RFC 4180 compliance** – strict adherence to CSV standard with proper quote handling and line breaks (`rfc4180Compliant: true`)
- **Automatic row shift repair** – detects and corrects misaligned columns caused by missing quotes (`repairRowShifts: true`)
- **Quote normalization** – normalizes single quotes, backticks, and smart quotes to standard double quotes (`normalizeQuotes: true`)
- **JSON Schema validation** – validate input data against JSON schemas for data integrity

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

## Complete API Reference

### Core Functions
- `csvToJson()` – Convert CSV string to JSON array
- `jsonToCsv()` – Convert JSON array to CSV string
- `preprocessData()` – Flatten nested objects before conversion
- `deepUnwrap()` – Internal utility for deep unwrapping

### File I/O
- `readCsvAsJson()` – Read CSV file as JSON (async)
- `readCsvAsJsonSync()` – Synchronous file reading
- `saveAsCsv()` – Save JSON data as CSV file
- `saveAsJson()` – Save data as JSON file
- `saveAsJsonSync()` – Synchronous JSON save

### Streaming
- `createCsvToJsonStream()` – Transform stream CSV→JSON
- `createJsonToCsvStream()` – Transform stream JSON→CSV
- `streamCsvToJson()` – Pipe CSV stream to JSON stream
- `streamJsonToCsv()` – Pipe JSON stream to CSV stream
- `createCsvFileToJsonStream()` – Stream CSV file to JSON objects
- `createJsonReadableStream()` – Create readable stream from JSON array
- `createCsvCollectorStream()` – Collect CSV output into buffer
- `createJsonCollectorStream()` – Collect JSON objects into array

### NDJSON Support
- `jsonToNdjson()` – Convert JSON array to NDJSON string
- `ndjsonToJson()` – Parse NDJSON string to JSON array
- `parseNdjsonStream()` – Async iterator over NDJSON stream
- `createNdjsonToCsvStream()` – Transform NDJSON to CSV
- `createCsvToNdjsonStream()` – Transform CSV to NDJSON
- `getNdjsonStats()` – Statistics about NDJSON data

### TSV Support
- `jsonToTsv()` – Convert JSON array to TSV string
- `tsvToJson()` – Parse TSV string to JSON array
- `validateTsv()` – Validate TSV structure
- `isTsv()` – Detect if string is likely TSV
- `readTsvAsJson()` – Read TSV file as JSON
- `readTsvAsJsonSync()` – Synchronous TSV file reading
- `saveAsTsv()` – Save JSON as TSV file
- `saveAsTsvSync()` – Synchronous TSV save
- `createJsonToTsvStream()` – Stream JSON to TSV
- `createTsvToJsonStream()` – Stream TSV to JSON

### Error Handling
- `JtcsvError`, `ValidationError`, `SecurityError`, `ParsingError`, `FileSystemError`, `LimitError`, `ConfigurationError` – Specialized error classes
- `createErrorMessage()` – Create detailed error messages
- `handleError()` – Centralized error handler
- `safeExecute()` – Safe execution wrapper

### Utilities
- `autoDetectDelimiter()` – Auto-detect CSV delimiter
- `validateFilePath()` – Security validation for file paths
- `isEmail()`, `isUrl()`, `isDate()` – Built-in validators
- `createBatchProcessor()` – Batch processing helper
- `asyncIterUtils` – Utilities for async iteration
- `detectEncoding()`, `convertToUtf8()` – Encoding utilities

For complete details, see the [generated API documentation](./api/index.html).

## Browser Support

jtcsv works in browsers with Web Workers support:

```javascript
import { jsonToCsv, csvToJson } from 'jtcsv/browser';
```

See the individual API documentation below for detailed usage information.
