# JTCSV Error Codes and Recovery
Current version: 3.1.0


This page lists machine-readable error codes, error shapes, and recovery steps.

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

## Error Shape

All JTCSV errors inherit from `Error` and may include extra fields.

Common fields:
- `name` - error class name.
- `message` - human-readable message.
- `code` - machine-readable error code (see above).
- `hint` - optional remediation hint for a caller or user.
- `docs` - optional documentation pointer (path or URL).
- `context` - optional context payload (string or object) for debugging.

Additional fields by error type:
- `ParsingError`: `lineNumber`, `column`, `context`, `expected`, `actual`.
- `LimitError`: `limit`, `actual`.
- `FileSystemError`: `originalError` (when wrapping system errors).

## Recovery Suggestions

- `VALIDATION_ERROR`: Check delimiter, input types, and headers. Verify file extension and CSV format.
- `PARSING_ERROR`: Use `autoDetect` or specify `delimiter`. Validate quoting and line endings.
- `LIMIT_ERROR`: Increase `maxRows`/`maxRecords` or switch to streaming/iterator APIs.
- `SECURITY_ERROR`: Inspect input for formulas (`=`, `+`, `-`, `@`) and enable `preventCsvInjection`.
- `FILE_SYSTEM_ERROR`: Check file path permissions and ensure output directory exists.
- `CONFIGURATION_ERROR`: Review option names and types; avoid unsupported combinations.

## Error Recovery Options

Use these with `csvToJson` or streaming CSV parsers to control row-level failures.

- `onError`: `"throw"` (default), `"warn"`, or `"skip"`.
- `errorHandler`: `(error, line, lineNumber) => void` for custom logging or metrics.

```javascript
const rows = csvToJson(csvText, {
  onError: 'warn',
  errorHandler: (error, line, lineNumber) => {
    console.warn('bad row', lineNumber, error.message);
  }
});
```

## Example

```javascript
const { JtcsvError } = require('jtcsv');

try {
  // ...
} catch (err) {
  if (err instanceof JtcsvError) {
    console.error(err.code, err.message);
    if (err.hint) {
      console.error('Hint:', err.hint);
    }
    if (err.docs) {
      console.error('Docs:', err.docs);
    }
    if (err.context) {
      console.error('Context:', err.context);
    }
    if (err.lineNumber) {
      console.error('Line:', err.lineNumber);
    }
  }
}
```

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
