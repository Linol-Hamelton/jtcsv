---
title: jtcsv/errors
description: Error class reference — codes, factories, helpers, and the ErrorContext builder.
---

# `jtcsv/errors`

Every error jtcsv throws is a `JtcsvError` with a stable `.code`. `instanceof JtcsvError` is always safe; downstream consumers should switch on `.code` for branch logic. Every public throw site sets `name`, `code`, and (when actionable) a one-line `.hint` pointing at the most likely fix.

```ts
import { csvToJson, ParsingError } from 'jtcsv';

try {
  csvToJson('a,b\n1,2,3');
} catch (e) {
  if (e instanceof ParsingError) {
    console.error(`${e.code} at line ${e.lineNumber}: ${e.message}`);
  }
}
```

The subpath `jtcsv/errors` exists so libraries and CLIs that only need to do `instanceof JtcsvError` against thrown values do not have to pull in any parser code. It re-exports everything below.

## Class hierarchy

```
Error
└── JtcsvError                       (code: JTCSV_ERROR)
    ├── ValidationError              (code: VALIDATION_ERROR)
    ├── SecurityError                (code: SECURITY_ERROR)
    ├── FileSystemError              (code: FILE_SYSTEM_ERROR)
    ├── ParsingError                 (code: PARSING_ERROR)
    ├── LimitError                   (code: LIMIT_ERROR)
    └── ConfigurationError           (code: CONFIGURATION_ERROR)
```

All subclasses inherit the `JtcsvError` shape — they only differ in `name`, `code`, and (in two cases) added fields.

## Classes

### `JtcsvError`

Base class. Every thrown jtcsv error is an instance of this.

```ts
class JtcsvError extends Error {
  code: string;
  hint?: string;
  docs?: string;
  context?: ErrorContextValue;
  originalError?: Error | null;

  constructor(message: string, code: string = 'JTCSV_ERROR', meta: ErrorMeta = {});
}
```

| Field           | Type                  | Description                                                                         |
| --------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `name`          | `string`              | Always `'JtcsvError'` (subclasses override).                                        |
| `code`          | `string`              | Stable machine-readable code. Default `'JTCSV_ERROR'`.                              |
| `message`       | `string`              | Human-readable summary (from `Error`).                                              |
| `hint`          | `string \| undefined` | Single-sentence actionable next step.                                               |
| `docs`          | `string \| undefined` | Optional link to a docs page for deeper context.                                    |
| `context`       | `ErrorContextValue`   | Free-form context — string snippet, object, or `null`.                              |
| `originalError` | `Error \| null \| undefined` | The wrapped error when jtcsv re-throws something from a downstream layer.   |
| `stack`         | `string \| undefined` | Trimmed via `Error.captureStackTrace` so the constructor frame is hidden.           |

Thrown directly only as a fallback wrapper from `safeExecuteAsync` / `safeExecuteSync` when the underlying error is not already a `JtcsvError`.

```ts
import { JtcsvError } from 'jtcsv/errors';

try {
  // ... any jtcsv call
} catch (e) {
  if (e instanceof JtcsvError) {
    console.error(`[${e.code}] ${e.message}`);
    if (e.hint) console.error(`hint: ${e.hint}`);
  } else {
    throw e;
  }
}
```

Caught shape:

```json
{
  "name": "JtcsvError",
  "code": "JTCSV_ERROR",
  "message": "JTCSV error: <details>",
  "hint": undefined,
  "originalError": <Error>
}
```

### `ValidationError`

Thrown when input data fails a contract check (wrong type, malformed argument, missing required field).

```ts
class ValidationError extends JtcsvError {
  constructor(message: string, meta: ErrorMeta = {});
}
```

| Field  | Value                |
| ------ | -------------------- |
| `name` | `'ValidationError'`  |
| `code` | `'VALIDATION_ERROR'` |

```ts
import { csvToJson, ValidationError } from 'jtcsv';

try {
  csvToJson(null as any);
} catch (e) {
  if (e instanceof ValidationError) {
    console.error(e.code, e.message);
  }
}
```

### `SecurityError`

Thrown when input would violate the threat-model perimeter (formula injection, path traversal, suspicious encoding, prototype pollution gadget, etc.).

