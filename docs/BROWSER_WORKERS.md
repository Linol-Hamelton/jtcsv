# Browser API: Web Workers
Current version: 3.1.0


JTCSV includes a browser worker pool for CSV parsing to keep large workloads off the main thread.

## Exports (jtcsv/browser)

- `createWorkerPool(options)`
- `parseCSVWithWorker(csvInput, options, onProgress)`
- `createWorkerPoolLazy(options)`
- `parseCSVWithWorkerLazy(csvInput, options, onProgress)`

## Basic Usage

```js
import { parseCSVWithWorker } from 'jtcsv/browser';

const rows = await parseCSVWithWorker(fileOrString, {
  delimiter: ',',
  parseNumbers: true,
  parseBooleans: true
}, (progress) => {
  // progress is a number 0..100
  console.log('progress', progress);
});
```

## Worker Pool Options

```js
import { createWorkerPool } from 'jtcsv/browser';

const pool = createWorkerPool({
  workerCount: 4,
  maxQueueSize: 100,
  autoScale: true,
  idleTimeout: 60000
});
```

Available options:
- `workerCount` (number, default 4)
- `maxQueueSize` (number, default 100)
- `autoScale` (boolean, default true)
- `idleTimeout` (ms, default 60000)

## Inputs Supported

`parseCSVWithWorker` accepts:
- `string` (CSV text)
- `File`
- `ArrayBuffer` / `TypedArray`

## Notes

- The worker script is resolved relative to `document.baseURI` at runtime.
- Ensure the bundled `csv-parser.worker.js` is publicly available next to your output.
- Use the `Lazy` helpers to load the worker module only when needed.
- If Web Workers are not supported, a `ValidationError` is thrown.
