<p align="center">
  <img src="docs/public/logo-wordmark.svg" alt="jtcsv" width="360" />
</p>

# jtcsv — JSON ↔ CSV toolkit for Node.js and browser

[![npm version](https://img.shields.io/npm/v/jtcsv)](https://www.npmjs.com/package/jtcsv)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Zero-Deps Core](https://img.shields.io/badge/core-zero%20deps-brightgreen.svg)](https://www.npmjs.com/package/jtcsv)
[![Bundle Size](https://img.shields.io/badge/jtcsv%2Fcsv-~18%20KB%20gz-blue.svg)](#bundle-size)
[![Bench](https://img.shields.io/badge/bench-fastest%20vs%20papaparse%20%E2%80%A2%20csv--parse%20%E2%80%A2%20fast--csv-success.svg)](#performance)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Linol-Hamelton/jtcsv/badge)](https://scorecard.dev/viewer/?uri=github.com/Linol-Hamelton/jtcsv)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict%20clean-3178c6.svg)](https://github.com/Linol-Hamelton/jtcsv/blob/main/.strict-baseline.json)
[![Coverage](https://img.shields.io/badge/coverage-67%25-orange.svg)](https://github.com/Linol-Hamelton/jtcsv/blob/main/CHANGELOG.md#testing)

**JSON ↔ CSV in Node and the browser. Streaming. Tree-shakable. ~18 KB gz core. Zero runtime deps in core.**

```bash
npm install jtcsv
```

```js
import { csvToJson, jsonToCsv } from 'jtcsv';

const csv  = jsonToCsv([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
const rows = csvToJson(csv, { parseNumbers: true });
// rows: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
```

That's the whole API in 4 lines. Read on for streaming, NDJSON/TSV,
worker threads, framework adapters, and the full subpath layout.

## Why jtcsv

| | jtcsv | papaparse | csv-parse | fast-csv |
|---|:---:|:---:|:---:|:---:|
| Speed (1M rows, fastPath) | **1.00×** | 2.06× | 3.55× | 4.14× |
| Bundle (gz, parser only)  | **~18 KB** | ~9 KB     | ~14 KB    | ~30 KB    |
| TypeScript types          | ✅ first-class | DT only | ✅ | DT only |
| CSV-injection guard by default | ✅ | — | — | — |
| Web Workers (browser)     | ✅ subpath | — | — | — |
| Worker threads (Node)     | ✅ opt-in  | — | — | — |
| Streaming                 | ✅ Transform + iterator | ✅ step | ✅ Transform | ✅ Transform |
| NDJSON / TSV first-class  | ✅ | — | — | — |
| Subpath imports           | ✅ 10 entries | — | — | — |

Bundle column is gzipped parser-only (mzr methodology). The wedge claim
"half the bytes vs papaparse" is measured against papaparse minified
(~35 KB) per docs/POSITIONING.md.

Speed is given as a ratio, not milliseconds: absolute timings say more
about the machine than the parser. These are from a GitHub-hosted
`ubuntu-latest` runner, median of 5 — 1232 ms for jtcsv on the fastPath
against 2532 ms for papaparse. The ordering holds across all three
workloads the bench runs (10 K / 100 K / 1 M rows).

Reproduce it yourself: `npm run benchmark:vs`. CI re-runs it on every push
to main and on PRs touching the parser, publishes the full table with
absolute numbers to the workflow run summary, and comments on a PR when
any parser slows by more than 25 %.

## Subpath imports (tree-shaking)

Pay only for what you import. Each subpath has its own `package.json#exports`
entry point, so bundlers ship just the code you use.

| Import path           | Use case                              | Cost (gz, with deps) |
|-----------------------|---------------------------------------|---------------------:|
| `jtcsv/csv`           | CSV → JSON parse                      | **18.1 KB**          |
| `jtcsv/json`          | JSON → CSV serialize                  | 8.3 KB               |
| `jtcsv/streams`       | Node Transform stream helpers          | 11.0 KB              |
| `jtcsv/ndjson`        | NDJSON parse + emit                   | 3.9 KB               |
| `jtcsv/tsv`           | TSV parse + emit (uses CSV core)      | 35.7 KB              |
| `jtcsv/errors`        | error classes only (`instanceof` checks) | 3.7 KB            |
| `jtcsv` (full barrel) | everything                            | 50.2 KB              |
| `jtcsv/browser`       | browser-safe full bundle              | 15.3 KB ESM / 16.1 KB UMD |
| `jtcsv/plugins`       | plugin manager                        | — (Node-only)        |
| `jtcsv/schema`        | schema validator                      | — (Node-only)        |

```js
// Smallest possible import — just what you need.
import { csvToJson } from 'jtcsv/csv';
import { jsonToCsv } from 'jtcsv/json';
import { createCsvToJsonStream } from 'jtcsv/streams';
```

## Quick recipes

### Parse a file (Node)
```js
import { readCsvAsJson } from 'jtcsv/csv';
const rows = await readCsvAsJson('./data.csv', { parseNumbers: true });
```

### Stream a 1 GB file (Node)
```js
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createCsvToJsonStream } from 'jtcsv/streams';

await pipeline(
  createReadStream('./big.csv'),
  createCsvToJsonStream({ parseNumbers: true }),
  async function* (rows) {
    for await (const row of rows) yield row;  // your per-row logic
  },
);
```

### Async iterator (lazy parse)
```js
import { csvToJsonIterator } from 'jtcsv/csv';

for await (const row of csvToJsonIterator(csv, { fastPathMode: 'compact' })) {
  console.log(row);
}
```

### Worker threads (opt-in, Node)
```js
import { csvToJsonAsync } from 'jtcsv';

// Parses across N worker threads when the input is large enough
// to amortize spawn overhead (~1 MB / 5 K rows). Silent sync fallback
// otherwise. workerCount: 0 = os.availableParallelism().
const rows = await csvToJsonAsync(bigCsv, {
  parseNumbers: true,
  useWorkers: true,
  workerCount: 4,
});
```

### Browser
```html
<script src="https://cdn.jsdelivr.net/npm/jtcsv/dist/jtcsv.umd.js"></script>
<script>
  const csv = jtcsv.jsonToCsv([{ a: 1 }]);
</script>
```
or as ESM module:
```js
import { csvToJson, parseCsvFile } from 'jtcsv/browser';
```

### CLI
```bash
npx jtcsv csv-to-json data.csv --output data.json
npx jtcsv json-to-csv data.json --delimiter ";" --output out.csv
npx jtcsv csv-to-ndjson large.csv output.ndjson --stream
npx jtcsv --help
```

## Migrating to jtcsv

```bash
# Automated codemod — rewrites imports + Papa.parse / Papa.unparse calls.
npx jtcsv-codemod papaparse "src/**/*.{js,ts,tsx}"
```
See [`jtcsv-codemod`](packages/jtcsv-codemod/) and the manual
migration guides in `docs/MIGRATION_PAPAPARSE.md` and
`docs/MIGRATION_CSVTOJSON.md`.

## Framework adapters (in development — not yet on npm)

These live in this repo and are covered by tests, but **none are
published yet**, so `npm install` will not resolve them. Track progress
in [`docs/ECOSYSTEM_RENAMES.md`](docs/ECOSYSTEM_RENAMES.md).

| Planned package  | Framework                                    | Source                                          |
|------------------|----------------------------------------------|-------------------------------------------------|
| `jtcsv-express`  | Express ^4 \|\| ^5                           | [`plugins/express-middleware/`](plugins/express-middleware/) |
| `jtcsv-fastify`  | Fastify ^4 \|\| ^5                           | [`plugins/fastify-plugin/`](plugins/fastify-plugin/) |
| `jtcsv-nextjs`   | Next.js ^13 \|\| ^14 \|\| ^15                | [`plugins/nextjs-api/`](plugins/nextjs-api/)    |
| `jtcsv-hono`     | Hono ^4                                      | [`plugins/hono/`](plugins/hono/)                |
| `jtcsv-nestjs`   | NestJS ^9 \|\| ^10 \|\| ^11                  | [`plugins/nestjs/`](plugins/nestjs/)            |

The names are unscoped on purpose: the `@jtcsv` npm scope belongs to an
unrelated account, so the whole sibling ecosystem ships as `jtcsv-*`.
Only [`jtcsv-codemod`](https://www.npmjs.com/package/jtcsv-codemod) has
shipped so far.

Client-side / meta-framework recipes (Vue, Angular, Svelte, SvelteKit,
Nuxt, Remix, tRPC) live as copy-paste examples in
[`examples/frameworks/`](examples/frameworks/) — open an issue if any
deserves a published wrapper.

## Documentation

| Topic                        | Doc                                |
|------------------------------|------------------------------------|
| 5-minute getting started     | [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) |
| Decision tree (which API?)   | [docs/API_DECISION_TREE.md](docs/API_DECISION_TREE.md) |
| Canonical names + aliases    | [docs/API_CANONICALIZATION.md](docs/API_CANONICALIZATION.md) |
| Errors reference             | [docs/ERRORS.md](docs/ERRORS.md)   |
| Troubleshooting              | [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) |
| 10 practical recipes         | [docs/recipes/index.md](docs/recipes/index.md) |
| Schema validator             | [docs/SCHEMA_VALIDATOR.md](docs/SCHEMA_VALIDATOR.md) |
| Browser API + Web Workers    | [docs/BROWSER.md](docs/BROWSER.md), [docs/BROWSER_WORKERS.md](docs/BROWSER_WORKERS.md) |
| CLI usage                    | [docs/CLI.md](docs/CLI.md)         |
| Plugin system                | [docs/PLUGINS.md](docs/PLUGINS.md), [docs/PLUGIN_AUTHORING.md](docs/PLUGIN_AUTHORING.md) |
| Public benchmarks            | [docs/BENCHMARKS.md](docs/BENCHMARKS.md) |
| Migration from papaparse     | [docs/MIGRATION_PAPAPARSE.md](docs/MIGRATION_PAPAPARSE.md) |
| Framework integrations       | [docs/integrations/](docs/integrations/) |

## Status

This is a young package (created January 2026) actively pushing toward
v4.0. Public roadmap is tracked in
[`JTCSV_perfection_checklist.md`](JTCSV_perfection_checklist.md). Real
adoption metrics live on the npm and Scorecard badges above — no
aspirational numbers are quoted in this README.

## Development

```bash
npm install
npm test                       # full suite
npm run benchmark:vs:quick     # head-to-head bench (10 K only)
npm run size                   # bundle-size gate
npm run tsc:check              # typecheck (non-strict)
npm run tsc:check-strict:count # strict ratchet (regression gate)
npm run build                  # rollup + tsc declarations
```

Releases are managed via [changesets](https://github.com/changesets/changesets):

```bash
npx changeset            # record an intent
git push                 # → CI opens "Version Packages" PR
                         #   → merge → CI publishes with --provenance
```

Linux validation (Docker):
```bash
docker run --rm -v /path/to/jtcsv:/work -w /work node:20 bash -lc "npm ci && npm test"
```

## License

MIT. See [`LICENSE`](LICENSE).