```ts
class SecurityError extends JtcsvError {
  constructor(message: string, meta: ErrorMeta = {});
}
```

| Field  | Value              |
| ------ | ------------------ |
| `name` | `'SecurityError'`  |
| `code` | `'SECURITY_ERROR'` |

```ts
import { SecurityError } from 'jtcsv/errors';

try {
  // ... a call that opted into strict security checks
} catch (e) {
  if (e instanceof SecurityError) {
    // log + reject — do NOT auto-retry
  }
}
```

See [Threat model](/THREAT_MODEL) for the full list of triggers.

### `FileSystemError`

Thrown for file I/O failures — `ENOENT`, `EACCES`, write failures, stream open failures.

```ts
class FileSystemError extends JtcsvError {
  declare originalError: Error | null;

  constructor(
    message: string,
    originalError: Error | null = null,
    meta: ErrorMeta = {}
  );
}
```

| Field           | Type             | Description                                              |
| --------------- | ---------------- | -------------------------------------------------------- |
| `name`          | `string`         | Always `'FileSystemError'`.                              |
| `code`          | `string`         | Always `'FILE_SYSTEM_ERROR'`.                            |
| `originalError` | `Error \| null`  | The wrapped Node error (`fs.Stats` errors etc.).         |

```ts
import { FileSystemError } from 'jtcsv/errors';

try {
  // ... csvFileToJson on a missing path
} catch (e) {
  if (e instanceof FileSystemError) {
    console.error(e.message, e.originalError?.code); // e.g. 'ENOENT'
  }
}
```

### `ParsingError`

The error class most consumers will end up handling. Thrown when the CSV bytes themselves are malformed: stray quotes, ragged rows, invalid delimiter, fast-path bailouts.

```ts
class ParsingError extends JtcsvError {
  lineNumber: number | null;
  column: number | null;
  declare context: ErrorContextValue;
  expected: string | null;
  actual: string | null;
  /** The exact cell value that triggered the error, truncated to 200 chars. */
  value: string | null;
  /** Actionable next-step suggestion — usually a config flag or a fix pattern. */
  declare hint: string | undefined;
  originalMessage: string;

  constructor(
    message: string,
    lineNumber: number | null = null,
    column: number | null = null,
    context: string | null = null,
    expected: string | null = null,
    actual: string | null = null,
    meta: ErrorMeta & { value?: string | null; hint?: string } = {}
  );
}
```

| Field             | Type                   | Description                                                                 |
| ----------------- | ---------------------- | --------------------------------------------------------------------------- |
| `name`            | `string`               | Always `'ParsingError'`.                                                    |
| `code`            | `string`               | Always `'PARSING_ERROR'`.                                                   |
| `lineNumber`      | `number \| null`       | 1-indexed source line, when known.                                          |
| `column`          | `number \| null`       | 1-indexed column within the line, when known.                               |
| `context`         | `ErrorContextValue`    | Row snippet or contextual blob (string in practice).                        |
| `expected`        | `string \| null`       | What the parser expected ("3 fields", quoted char, etc.).                   |
| `actual`          | `string \| null`       | What the parser found.                                                      |
| `value`           | `string \| null`       | Offending cell value, truncated to **200 chars** with an ellipsis appended. |
| `hint`            | `string \| undefined`  | Concrete next step — usually a config flag or escape rule.                  |
| `originalMessage` | `string`               | The unembellished `message` argument the constructor was called with.      |

The constructor composes a multi-line `.message`:

```
<core message> at line N, column M
Context: <row snippet>
Expected: <X>
Actual: <Y>
Value: "<offending cell>"
Hint: <what to try>
```

Lines after `<core message>` only appear when the corresponding field is non-null.

```ts
import { csvToJson, ParsingError } from 'jtcsv';

try {
  csvToJson('a,b,c\n1,2'); // ragged row
} catch (e) {
  if (e instanceof ParsingError) {
    console.error(e.message);
    console.error('line:', e.lineNumber, 'expected:', e.expected, 'actual:', e.actual);
    if (e.hint) console.error('hint:', e.hint);
  }
}
```

Caught shape:

