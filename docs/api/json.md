---
title: jtcsv/json
description: JSON-side public surface — sync, async, and file save helpers with path-traversal hardening.
---

# `jtcsv/json`

Smallest possible import for JSON → CSV. CSV injection guard is ON by default —
cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` are prefixed with a single
quote so they cannot detonate as formulas when the file is opened in Excel,
Numbers, or LibreOffice. `saveAsCsv` additionally hardens the destination path
against `..` traversal, null bytes, UNC shares, and non-`.csv` extensions
before it ever touches the filesystem.

```ts
import { jsonToCsv } from 'jtcsv/json';

const csv = jsonToCsv([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]);
// → 'id;name\r\n1;Alice\r\n2;Bob'
```

Tree-shake budget: importing the whole subpath pulls in roughly the
serializer, the schema validator, the worker plumbing, and the error classes —
no parser, no streams, no NDJSON.

## Serialization

### `jsonToCsv(data, options?)`

Synchronous `Array → string`. Validates input, applies optional schema
validation/formatting, flattens nested values, escapes CSV-injection payloads,
and emits an RFC 4180-compliant string.

Signature:

```ts
function jsonToCsv(data: any[], options?: JsonToCsvOptions): string;
```

Options (defaults shown):

| Option                    | Default       | Purpose                                                                  |
| ------------------------- | ------------- | ------------------------------------------------------------------------ |
| `delimiter`               | `';'`         | Single-character field separator.                                        |
| `includeHeaders`          | `true`        | Emit the header row.                                                     |
| `renameMap`               | `{}`          | `{ oldKey: newHeader }` — rewrites column names.                         |
| `template`                | `{}`          | Forces column order; keys not in template are appended.                  |
| `preventCsvInjection`     | **`true`**    | Escapes `= + - @ \t \r` prefixes. The security win — leave it on.        |
| `rfc4180Compliant`        | `true`        | Use `\r\n` line endings and standards-compliant quoting.                 |
| `normalizeQuotes`         | `true`        | Collapse smart-quotes / backticks to plain `"` before emission.          |
| `schema`                  | `null`        | JSON-schema-like map of `{ field: { validate, format } }`.               |
| `flatten`                 | `false`       | Walk nested objects into dotted keys.                                    |
| `flattenSeparator`        | `'.'`         | Separator for flattened keys.                                            |
| `flattenMaxDepth`         | `3`           | Stop flattening past this depth.                                         |
| `arrayHandling`           | `'stringify'` | `'stringify' \| 'join' \| 'expand'` — controls how arrays become cells.  |
| `maxRecords`              | _none_        | Hard limit; throws `LimitError` when exceeded.                           |
| `memoryWarningThreshold`  | `1_000_000`   | `console.warn` when row count exceeds this (skipped in tests).           |
| `memoryLimit`             | `5_000_000`   | Hard `LimitError` ceiling; pass `Infinity` to disable.                   |

`addBOM` is **not** on this signature — `jsonToCsv` returns a plain string. If
you need a BOM for Excel, prepend `'﻿'` yourself, or use the streaming
variant in [`jtcsv/streams`](/api/streams) which exposes `addBOM: true`.

Example — rename + reorder + injection guard:

```ts
import { jsonToCsv } from 'jtcsv/json';

const rows = [
  { id: 1, name: 'Alice',  note: '=cmd|"/c calc"!A1' },
  { id: 2, name: 'Bob',    note: 'hello'              },
];

const csv = jsonToCsv(rows, {
  delimiter: ',',
  renameMap: { id: 'ID', name: 'Full name' },
  template:  { id: null, name: null, note: null },
});
// → ID,Full name,note
//   1,Alice,"'=cmd|""/c calc""!A1"
//   2,Bob,hello
```

The leading `'` in front of the `=` is `preventCsvInjection` doing its job —
neutering the formula before Excel sees it.

### `jsonToCsvAsync(data, options?)`

Opt-in worker-thread version. Same options as `jsonToCsv`, plus four async
flags. Without `useWorkers: true`, this is just a microtask-deferred wrapper
around the sync path — workers are not free, and the spawn cost only
amortizes on large inputs (default threshold 5 000 rows).

Signature:

```ts
function jsonToCsvAsync(
  data: any[],
  options?: AsyncJsonToCsvOptions,
): Promise<string>;
```

Extra options on top of `JsonToCsvOptions`:

| Option        | Default                  | Purpose                                  |
| ------------- | ------------------------ | ---------------------------------------- |
| `useWorkers`  | `false`                  | Enable worker-pool parallelization.      |
| `workerCount` | `0` (auto: cores − 1)    | Worker count when `useWorkers: true`.    |
| `chunkSize`   | _heuristic_              | Rows per worker chunk.                   |
| `onProgress`  | `undefined`              | `({ processed, total, percentage })`.    |

