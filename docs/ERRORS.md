# JTCSV Error Codes and Recovery

This page lists machine-readable error codes and practical recovery steps.

## Error Codes

- `JTCSV_ERROR` - Generic JTCSV error.
- `VALIDATION_ERROR` - Input data is invalid or unsupported.
- `SECURITY_ERROR` - CSV injection or security check failed.
- `FILE_SYSTEM_ERROR` - File read/write failed.
- `PARSING_ERROR` - CSV/JSON parsing failed.
- `LIMIT_ERROR` - Size or record limit exceeded.
- `CONFIGURATION_ERROR` - Invalid options or configuration.
- `INVALID_INPUT` - Invalid input detected (legacy code from helpers).
- `SECURITY_VIOLATION` - Security violation (legacy helper code).
- `FILE_NOT_FOUND` - Missing file (legacy helper code).
- `PARSE_FAILED` - Parsing failed (legacy helper code).
- `SIZE_LIMIT` - Size limit exceeded (legacy helper code).
- `INVALID_CONFIG` - Invalid config (legacy helper code).
- `UNKNOWN_ERROR` - Unknown error (fallback).

## Recovery Suggestions

- `VALIDATION_ERROR`: Check delimiter, input types, and headers. Verify file extension and CSV format.
- `PARSING_ERROR`: Use `autoDetect` or specify `delimiter`. Validate quoting and line endings.
- `LIMIT_ERROR`: Increase `maxRows`/`maxRecords` or switch to streaming/iterator APIs.
- `SECURITY_ERROR`: Inspect input for formulas (`=`, `+`, `-`, `@`) and enable `preventCsvInjection`.
- `FILE_SYSTEM_ERROR`: Check file path permissions and ensure output directory exists.
- `CONFIGURATION_ERROR`: Review option names and types; avoid unsupported combinations.

## Usage

```javascript
const { ERROR_CODES, JtcsvError } = require('jtcsv');

try {
  // ...
} catch (err) {
  if (err instanceof JtcsvError) {
    console.error(err.code, err.message);
  }
}
```