```json
{
  "name": "ParsingError",
  "code": "PARSING_ERROR",
  "message": "Field count mismatch at line 2\nContext: Row: \"1,2\"\nExpected: 3 fields\nActual: 2 fields\nHint: try `repairRowShifts: true` ...",
  "lineNumber": 2,
  "column": null,
  "expected": "3 fields",
  "actual": "2 fields",
  "value": null,
  "hint": "try `repairRowShifts: true` to auto-fill missing trailing cells, or quote any cell value that contains the delimiter",
  "originalMessage": "Field count mismatch"
}
```

### `LimitError`

Thrown when input violates a configured size / row / column / depth limit.

```ts
class LimitError extends JtcsvError {
  limit: any;
  actual: any;

  constructor(message: string, limit: any, actual: any, meta: ErrorMeta = {});
}
```

| Field    | Type     | Description                                |
| -------- | -------- | ------------------------------------------ |
| `name`   | `string` | Always `'LimitError'`.                     |
| `code`   | `string` | Always `'LIMIT_ERROR'`.                    |
| `limit`  | `any`    | The configured ceiling that was exceeded.  |
| `actual` | `any`    | The actual value seen.                     |

```ts
import { LimitError } from 'jtcsv/errors';

try {
  // ... csvToJson with maxFileSize and a too-big input
} catch (e) {
  if (e instanceof LimitError) {
    console.error(`limit ${e.limit} exceeded — saw ${e.actual}`);
  }
}
```

### `ConfigurationError`

Thrown when options passed to a public API are mutually inconsistent or out of range.

```ts
class ConfigurationError extends JtcsvError {
  constructor(message: string, meta: ErrorMeta = {});
}
```

| Field  | Value                   |
| ------ | ----------------------- |
| `name` | `'ConfigurationError'`  |
| `code` | `'CONFIGURATION_ERROR'` |

```ts
import { ConfigurationError } from 'jtcsv/errors';

try {
  // ... e.g. delimiter: 'invalid' or conflicting flags
} catch (e) {
  if (e instanceof ConfigurationError) {
    console.error('bad config:', e.message);
  }
}
```

## ParsingError factories

The six static factories on `ParsingError` are the canonical throw sites inside the parser. They centralize message wording, context formatting, and hint text. Use them directly when you wrap or extend the parser; otherwise just `instanceof ParsingError`.

### `ParsingError.csvFormat(message, lineNumber?, column?, rowContent?, hint?)`

```ts
static csvFormat(
  message: string,
  lineNumber: number | null = null,
  column: number | null = null,
  rowContent: string | null = null,
  hint?: string
): ParsingError;
```

Generic CSV format error. `rowContent` is truncated to 100 chars and formatted as ``Row content: "<snippet>"``.

```ts
throw ParsingError.csvFormat('Unexpected trailing data', 5, 12, 'a,b,c,', 'check for a stray delimiter');
// .message:
//   CSV format error: Unexpected trailing data at line 5, column 12
//   Context: Row content: "a,b,c,"
//   Hint: check for a stray delimiter
```

### `ParsingError.fieldCountMismatch(expected, actual, lineNumber?, rowContent?)`

```ts
static fieldCountMismatch(
  expectedCount: number,
  actualCount: number,
  lineNumber: number | null = null,
  rowContent: string | null = null
): ParsingError;
```

Most common parse failure. Auto-picks the hint based on direction:

- `actual < expected` → ```try `repairRowShifts: true` to auto-fill missing trailing cells, or quote any cell value that contains the delimiter```
- `actual > expected` → `the row has more fields than the header — check for an unquoted delimiter inside a cell value`

```ts
throw ParsingError.fieldCountMismatch(3, 2, 4, '1,2');
// .message:
//   Field count mismatch at line 4
//   Context: Row: "1,2"
//   Expected: 3 fields
//   Actual: 2 fields
//   Hint: try `repairRowShifts: true` ...
```

### `ParsingError.unclosedQuotes(lineNumber?, column?, content?)`

```ts
static unclosedQuotes(
  lineNumber: number | null = null,
  column: number | null = null,
  content: string | null = null
): ParsingError;
```

Parser scanned to end-of-input still inside a quoted field. Hint suggests either a missing closing `"` or a literal `"` that should have been escaped as `""`.

