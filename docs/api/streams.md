---
title: jtcsv/streams
description: Node Transform streams for JSON ↔ CSV. Object-mode, backpressure-friendly, worker-aware.
---

# `jtcsv/streams`

Reach for `jtcsv/streams` when the file does not fit in memory. Every helper here is a thin wrapper around Node's `stream.Transform`. The recommended driver is `pipeline()` from `stream/promises` — it propagates backpressure and rejects on the first error.

The JSON side of every Transform is **object-mode** (one row per chunk). The CSV side is **byte/string mode** (newline-delimited rows). The two sides are bridged for you — you do not have to set `objectMode` flags yourself.

```ts
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createCsvToJsonStream } from 'jtcsv/streams';

await pipeline(
  createReadStream('./big.csv'),
  createCsvToJsonStream({ parseNumbers: true }),
  async function* (rows) {
    for await (const r of rows) {
      yield r;
    }
  },
);
```

The example above pipes a 1 GB CSV through the parser without ever materialising the full file in memory. The async generator is a sink — replace it with any `Writable` (object-mode) of your own.

---

## JSON → CSV

### `createJsonToCsvStream(options?)`

```ts
function createJsonToCsvStream(options?: JsonToCsvStreamOptions): Transform;
```

Returns a Transform whose **writable** side is object-mode (push one JS object per chunk) and whose **readable** side is text (one CSV row per `push`, including the trailing `\n`).

Options worth highlighting:

| Option                | Default      | Notes                                                                  |
|-----------------------|--------------|------------------------------------------------------------------------|
| `delimiter`           | `';'`        | Single character. Throws `ConfigurationError` otherwise.               |
| `includeHeaders`      | `true`       | Emits the header row before the first data row.                        |
| `headers` / `renameMap` | `{}`       | Use `renameMap` to rename specific columns in the output header.       |
| `template`            | `{}`         | Locks header order; extra row keys append after template keys.         |
| `addBOM`              | **`false`**  | See note below — different default than `saveJsonStreamAsCsv`.         |
| `preventCsvInjection` | `true`       | Prefixes `=`, `+`, `-`, `@` with `'` per OWASP CSV-injection guidance. |
| `rfc4180Compliant`    | `true`       | Writing: quotes fields containing `"`, the delimiter, `\n` or `\r`. Reading: picks the tokenizer dialect — `false` makes a backslash escape the next character. |
| `normalizeQuotes`     | `true`       | Collapses runs of `"` and unwraps wrapped JSON-like strings.           |
| `flatten`             | `false`      | Walks nested objects up to `flattenMaxDepth` (default `5`).            |
| `arrayHandling`       | `'stringify'`| `'stringify' | 'join' | 'expand'`.                                     |
| `maxRecords`          | `Infinity`   | Hard cap — throws `LimitError` when exceeded.                          |

> **Note — `addBOM` inconsistency.** `createJsonToCsvStream` defaults `addBOM` to **`false`**. `saveJsonStreamAsCsv` defaults it to **`true`** (Excel compatibility). This asymmetry is intentional and locked in by the test suite. See [/THREAT_MODEL](/THREAT_MODEL) (ADR-002) for the rationale: pure streams are encoding-agnostic, while the "save to a `.csv` on disk" path opts users into the Excel-friendly default.

```ts
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createJsonToCsvStream } from 'jtcsv/streams';

const rows = Readable.from([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]);

await pipeline(
  rows,
  createJsonToCsvStream({ delimiter: ',', renameMap: { id: 'ID' } }),
  process.stdout,
);
```

### `streamJsonToCsv(...)`

```ts
function streamJsonToCsv(
  data: AnyArray | AnyObject,
  options?: JsonToCsvStreamOptions,
): Promise<string>;

function streamJsonToCsv(
  readableStream: Readable,
  writableStream: Writable,
  options?: JsonToCsvStreamOptions,
): Promise<void>;
```

Overloaded helper. Pick the shape that matches your I/O:

| Shape                                  | Returns          | Use when                                              |
|----------------------------------------|------------------|-------------------------------------------------------|
| `streamJsonToCsv(array, opts?)`        | `Promise<string>`| The whole array already lives in memory.              |
| `streamJsonToCsv(readable, writable, opts?)` | `Promise<void>` | You have a true streaming source and sink.            |

```ts
import { streamJsonToCsv } from 'jtcsv/streams';

// In-memory → string
const csv = await streamJsonToCsv(
  [{ a: 1, b: 2 }, { a: 3, b: 4 }],
  { delimiter: ',' },
);

// Readable → Writable
import { createReadStream, createWriteStream } from 'fs';
await streamJsonToCsv(
  createReadStream('./rows.ndjson').pipe(/* your JSON parser */),
  createWriteStream('./out.csv'),
);
```

### `streamJsonToCsvAsync(data, options?)`

```ts
function streamJsonToCsvAsync(
  data: AnyArray | AnyObject,
  options?: JsonToCsvStreamOptions & {
    useWorkers?: boolean;
    workerCount?: number;
    chunkSize?: number;
    onProgress?: (p: { processed: number; total: number; percentage: number }) => void;
  },
): Promise<string>;
```

