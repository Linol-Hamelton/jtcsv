# jtcsv-codemod

[jscodeshift](https://github.com/facebook/jscodeshift) transforms that
migrate existing CSV-handling code to [jtcsv](https://www.npmjs.com/package/jtcsv).

```bash
npx jtcsv-codemod papaparse "src/**/*.{js,ts,tsx}"
```

## Available transforms

| Transform   | From          | What it rewrites                                    |
|-------------|---------------|------------------------------------------------------|
| `papaparse` | `papaparse`   | imports, `Papa.parse`, `Papa.unparse`, option names |

More transforms (`csvtojson`, `csv-parser`) are planned — open an issue
or PR with a code sample if you'd like one.

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