```ts
throw ParsingError.unclosedQuotes(7, 4, '"hello,world');
// .message:
//   Unclosed quotes in CSV at line 7, column 4
//   Context: Content: ""hello,world"
//   Hint: the parser scanned to end-of-input still inside a quoted field — a closing `"` may be missing, or a literal `"` in cell content was not escaped as `""`
```

### `ParsingError.invalidDelimiter(delimiter, lineNumber?, context?)`

```ts
static invalidDelimiter(
  delimiter: string,
  lineNumber: number | null = null,
  context: string | null = null
): ParsingError;
```

Delimiter option was not a single character.

```ts
throw ParsingError.invalidDelimiter('||');
// .message:
//   Invalid delimiter '||'
//   Hint: delimiter must be a single character. Common choices: `,` `;` `\t` `|`. For auto-detection, omit the option or set `autoDetect: true`.
```

### `ParsingError.cellValue(message, value, lineNumber?, column?, hint?)`

```ts
static cellValue(
  message: string,
  value: string,
  lineNumber: number | null = null,
  column: number | null = null,
  hint?: string
): ParsingError;
```

A specific cell value the parser could not process. The `value` is stored on `.value` truncated to 200 chars.

```ts
throw ParsingError.cellValue('Could not coerce to number', 'twelve', 3, 2, 'set coerceNumbers: false');
// .message:
//   Could not coerce to number at line 3, column 2
//   Value: "twelve"
//   Hint: set coerceNumbers: false
```

### `ParsingError.fastPathBailout(reason, content?)`

```ts
static fastPathBailout(reason: string, content: string | null = null): ParsingError;
```

The fast-path engine detected input it does not support (CRLF in quotes, escaped quotes, ragged columns). Hint points at `useFastPath: false`.

```ts
throw ParsingError.fastPathBailout('embedded newline inside quoted cell', '"a\nb",c');
// .message:
//   Fast-path parser bailout: embedded newline inside quoted cell
//   Context: Content snippet: ""a\nb",c"
//   Hint: try `useFastPath: false` to fall back to the standard quote-aware parser. The standard parser handles edge cases (CRLF in quotes, escaped quotes, mismatched columns) more robustly at a small perf cost.
```

## Error codes

The `ERROR_CODES` constant is the frozen record of every stable code string jtcsv emits.

```ts
export const ERROR_CODES = {
  JTCSV_ERROR: 'JTCSV_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SECURITY_ERROR: 'SECURITY_ERROR',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  LIMIT_ERROR: 'LIMIT_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PARSE_FAILED: 'PARSE_FAILED',
  SIZE_LIMIT: 'SIZE_LIMIT',
  INVALID_CONFIG: 'INVALID_CONFIG',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  STREAM_CREATION_ERROR: 'STREAM_CREATION_ERROR',
  STREAM_PROCESSING_ERROR: 'STREAM_PROCESSING_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

### Canonical class codes

Codes that appear as the runtime `.code` on a thrown error.

| Code                  | Class                |
| --------------------- | -------------------- |
| `JTCSV_ERROR`         | `JtcsvError`         |
| `VALIDATION_ERROR`    | `ValidationError`    |
| `SECURITY_ERROR`      | `SecurityError`      |
| `FILE_SYSTEM_ERROR`   | `FileSystemError`    |
| `PARSING_ERROR`       | `ParsingError`       |
| `LIMIT_ERROR`         | `LimitError`         |
| `CONFIGURATION_ERROR` | `ConfigurationError` |

### Aliasing codes (message-only)

These codes are accepted by `createErrorMessage()` and may appear on the wrapper `JtcsvError` produced by `safeExecuteAsync` / `safeExecuteSync`. They are **not** emitted as the `.code` of a class instance — class instances always carry the canonical code above.

| Code                      | Used by                                  |
| ------------------------- | ---------------------------------------- |
| `INVALID_INPUT`           | `createErrorMessage` / `safeExecute*`    |
| `SECURITY_VIOLATION`      | `createErrorMessage` / `safeExecute*`    |
| `FILE_NOT_FOUND`          | `createErrorMessage` / `safeExecute*`    |
| `PARSE_FAILED`            | `createErrorMessage` / `safeExecute*`    |
| `SIZE_LIMIT`              | `createErrorMessage` / `safeExecute*`    |
| `INVALID_CONFIG`          | `createErrorMessage` / `safeExecute*`    |
| `UNKNOWN_ERROR`           | `createErrorMessage` fallback            |
| `STREAM_CREATION_ERROR`   | `createErrorMessage` / `safeExecute*`    |
| `STREAM_PROCESSING_ERROR` | `createErrorMessage` / `safeExecute*`    |

Switching on `error.code` is the supported branch-logic pattern. Switching on `error.constructor.name` works but is brittle if the error crosses a Vite/ESM realm boundary.

## Helpers

### `createDetailedErrorMessage(baseMessage, details)`

```ts
function createDetailedErrorMessage(
  baseMessage: string,
  details: {
    lineNumber?: number;
    column?: number;
    context?: string;
    expected?: string;
    actual?: string;
    suggestion?: string;
    codeSnippet?: string;
    hint?: string;
    docs?: string;
  } = {}
): string;
```

Composes the multi-line message format used by `ParsingError`. Each `details` field that is set adds a newline-prefixed line in this fixed order: `lineNumber`, `column`, `context`, `expected`, `actual`, `suggestion`, `codeSnippet`, `hint`, `docs`.

```ts
import { createDetailedErrorMessage } from 'jtcsv/errors';

