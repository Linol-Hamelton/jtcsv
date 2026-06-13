---
title: jtcsv/csv
description: CSV-side public surface — sync, async, iterator, and file helpers. Tree-shakable to ~18 KB gzipped.
---

# `jtcsv/csv`

The smallest possible import surface for converting CSV text into JSON rows. The
subpath ships only the parser plus delimiter helpers — streams, NDJSON, TSV and
worker scaffolding tree-shake out, leaving ~18 KB gzipped with zero runtime
dependencies. Defaults match what Excel emits (semicolon delimiter on empty
input, BOM tolerance, RFC 4180 quoting, CSV-injection guard on) so most callers
need no options at all. Pick this entry when your code path is "parse CSV, get
rows"; for everything else consult the [decision tree](/API_DECISION_TREE).

```ts
import { csvToJson } from 'jtcsv/csv';

const rows = csvToJson('id,name\n1,Alice\n2,Bob', { parseNumbers: true });
// → [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
```

## Parsing

### `csvToJson(csv, options?)`

```ts
function csvToJson(
  csv: string,
  options?: CsvToJsonOptions
): AnyArray;
```

Synchronously parses a CSV string into an array of row objects keyed by the
header row.

**Options** (most-used; full list in [`CsvToJsonOptions`](/API_INTRO)):

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `delimiter` | `string` | auto-detected | Single character separating fields. |
| `autoDetect` | `boolean` | `true` | Auto-detect delimiter from `candidates`. |
| `candidates` | `string[]` | `[';', ',', '\t', '|']` | Candidates considered when auto-detecting. |
| `hasHeaders` | `boolean` | `true` | First row is treated as headers. |
| `trim` | `boolean` | `true` | Trim whitespace from each field. |
| `parseNumbers` | `boolean` | `false` | Convert numeric-looking values to `number`. |
| `parseBooleans` | `boolean` | `false` | Convert `"true"`/`"false"` (case-insensitive) to `boolean`. |
| `preventCsvInjection` | `boolean` | `true` | Escape leading `=`, `+`, `-`, `@` to defuse spreadsheet formulas. |
| `repairRowShifts` | `boolean` | `true` | Drop trailing empty fields rather than throwing on a shifted row. |
| `normalizeQuotes` | `boolean` | `true` | Collapse excessive embedded quote runs. |
| `maxRows` | `number` | unlimited | Hard cap on rows returned. |
| `memoryLimit` | `number` | `5_000_000` | Row-count safety stop; set `Infinity` to disable. |
| `onError` | `'throw' \| 'skip' \| 'warn'` | `'throw'` | Per-row error recovery strategy. |

**Example**

```ts
import { csvToJson } from 'jtcsv/csv';

const csv = 'id,name\n1,Alice\n2,Bob';
const rows = csvToJson(csv, {
  parseNumbers: true,
  parseBooleans: true,
  trim: true,
});

console.log(rows);
// [ { id: 1, name: 'Alice' }, { id: 2, name: 'Bob' } ]
```

**Throws**

- `ValidationError` — `csv` is not a string.
- `ConfigurationError` — invalid option (bad delimiter, non-positive `maxRows`, etc.).
- `ParsingError` — malformed CSV when `onError: 'throw'`.
- `LimitError` — input exceeds `memoryLimit` or `maxRows`.

