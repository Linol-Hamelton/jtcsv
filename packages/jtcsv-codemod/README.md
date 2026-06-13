# jtcsv-codemod

[jscodeshift](https://github.com/facebook/jscodeshift) transforms that
migrate existing CSV-handling code to [jtcsv](https://www.npmjs.com/package/jtcsv).

```bash
npx jtcsv-codemod papaparse "src/**/*.{js,ts,tsx}"
npx jtcsv-codemod csvtojson "src/**/*.{js,ts,tsx}"
```

## Available transforms

| Transform   | From          | What it rewrites                                                                |
|-------------|---------------|----------------------------------------------------------------------------------|
| `papaparse` | `papaparse`   | imports, `Papa.parse`, `Papa.unparse`, option names                              |
| `csvtojson` | `csvtojson`   | imports, `csv().fromString/.fromFile/.fromStream(...).subscribe`, option names   |

More transforms (`csv-parser`) are planned — open an issue or PR with a
code sample if you'd like one.

## papaparse → jtcsv

### Imports

```diff
- import Papa from 'papaparse';
+ import { csvToJson, jsonToCsv } from 'jtcsv';
```

```diff
- const Papa = require('papaparse');
+ const { csvToJson, jsonToCsv } = require('jtcsv');
```

### Calls and option renames

```diff
- Papa.parse(csv, { header: true, dynamicTyping: true })
+ csvToJson(csv, { hasHeaders: true, parseNumbers: true })
```

```diff
- Papa.unparse(rows, { delimiter: ';' })
+ jsonToCsv(rows, { delimiter: ';' })
```

```diff
- const rows = Papa.parse(csv).data;
+ const rows = csvToJson(csv);
```

| Papa option       | jtcsv option       | Notes                                |
|-------------------|--------------------|--------------------------------------|
| `header`          | `hasHeaders`       |                                      |
| `dynamicTyping`   | `parseNumbers`     |                                      |
| `delimiter`       | `delimiter`        | unchanged                            |
| `newline`         | `newline`          | unchanged                            |
| `quoteChar`       | `quoteChar`        | unchanged                            |
| `escapeChar`      | `escapeChar`       | unchanged                            |
| `comments`        | `comments`         | unchanged                            |
| `skipEmptyLines`  | `skipEmptyLines`   | unchanged                            |

### Dropped options

These have no jtcsv equivalent and are stripped, with a `// TODO(jtcsv-codemod): …`
comment left at the call site so you can review:

`worker`, `download`, `fastMode`, `beforeFirstChunk`, `transformHeader`,
`preview`, `encoding`, `chunk`, `step`, `complete`, `error`.

If you used `step`/`complete` for streaming, switch to:

```js
import { createCsvToJsonStream } from 'jtcsv';
import { createReadStream } from 'fs';

await createReadStream('big.csv')
  .pipe(createCsvToJsonStream({ hasHeaders: true, parseNumbers: true }))
  .on('data', (row) => { /* per-row logic that used to live in step() */ });
```

## csvtojson → jtcsv

### Imports

```diff
- import csv from 'csvtojson';
+ import { csvToJson } from 'jtcsv';
```

```diff
- const csv = require('csvtojson');
+ const { csvToJson } = require('jtcsv');
```

The codemod only imports the jtcsv helpers it actually needs (`csvToJson`,
`readCsvAsJson`, `createCsvToJsonStream`, `createCsvFileToJsonStream`)
based on the call sites in each file.

### Calls

```diff
- const rows = await csv().fromString(s);
+ const rows = await csvToJson(s);
```

```diff
- const rows = await csv().fromFile('a.csv');
+ const rows = await readCsvAsJson('a.csv');
```

### Option renames

```diff
- csv({ noheader: true, checkType: true, delimiter: ';' }).fromString(s);
+ csvToJson(s, { hasHeaders: false, parseNumbers: true, parseBooleans: true, delimiter: ';' });
```

### Stream subscribe → pipe

```diff
- csv().fromStream(readable).subscribe(rowCb, errCb, endCb);
+ readable
+   .pipe(createCsvToJsonStream())
+   .on('data', rowCb)
+   .on('error', errCb)
+   .on('end', endCb);
```

### Options translation

| csvtojson option | jtcsv option                              | Notes                                        |
|------------------|-------------------------------------------|-----------------------------------------------|
| `noheader`       | `hasHeaders` (value **inverted**)         | `noheader: true` → `hasHeaders: false`        |
| `delimiter`      | `delimiter`                               | unchanged                                     |
| `checkType`      | `parseNumbers` + `parseBooleans`          | fan-out — both keys emitted                   |
| `trim`           | `trim`                                    | unchanged                                     |
| `includeColumns` | — (dropped, TODO comment)                 | no jtcsv equivalent today                     |
| `ignoreColumns`  | — (dropped, TODO comment)                 | no jtcsv equivalent today                     |
| `output`         | — (dropped, TODO comment)                 | no jtcsv equivalent today                     |
| `colParser`      | — (dropped, TODO comment)                 | no jtcsv equivalent today                     |

### Limitations

- `.on('json', cb)` and `.on('end_parsed', cb)` — left in place with a TODO;
  the closest jtcsv equivalent is `.on('data', cb)` on `createCsvToJsonStream`,
  but the row shape differs slightly so the codemod refuses to guess.
- `preFileLine(fn)` — left in place with a TODO; jtcsv has no per-line
  preprocessing hook, so you'll want to preprocess the readable stream
  manually before piping it through `createCsvToJsonStream()`.

## CLI flags

The CLI is a thin wrapper around `jscodeshift`. Anything after `--`
is passed straight through:

```bash
# dry-run (no writes, prints diff)
npx jtcsv-codemod papaparse src/ -- --dry --print

# only .ts and .tsx files
npx jtcsv-codemod papaparse src/ -- --extensions=ts,tsx
```

## Limitations

- Streaming patterns (`Papa.parse(file, { step })`) are flagged but not
  rewritten end-to-end — the manual switch is short, see above.
- Web Workers (`Papa.parse(file, { worker: true })`) require deciding
  between `jtcsv/web-workers` and Node `worker_threads`; we don't guess.
- Comment placement varies slightly by jscodeshift version; review the
  diff before committing.

## Contributing

Source: `transforms/papaparse-to-jtcsv.js`.
Tests: `__tests__/papaparse-to-jtcsv.test.js` (jscodeshift's
`applyTransform` helper).

PRs welcome.
