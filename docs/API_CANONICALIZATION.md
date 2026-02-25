# API Canonicalization Guide
Current version: 3.1.0

This guide standardizes which function names to prefer in docs and examples.
Aliases remain supported for compatibility, but the canonical names below are the ones
we recommend for new code.

## Canonical function names (core)
- `csvToJson()` - CSV string -> JSON array
- `jsonToCsv()` - JSON array -> CSV string
- `createCsvToJsonStream()` - streaming CSV -> JSON objects
- `createJsonToCsvStream()` - streaming JSON -> CSV chunks
- `csvToJsonIterator()` - lazy iterator over a CSV string (still in memory)

## Canonical function names (browser)
- `parseCsvFile()` - File/Blob -> JSON array
- `parseCsvFileStream()` - File/Blob -> async iterator
- `csvToJsonStream()` - CSV string -> ReadableStream
- `jsonToCsvStream()` - JSON -> ReadableStream

## Canonical function names (NDJSON)
- `jsonToNdjson()` - Convert JSON array to NDJSON string
- `ndjsonToJson()` - Parse NDJSON string to JSON array
- `parseNdjsonStream()` - Async iterator over NDJSON stream
- `createNdjsonToCsvStream()` - Transform NDJSON to CSV
- `createCsvToNdjsonStream()` - Transform CSV to NDJSON
- `getNdjsonStats()` - Statistics about NDJSON data

## Canonical function names (TSV)
- `jsonToTsv()` - Convert JSON array to TSV string
- `tsvToJson()` - Parse TSV string to JSON array
- `validateTsv()` - Validate TSV structure
- `isTsv()` - Detect if string is likely TSV
- `readTsvAsJson()` - Read TSV file as JSON
- `readTsvAsJsonSync()` - Synchronous TSV file reading
- `saveAsTsv()` - Save JSON as TSV file
- `saveAsTsvSync()` - Synchronous TSV save
- `createJsonToTsvStream()` - Stream JSON to TSV
- `createTsvToJsonStream()` - Stream TSV to JSON

## Canonical function names (utilities)
- `autoDetectDelimiter()` - Auto-detect CSV delimiter
- `validateFilePath()` - Security validation for file paths
- `isEmail()`, `isUrl()`, `isDate()` - Built-in validators
- `createBatchProcessor()` - Batch processing helper
- `asyncIterUtils` - Utilities for async iteration
- `detectEncoding()`, `convertToUtf8()` - Encoding utilities

## Aliases (supported, not preferred)
Use these only when maintaining existing code.

| Alias | Canonical replacement |
| --- | --- |
| `csvToJsonFile()` | `readCsvAsJson()` |
| `csvToJsonFileSync()` | `readCsvAsJsonSync()` |
| `csvToJsonStream()` | `createCsvToJsonStream()` |
| `csvFileToJsonStream()` | `createCsvFileToJsonStream()` |

### CLI aliases
| Alias | Canonical command |
| --- | --- |
| `csv2json` | `csv-to-json` |
| `json2csv` | `json-to-csv` |

## Migration path (no behavior changes)
1. Replace the alias name with its canonical replacement.
2. Keep options unchanged.
3. Re-run existing tests.

## Notes
- Canonical names are used throughout docs to reduce confusion.
- Aliases are kept for backward compatibility.