const msg = createDetailedErrorMessage('Field count mismatch', {
  lineNumber: 4,
  expected: '3 fields',
  actual: '2 fields',
  hint: 'enable repairRowShifts',
});
// "Field count mismatch at line 4\nExpected: 3 fields\nActual: 2 fields\nHint: enable repairRowShifts"
```

### `createErrorMessage(type, details)`

```ts
function createErrorMessage(type: ErrorCode, details: string): string;
```

Returns a standardized one-line message for a given `ErrorCode`. Used internally by `safeExecuteAsync` / `safeExecuteSync` when wrapping an unknown error. Examples:

| `type`             | Output                              |
| ------------------ | ----------------------------------- |
| `INVALID_INPUT`    | `Invalid input: <details>`          |
| `SECURITY_VIOLATION` | `Security violation: <details>`   |
| `FILE_NOT_FOUND`   | `File not found: <details>`         |
| `PARSE_FAILED`     | `Parse failed: <details>`           |
| `SIZE_LIMIT`       | `Size limit exceeded: <details>`    |
| `INVALID_CONFIG`   | `Invalid configuration: <details>`  |
| `UNKNOWN_ERROR`    | `Unknown error: <details>`          |

For unknown codes the function falls back to `UNKNOWN_ERROR`.

### `handleError(error, context?)`

```ts
function handleError(error: Error, context: Record<string, any> = {}): never;
```

In `NODE_ENV=development` logs a structured record (`message`, `code`, `stack`, `context`) to `console.error`, then re-throws. In production it just re-throws — there is no swallow path. Always terminates with a throw, hence the `never` return type.

### `safeExecute(fn, errorType, context?)`

```ts
function safeExecute<T>(
  fn: () => T | Promise<T>,
  errorType: ErrorCode,
  context: Record<string, any> = {}
): T | Promise<T>;
```

Auto-detects sync vs. async based on whether `fn()` returns a thenable, then dispatches to the matching helper below.

### `safeExecuteAsync(fn, errorType, context?)`

```ts
async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  errorType: ErrorCode,
  context: Record<string, any> = {}
): Promise<T>;
```

Runs `fn`. If it throws a `JtcsvError`, re-throws as-is. Otherwise wraps the original error in a fresh `JtcsvError` whose `.code = errorType`, `.message = createErrorMessage(errorType, original.message)`, and `.originalError = <thrown value>`, then funnels through `handleError`.

### `safeExecuteSync(fn, errorType, context?)`

```ts
function safeExecuteSync<T>(
  fn: () => T,
  errorType: ErrorCode,
  context: Record<string, any> = {}
): T;
```

Same contract as `safeExecuteAsync` but for synchronous callbacks.

```ts
import { safeExecute, ERROR_CODES } from 'jtcsv/errors';