```ts
import { jsonToCsvAsync } from 'jtcsv/json';

const csv = await jsonToCsvAsync(bigArray, {
  useWorkers: true,
  workerCount: 4,
  onProgress: ({ percentage }) => process.stdout.write(`\r${percentage}%`),
});
```

If `data` is not an array, the call quietly falls back to the sync path so
you still get the same `ValidationError` surface.

### `preprocessData(data, options?)`

Pure transform — apply flattening and array handling **without** serializing
to CSV. Useful when you want to feed the result into something else (NDJSON,
a database, a `console.table`).

Signature:

```ts
function preprocessData(
  data: any[],
  options?: PreprocessOptions,
): Record<string, unknown>[];
```

Options:

| Option              | Default       | Purpose                                                  |
| ------------------- | ------------- | -------------------------------------------------------- |
| `flatten`           | `false`       | Walk nested objects into dotted keys.                    |
| `flattenSeparator`  | `'.'`         | Separator for flattened keys.                            |
| `flattenMaxDepth`   | `3`           | Recursion ceiling.                                       |
| `arrayHandling`     | `'join'`      | `'stringify' \| 'join' \| 'expand'`.                     |

```ts
import { preprocessData } from 'jtcsv/json';

const flat = preprocessData(
  [{ user: { id: 1, name: 'Alice' }, tags: ['admin', 'beta'] }],
  { flatten: true, arrayHandling: 'join' },
);
// → [{ 'user.id': 1, 'user.name': 'Alice', tags: 'admin, beta' }]
```

Returns `[]` when `data` is not an array — it never throws.

### `deepUnwrap(value, depthOrOptions?, maxDepthParam?)`

Recursively reduces a value to a CSV-safe primitive. Handles circular
references (`'[Circular Reference]'`), depth caps (`'[Too Deep]'`), bigints,
empty objects/arrays, and unstringifiable values.

Signature:

```ts
function deepUnwrap(
  value: any,
  depthOrOptions?: number | DeepUnwrapOptions,
  maxDepthParam?: number,
): string | unknown[];
```

Two calling conventions, kept for backwards compatibility:

```ts
import { deepUnwrap } from 'jtcsv/json';

// New form — options object
deepUnwrap({ a: { b: { c: 1 } } }, { maxDepth: 2 });
// → '[Too Deep]'

deepUnwrap([1, [2, [3]]], { preserveArrays: true });
// → [ '1', [ '2', [ '3' ] ] ]

// Legacy form — (value, currentDepth, maxDepth)
deepUnwrap(['a', 'b', 'c'], 0, 10);
// → 'a, b, c'
```

`preserveArrays: true` keeps the array shape (each leaf coerced to a string)
instead of joining with `', '`. `maxDepth` defaults to 10 in both forms.

## File I/O

All file helpers create missing parent directories with `mkdir({ recursive:
true })` before writing.

### `saveAsCsv(data, filePath, options?)`

Async write to disk. Runs `validateFilePath(filePath)` first (`validatePath:
true` by default), then `jsonToCsv(data, options)`, then `fs.writeFile`.

Signature:

```ts
function saveAsCsv(
  data: any[],
  filePath: string,
  options?: SaveAsCsvOptions,
): Promise<void>;
```

`SaveAsCsvOptions` extends `JsonToCsvOptions` with:

| Option         | Default | Purpose                                         |
| -------------- | ------- | ----------------------------------------------- |
| `validatePath` | `true`  | Run the path-traversal / extension guard.       |

What the path guard rejects:

- empty strings, non-strings, whitespace-only paths (`ValidationError`)
- any path containing `..`, including URL-encoded `%2e%2e` (`SecurityError`)
- null bytes in the path (`SecurityError`)
- UNC / network paths on Windows (`\\server\share`) (`SecurityError`)
- well-known sensitive POSIX targets (`/etc/passwd`, `/proc/self`, …)
- anything that isn't `.csv` (`ValidationError`)

Any underlying `fs` error is wrapped in `FileSystemError` — your `try/catch`
only ever needs to know about the jtcsv hierarchy.

```ts
import { saveAsCsv, SecurityError } from 'jtcsv/json';

try {
  await saveAsCsv(rows, './out/report.csv', { delimiter: ',' });
} catch (err) {
  if (err instanceof SecurityError) {
    console.error('Refused unsafe path:', err.message);
  } else {
    throw err;
  }
}
```

### `saveAsCsvAsync(data, filePath, options?)`

Alias of `saveAsCsv`. Same signature, same semantics — kept for symmetry with
`jsonToCsvAsync`. Prefer `saveAsCsv` in new code.

### `saveAsJson(data, filePath, options?)`

Async write **as JSON** (not CSV). Returns the resolved absolute path so you
can log it or hand it to a follow-up step.

Signature:

```ts
function saveAsJson(
  data: any,
  filePath: string,
  options?: SaveAsJsonOptions,
): Promise<string>;
```

Options:

| Option        | Default      | Purpose                                                   |
| ------------- | ------------ | --------------------------------------------------------- |
| `prettyPrint` | `false`      | `JSON.stringify(data, null, 2)`.                          |
| `maxSize`     | `10_485_760` | Hard byte cap (default 10 MiB); throws `LimitError`.      |

Path validation is always on for the JSON helpers: the file must end in
`.json`, must not contain `..`, and must not be a UNC path. Circular
references are caught and re-thrown as `ValidationError('JSON contains
circular references')`.

```ts
import { saveAsJson } from 'jtcsv/json';

const abs = await saveAsJson(
  [{ id: 1, name: 'Alice' }],
  './out/users.json',
  { prettyPrint: true, maxSize: 1_000_000 },
);
console.log('wrote', abs);
```

### `saveAsJsonAsync(data, filePath, options?)`

Worker-thread variant for API symmetry. Accepts `useWorkers`, `workerCount`,
`chunkSize`, and `onProgress` on top of `SaveAsJsonOptions`. Today these are
accepted but not yet exploited — `JSON.stringify` plus a single `writeFile`
is I/O-bound, so workers don't pay off; the option surface is reserved for
future streaming serialization. Behaviourally identical to `saveAsJson`.

```ts
import { saveAsJsonAsync } from 'jtcsv/json';

await saveAsJsonAsync(rows, './out/users.json', {
  prettyPrint: true,
  useWorkers: true, // accepted; routed through saveAsJson for now
  onProgress: (p) => console.log(p.percentage),
});
```

### `saveAsJsonSync(data, filePath, options?)`

Blocking version of `saveAsJson`. Same options, same validation, returns the
resolved absolute path. Use only in CLIs, build scripts, and tests — never on
a request path.

```ts
import { saveAsJsonSync } from 'jtcsv/json';

const abs = saveAsJsonSync({ ok: true }, './out/status.json');
```

### `validateFilePath(filePath, options?)`

The same path guard `saveAsCsv` runs internally, exposed so you can validate
ahead of time (e.g. before showing a "save" button in a UI).

Signature:

```ts
function validateFilePath(
  filePath: string,
  options?: { allowRelative?: boolean },
): true;
```

| Option          | Default | Purpose                                       |
| --------------- | ------- | --------------------------------------------- |
| `allowRelative` | `true`  | Reject `./foo.csv` and `.\foo.csv` when off.  |

Returns `true` on success. Throws `ValidationError` for shape issues
(non-string, no extension, wrong extension) and `SecurityError` for
traversal, null bytes, UNC paths, or sensitive POSIX targets.

```ts
import { validateFilePath, SecurityError } from 'jtcsv/json';

try {
  validateFilePath('../../etc/passwd');
} catch (err) {
  console.log(err instanceof SecurityError); // true
  console.log(err.message);                  // 'Directory traversal detected …'
}
```

Note: this is the CSV-side validator (extension must be `.csv`). The JSON
helpers use their own internal validator that requires `.json`; the
re-exported `validateFilePath` is intentionally the CSV one because that is
what `saveAsCsv` calls.

## Errors

All public functions only throw `JtcsvError` subclasses — underlying `fs`,
`JSON.stringify`, and worker errors are wrapped before they leak out.

| Class                 | Thrown when                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `JtcsvError`          | Base class. Catch this to handle everything jtcsv-shaped.            |
| `ValidationError`     | Bad input shape — not an array, missing extension, circular JSON.    |
| `ConfigurationError`  | Bad option type — `delimiter` not a string, `maxRecords` negative.   |
| `SecurityError`       | Path traversal, null byte, UNC path, CSV-injection-class refusal.   |
| `LimitError`          | `maxRecords`, `memoryLimit`, or `maxSize` exceeded.                  |
| `ParsingError`        | Serialization failed (rare on the JSON-side; mostly CSV → JSON).     |
| `FileSystemError`     | `fs.writeFile` / `mkdir` failed — `EACCES`, `ENOSPC`, `ENOENT`, …    |

```ts
import {
  saveAsCsv,
  JtcsvError,
  SecurityError,
  LimitError,
} from 'jtcsv/json';

try {
  await saveAsCsv(rows, userPath, { maxRecords: 10_000 });
} catch (err) {
  if (err instanceof SecurityError) return refuse(err);
  if (err instanceof LimitError)    return paginate(err);
  if (err instanceof JtcsvError)    return report(err);
  throw err;
}
```

## Related

- [`jtcsv/csv`](/api/csv) — the CSV → JSON side of the same surface.
- [`jtcsv/streams`](/api/streams) — for large inputs use streaming
  `saveJsonStreamAsCsv` / `createJsonToCsvStream`; the streaming options
  expose `addBOM`, which the in-memory `jsonToCsv` does not.
- [`jtcsv/errors`](/api/errors) — full hierarchy, error codes, and the
  `safeExecute*` helpers used internally.