Worker-aware variant. With `useWorkers: false` (default) it is identical to `streamJsonToCsv(array, opts)`. With `useWorkers: true` **and** an array input, it dispatches chunks across `worker_threads` via `parallelJsonToCsv`. If `data` is not an array, workers are silently bypassed.

```ts
import { streamJsonToCsvAsync } from 'jtcsv/streams';

const csv = await streamJsonToCsvAsync(rows, {
  useWorkers: true,
  workerCount: 4,
  delimiter: ',',
});
```

### `saveJsonStreamAsCsv(readableStream, filePath, options?)`

```ts
function saveJsonStreamAsCsv(
  readableStream: Readable,
  filePath: string,
  options?: JsonToCsvStreamOptions & { validatePath?: boolean },
): Promise<void>;
```

Pipes a Readable of JSON objects to a `.csv` file. Validates the path against directory traversal (`..`) and enforces the `.csv` extension when `validatePath` is left at its default `true`. Creates the target directory recursively.

> **Note — `addBOM` default here is `TRUE`.** This is the only public API in `jtcsv/streams` that enables the UTF-8 BOM by default, because the produced file is most commonly opened in Excel. Pass `addBOM: false` to opt out. See [/THREAT_MODEL](/THREAT_MODEL) for ADR-002.

```ts
import { Readable } from 'stream';
import { saveJsonStreamAsCsv } from 'jtcsv/streams';

await saveJsonStreamAsCsv(
  Readable.from([{ id: 1 }, { id: 2 }]),
  './out/data.csv',
  { delimiter: ',' /* addBOM defaults to true here */ },
);
```

### `createJsonReadableStream(data, options?)`

```ts
function createJsonReadableStream(
  data: AnyArray | AnyObject,
  options?: { objectMode?: boolean },
): Readable;
```

Wraps an in-memory array (or single object) as an object-mode `Readable`. Useful as the source for `pipeline()` when you already have parsed JSON.

```ts
import { pipeline } from 'stream/promises';
import { createJsonReadableStream, createJsonToCsvStream } from 'jtcsv/streams';

await pipeline(
  createJsonReadableStream([{ a: 1 }, { a: 2 }]),
  createJsonToCsvStream(),
  process.stdout,
);
```

### `createCsvCollectorStream(options?)`

```ts
function createCsvCollectorStream(options?: JsonToCsvStreamOptions): Transform;
```

Buffers every CSV chunk it receives into a single string, exposed on the stream as `_collectedData` once the pipeline finishes. If you pass JSON-to-CSV options, the collector front-ends itself with `createJsonToCsvStream(options)` so you can write objects in and read the joined CSV out.

```ts
import { pipeline } from 'stream/promises';
import { createJsonReadableStream, createCsvCollectorStream } from 'jtcsv/streams';

const collector = createCsvCollectorStream({ delimiter: ',' });
await pipeline(createJsonReadableStream([{ a: 1 }]), collector);
const csv = (collector as any)._collectedData;
```

---

## CSV → JSON

### `createCsvToJsonStream(options?)`

```ts
function createCsvToJsonStream(options?: CsvToJsonStreamOptions): Transform;
```

Reads CSV bytes/strings on the writable side, emits one parsed object per row on the readable (object-mode) side.

| Option              | Default                       | Notes                                                                |
|---------------------|-------------------------------|----------------------------------------------------------------------|
| `delimiter`         | auto-detected                 | Pass to skip detection.                                              |
| `autoDetect`        | `true`                        | When `delimiter` is unset, picked from `candidates`.                 |
| `candidates`        | `[';', ',', '\t', '|']`       | Detection set.                                                       |
| `hasHeaders`        | `true`                        | When `false`, columns become `column_1`, `column_2`, …               |
| `parseNumbers`      | `false`                       | Coerces numeric strings to `number`.                                 |
| `parseBooleans`     | `false`                       | `'true' | 'false'` → boolean (case-insensitive).                     |
| `repairRowShifts`   | `true`                        | Merges shifted rows produced by stray newlines in quoted fields.     |
| `strictRowLengths`  | `false`                       | Throws on mismatched column counts when set.                         |
| `normalizeQuotes`   | `true`                        | Collapses `""…""` runs and unwraps wrapped strings.                  |
| `onError`           | `'throw'`                     | `'skip' | 'warn' | 'throw'`.                                         |
| `maxRows`           | `Infinity`                    | Hard cap — throws `LimitError`.                                      |

BOM stripping is automatic: the parser pipes its input through `createBomStripStream()` before the CSV tokenizer sees it, so a UTF-8 BOM never leaks into the first header name.

```ts
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createCsvToJsonStream } from 'jtcsv/streams';

const rows: any[] = [];
await pipeline(
  createReadStream('./input.csv'),
  createCsvToJsonStream({ parseNumbers: true, parseBooleans: true }),
  async function (source) {
    for await (const row of source) rows.push(row);
  },
);
```

### `streamCsvToJson(...)`

```ts
function streamCsvToJson(
  csv: string,
  options?: CsvToJsonStreamOptions,
): Promise<AnyArray>;

function streamCsvToJson(
  readableStream: Readable,
  writableStream: Writable,
  options?: CsvToJsonStreamOptions,
): Promise<void>;
```