const rows = safeExecute(
  () => csvToJson(rawText),
  ERROR_CODES.PARSE_FAILED,
  { function: 'importCustomerCsv', userId: '...' },
);
```

### `ErrorContext` — fluent builder

```ts
class ErrorContext {
  lineNumber(line: number): this;
  column(col: number): this;
  context(ctx: string): this;
  expected(exp: string): this;
  actual(act: string): this;
  suggestion(sugg: string): this;
  codeSnippet(snippet: string): this;
  hint(text: string): this;
  docs(link: string): this;
  buildMessage(baseMessage: string): string;
  throwParsingError(baseMessage: string): never;
  throwValidationError(baseMessage: string): never;
}
```

Chainable wrapper over `createDetailedErrorMessage`. Use it to assemble rich error metadata at a deep call site without passing seven positional arguments.

```ts
import { ErrorContext } from 'jtcsv/errors';

new ErrorContext()
  .lineNumber(4)
  .column(12)
  .context('Row: "1,2"')
  .expected('3 fields')
  .actual('2 fields')
  .hint('enable repairRowShifts')
  .throwParsingError('Field count mismatch');
// throws a ParsingError with the same multi-line message shape
```

`throwParsingError` and `throwValidationError` route the accumulated state into the matching constructor (the parsing variant also forwards `lineNumber`, `column`, `expected`, `actual`). If both `hint` and `suggestion` are set, `hint` wins.

## Types

The subpath re-exports the following types and aliases:

| Export                     | Kind            | Purpose                                                                          |
| -------------------------- | --------------- | -------------------------------------------------------------------------------- |
| `ErrorCode`                | `type` (union)  | The set of all stable code string literals — `typeof ERROR_CODES[keyof …]`.      |
| `ErrorContextValue`        | `type`          | Acceptable shapes for `JtcsvError.context`: `Record<string, any> \| string \| null`. |
| `ErrorMeta`                | `interface`     | Constructor metadata: `hint`, `docs`, `context`, `originalError`.                |
| `JtcsvErrorType`           | `type-only`     | Re-export of `JtcsvError` under a `*Type` alias for declaration files.           |
| `ValidationErrorType`      | `type-only`     | Re-export of `ValidationError`.                                                  |
| `SecurityErrorType`        | `type-only`     | Re-export of `SecurityError`.                                                    |
| `FileSystemErrorType`      | `type-only`     | Re-export of `FileSystemError`.                                                  |
| `ParsingErrorType`         | `type-only`     | Re-export of `ParsingError`.                                                     |
| `LimitErrorType`           | `type-only`     | Re-export of `LimitError`.                                                       |
| `ConfigurationErrorType`   | `type-only`     | Re-export of `ConfigurationError`.                                               |

The `*Type` aliases exist so consumers writing `.d.ts` files can reference the error shape without forcing the runtime class into their bundle.

## Designing for error handling

**When to catch.** A `try` block around any jtcsv call should catch `JtcsvError` — that one check covers every documented throw site, including streaming errors emitted on `error` events. Anything that is _not_ a `JtcsvError` is, by jtcsv's contract, a programmer bug or a host-platform failure; re-throw it.

**When to switch on `.code`.** Branch logic — "show this error to the user", "retry with a different config", "abort the import" — should switch on `error.code`, not on `error.constructor`. Class identity can drift across realm boundaries (Workers, Vite SSR, dynamic-import boundaries); `.code` is a plain string that survives any transport. The seven canonical class codes are documented above; if you only need binary logic, `instanceof JtcsvError` is enough.

**Why `.hint` is the action item.** `.message` describes _what happened_. `.hint` describes _what to do about it_, in one sentence, often naming the exact config flag that resolves the case. Surface `.hint` (when present) in your user-facing error UI — that is the single highest-leverage piece of UX work you can do on top of jtcsv. The `ParsingError.fieldCountMismatch` and `ParsingError.fastPathBailout` factories are the strongest examples.

## Related

- [`jtcsv/csv`](/api/csv), [`jtcsv/json`](/api/json), [`jtcsv/streams`](/api/streams)
- [Errors guide](/ERRORS)
- [Threat model](/THREAT_MODEL)
