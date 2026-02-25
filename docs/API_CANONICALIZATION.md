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