Mirror of `streamJsonToCsv`.

```ts
import { streamCsvToJson } from 'jtcsv/streams';

const rows = await streamCsvToJson('id,name\n1,Alice\n2,Bob\n', {
  delimiter: ',',
  parseNumbers: true,
});
```

### `streamCsvToJsonAsync(csv, options?)`

```ts
function streamCsvToJsonAsync(
  csv: string,
  options?: CsvToJsonStreamOptions & {
    useWorkers?: boolean;
    workerCount?: number;
    chunkSize?: number;
    onProgress?: (p: { processed: number; total: number; percentage: number }) => void;
  },
): Promise<AnyArray>;
```

Same shape as `streamJsonToCsvAsync`. With `useWorkers: true`, parsing is fanned out across `worker_threads` via `parallelCsvToJson`. Falls back to the synchronous in-process implementation when workers are not available (no spurious error).

### `createCsvFileToJsonStream(filePath, options?)`

```ts
function createCsvFileToJsonStream(
  filePath: string,
  options?: CsvToJsonStreamOptions & { validatePath?: boolean },
): Promise<Readable>;
```

Resolves to an object-mode `Readable` of parsed rows. Validates the path (no `..`, must end in `.csv` by default). Use it as the source of any `pipeline()`.

```ts
import { pipeline } from 'stream/promises';
import { createCsvFileToJsonStream } from 'jtcsv/streams';

const source = await createCsvFileToJsonStream('./data.csv', { parseNumbers: true });
await pipeline(source, async function (rows) {
  for await (const r of rows) console.log(r);
});
```

### `createJsonCollectorStream(options?)`

```ts
function createJsonCollectorStream(options?: CsvToJsonStreamOptions): Transform;
```

Writable side is object-mode — push rows in, read the accumulated array out as `_collectedData` once flushed. Symmetric to `createCsvCollectorStream`.

```ts
import { pipeline } from 'stream/promises';
import { createCsvFileToJsonStream, createJsonCollectorStream } from 'jtcsv/streams';

const collector = createJsonCollectorStream();
await pipeline(await createCsvFileToJsonStream('./data.csv'), collector);
const rows = (collector as any)._collectedData;
```

---

## Deprecated aliases

These remain exported for legacy code but emit a one-shot `DeprecationWarning` and will be **removed in jtcsv 5.0**.

| Deprecated                | Replacement                  |
|---------------------------|------------------------------|
| `csvToJsonStream`         | `createCsvToJsonStream`      |
| `csvFileToJsonStream`     | `createCsvFileToJsonStream`  |

```ts
// Bad — warns once per process.
import { csvToJsonStream } from 'jtcsv/streams';

// Good.
import { createCsvToJsonStream } from 'jtcsv/streams';
```

---

## Choosing the right helper

| Source              | Sink            | Use                                |
|---------------------|-----------------|------------------------------------|
| in-memory array     | string          | `streamJsonToCsv(data, opts)`      |
| `Readable`          | `Writable`      | `streamJsonToCsv(rs, ws, opts)`    |
| in-memory array     | file            | `saveJsonStreamAsCsv(rs, path)`    |
| CSV string          | array           | `streamCsvToJson(csv, opts)`       |
| file path           | iterator        | `createCsvFileToJsonStream(path)`  |
| `Readable` of rows  | array           | `createJsonCollectorStream()`      |

For one-shot conversions of data that already fits in memory, the in-memory APIs in [`jtcsv/csv`](/api/csv) and [`jtcsv/json`](/api/json) are simpler. Reach for `jtcsv/streams` only when you actually need to stream.

---

## Backpressure & worker threads

Every Transform here uses the Node default object-mode `highWaterMark` of **16 items** on the JSON side and **16 KiB** on the CSV side. That means a slow sink will naturally pause the upstream parser via the standard `_read` / `_write` handshake — `pipeline()` propagates this for you, so you do not need to manage `.pause()` / `.resume()` manually. If you build a custom Writable, make sure to honour the return value of `write()`.

The `*Async` helpers (`streamJsonToCsvAsync`, `streamCsvToJsonAsync`) opt in to `worker_threads` when `useWorkers: true` and the input is an array. The internal heuristic in `parallelize` only spins up workers when the payload exceeds roughly **1 MB or 5 000 rows** — below that threshold the cost of cloning data across the thread boundary dominates the parse. If `worker_threads` cannot be loaded (some embedded runtimes, certain bundlers), both helpers silently fall back to the synchronous in-process path so calling code never observes an error.

---

## Related

- [`jtcsv/csv`](/api/csv) — in-memory CSV ↔ JSON helpers
- [`jtcsv/json`](/api/json) — JSON-side utilities
- [`jtcsv/errors`](/api/errors) — `ValidationError`, `LimitError`, `SecurityError`, …
- [Streaming guide](/STREAMING_GUIDE) — long-form walkthrough with benchmarks
- [Threat model & ADRs](/THREAT_MODEL) — including ADR-002 on the `addBOM` defaults