See also: [`csvToJsonAsync`](#csvtojsonasync-csv-options), [`csvToJsonIterator`](#csvtojsoniterator-csv-options).

---

### `csvToJsonAsync(csv, options?)`

```ts
function csvToJsonAsync(
  csv: string,
  options?: AsyncCsvToJsonOptions
): Promise<AnyArray>;
```

Async wrapper around `csvToJson` that opts into `worker_threads` parallelism
when `useWorkers: true`.

**Options** — every option from `CsvToJsonOptions` plus:

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `useWorkers` | `boolean` | `false` | Enable worker-pool parallelism. |
| `workerCount` | `number` | CPU cores − 1 | Pool size when `useWorkers: true`. |
| `chunkSize` | `number` | auto | Bytes per worker chunk. |
| `onProgress` | `(p: { processed: number; total: number; percentage: number }) => void` | — | Progress callback. |

Workers only pay off above the ~1 MB / 5 K-row threshold; below that the sync
path is cheaper. If `worker_threads` is unavailable (browser bundle,
restricted runtime) or a worker errors out, the call silently falls back to
the synchronous parser so callers don't have to special-case environments.

**Example**

```ts
import { csvToJsonAsync } from 'jtcsv/csv';

const csv = 'id,name\n1,Alice\n2,Bob';
const rows = await csvToJsonAsync(csv, {
  parseNumbers: true,
  useWorkers: true, // ignored — input is too small, falls back to sync
});

console.log(rows);
// [ { id: 1, name: 'Alice' }, { id: 2, name: 'Bob' } ]
```

**Throws** — same as `csvToJson`; worker failures degrade silently to the sync
path and only re-throw on a parse error in that path.

See also: [`csvToJson`](#csvtojson-csv-options), [`jtcsv/streams`](/api/streams).

---

### `csvToJsonIterator(csv, options?)`

```ts
function csvToJsonIterator(
  csv: string,
  options?: CsvToJsonOptions
): Generator<AnyObject, void, unknown>;
```

Generator that yields one row object at a time. Keeps memory at O(1) in the
caller — only the active row is materialised — so it suits very large strings
where you stream rows into a database or another transform.

Accepts the same options as `csvToJson`. Note that `memoryLimit` /
`memoryWarningThreshold` still apply to the parser's internal buffers, not to
your downstream sink.

**Example**

```ts
import { csvToJsonIterator } from 'jtcsv/csv';

const csv = 'id,name\n1,Alice\n2,Bob';

for (const row of csvToJsonIterator(csv, { parseNumbers: true })) {
  // row is yielded as soon as its line is parsed
  console.log(row);
}
// { id: 1, name: 'Alice' }
// { id: 2, name: 'Bob' }
```

**Throws** — same set as `csvToJson`; the iterator throws lazily on the row
that triggered the error when `onError: 'throw'`.

See also: [`csvToJson`](#csvtojson-csv-options), [`jtcsv/streams`](/api/streams)
for back-pressure-aware Transform streams.

## File I/O

### `readCsvAsJson(filePath, options?)`

```ts
function readCsvAsJson(
  filePath: string,
  options?: CsvToJsonOptions & { validatePath?: boolean }
): Promise<AnyArray>;
```

Reads a UTF-8 CSV file via `fs.promises.readFile` and parses it with
`csvToJson`. `validatePath` (default `true`) gates the file path through the
same path-traversal / null-byte checks used elsewhere in the library.

**Example**

```ts
import { readCsvAsJson } from 'jtcsv/csv';
import { writeFileSync } from 'node:fs';

// Round-trip with the canonical fixture:
writeFileSync('/tmp/people.csv', 'id,name\n1,Alice\n2,Bob');

const rows = await readCsvAsJson('/tmp/people.csv', { parseNumbers: true });
console.log(rows);
// [ { id: 1, name: 'Alice' }, { id: 2, name: 'Bob' } ]
```

**Throws**

- `FileSystemError` — `ENOENT`, `EACCES`, `EISDIR`, or any other fs failure.
- `SecurityError` — `validatePath: true` rejected the path.
- Any error `csvToJson` can throw.

---

### `readCsvAsJsonSync(filePath, options?)`

```ts
function readCsvAsJsonSync(
  filePath: string,
  options?: CsvToJsonOptions & { validatePath?: boolean }
): AnyArray;
```

Blocking sibling of `readCsvAsJson` using `fs.readFileSync`. Same options,
same throw set. Prefer the async variant in any request-handling code path.

**Example**

```ts
import { readCsvAsJsonSync } from 'jtcsv/csv';
import { writeFileSync } from 'node:fs';

writeFileSync('/tmp/people.csv', 'id,name\n1,Alice\n2,Bob');

const rows = readCsvAsJsonSync('/tmp/people.csv', { parseNumbers: true });
console.log(rows);
// [ { id: 1, name: 'Alice' }, { id: 2, name: 'Bob' } ]
```

---

### `autoDetectDelimiter(csv, options?)`

```ts
function autoDetectDelimiter(
  csv: string,
  options?:
    | { candidates?: string[]; useCache?: boolean; cache?: DelimiterCache }
    | string[]
): string;
```

Heuristic that scans the first kilobyte of input and returns the candidate
character that yields the most consistent column count. Defaults to `;` for
empty or whitespace-only input (matching the Excel-locale convention used
elsewhere in the library). Results are memoised through a process-wide
`DelimiterCache` unless `useCache: false` or a custom `cache` is supplied.

Pass either an options object or a bare array of candidate characters as the
second argument.

**Example**

```ts
import { autoDetectDelimiter } from 'jtcsv/csv';

const csv = 'id,name\n1,Alice\n2,Bob';
const delimiter = autoDetectDelimiter(csv);
// → ','

const semi = autoDetectDelimiter('id;name\n1;Alice\n2;Bob', {
  candidates: [';', ',', '\t', '|'],
});
// → ';'
```

**Throws**

- `ConfigurationError` — `candidates` is not an array, or contains non-string
  / multi-character entries.

## Deprecated aliases

These were the pre-1.x file-helper names. They forward to the canonical
functions and emit a one-shot `DeprecationWarning` the first time they are
called. They will be removed in `jtcsv 5.0`.

| Alias | Canonical | Removed in |
| --- | --- | --- |
| `csvToJsonFile` | [`readCsvAsJson`](#readcsvasjson-filepath-options) | jtcsv 5.0 |
| `csvToJsonFileSync` | [`readCsvAsJsonSync`](#readcsvasjsonsync-filepath-options) | jtcsv 5.0 |

```ts
// Old (warns once):
import { csvToJsonFile } from 'jtcsv/csv';
const rows = await csvToJsonFile('/tmp/people.csv');

// New:
import { readCsvAsJson } from 'jtcsv/csv';
const rows2 = await readCsvAsJson('/tmp/people.csv');
```

## Errors

Every parsing helper throws a member of the `JtcsvError` hierarchy. The
following classes are re-exported from `jtcsv/csv` so callers don't need a
second import; see [`jtcsv/errors`](/api/errors) for the full reference,
including stack-trace shape and recovery patterns.

| Class | `code` | When it fires |
| --- | --- | --- |
| `JtcsvError` | `JTCSV_ERROR` | Base class — catch this to handle any library error. |
| `ValidationError` | `VALIDATION_ERROR` | `csv` is not a string, or input fails schema. |
| `ParsingError` | `PARSING_ERROR` | Row malformed and `onError: 'throw'`. |
| `SecurityError` | `SECURITY_ERROR` | Path traversal, null byte, or formula-injection guard tripped. |
| `FileSystemError` | `FILE_SYSTEM_ERROR` | `readCsvAsJson` / `readCsvAsJsonSync` could not access the file. |
| `LimitError` | `LIMIT_ERROR` | `maxRows`, `memoryLimit`, or per-row size cap exceeded. |
| `ConfigurationError` | `CONFIGURATION_ERROR` | Invalid option type or value. |

```ts
import { csvToJson, ParsingError, LimitError } from 'jtcsv/csv';

try {
  const rows = csvToJson('id,name\n1,Alice\n2,Bob', { maxRows: 1 });
  console.log(rows);
} catch (err) {
  if (err instanceof LimitError) console.warn('truncate input:', err.message);
  else if (err instanceof ParsingError) console.error('bad row:', err.message);
  else throw err;
}
```

## Related

- [`jtcsv/json`](/api/json) — the inverse direction (JSON → CSV).
- [`jtcsv/streams`](/api/streams) — Transform streams for files that do not
  fit in memory.
- [`jtcsv/errors`](/api/errors) — every error class, code, and recovery
  pattern.
- [API decision tree](/API_DECISION_TREE) — pick the right entry point.
- [Migration from papaparse](/MIGRATION_PAPAPARSE) — drop-in replacement guide.
