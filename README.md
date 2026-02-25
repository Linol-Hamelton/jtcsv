# jtcsv - JSON <-> CSV toolkit for Node.js and browser
Current version: 3.1.0


[![npm version](https://img.shields.io/npm/v/jtcsv)](https://www.npmjs.com/package/jtcsv)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Zero-Deps Core](https://img.shields.io/badge/core-zero%20deps-brightgreen.svg)](https://www.npmjs.com/package/jtcsv)

Fast JSON <-> CSV conversion with streaming helpers, NDJSON/TSV support, and optional integrations.

**Try Live:** `playground.html` (local) - `npm run demo:web`
[TRY LIVE](playground.html)

## Features
- JSON <-> CSV conversion with security defaults
- Streaming helpers and async iterator API
- NDJSON and TSV helpers
- Browser bundle with Web Worker helpers
- Optional plugin system and framework adapters
- CLI and optional TUI
- Performance-optimized - fast number parsing, single-pass BOM stripping, efficient delimiter detection

## Documentation
- docs/README.md (docs hub)
- docs/GETTING_STARTED.md (5-minute quick start)
- docs/API_DECISION_TREE.md (pick the right API)
- docs/API_CANONICALIZATION.md (canonical names and aliases)
- docs/ERRORS.md (error reference)
- docs/TROUBLESHOOTING.md (common errors and fixes)
- docs/recipes/index.md (practical recipes)
- docs/SCHEMA_VALIDATOR.md (schema format)
- docs/BROWSER.md (browser API)
- docs/CLI.md (CLI usage)
- docs/PLUGINS.md (plugin system)
- docs/PLUGIN_AUTHORING.md (plugin authoring guide)
- docs/BENCHMARKS.md (public benchmarks)
- docs/PLUGIN_REGISTRY.md (community plugins)
- docs/integrations/index.md (framework integrations)

## Playground
- Local HTML playground: `playground.html` (open in a browser)
- Vite demo: `npm run demo:web` (runs on http://localhost:3000)

<iframe
  src="https://stackblitz.com/github/Linol-Hamelton/jtcsv?embed=1&file=playground.html&view=preview"
  width="100%"
  height="520"
  style="border:0;border-radius:12px;overflow:hidden;"
  title="JTCSV Playground (StackBlitz)"
></iframe>


## Integrations
- docs/integrations/index.md (overview)
- docs/integrations/express.md (Express upload API)
- docs/integrations/fastify.md (Fastify upload API)
- docs/integrations/react-hook-form.md (React Hook Form uploader)
- docs/integrations/nextjs-app-router.md (Next.js App Router upload)
- docs/integrations/drizzle-orm.md (Drizzle ORM import)
- docs/integrations/graphql.md (GraphQL upload)

## Entry points
- `jtcsv` (main)
- `jtcsv/browser` (browser build)
- `jtcsv/plugins` (plugin manager)
- `jtcsv/cli` (CLI runner)
- `jtcsv/schema` (schema validator helpers)

## Installation
```bash
npm install jtcsv
```

### Optional add-ons
```bash
npm install @jtcsv/tui
npm install @jtcsv/excel exceljs
npm install @jtcsv/validator
```

## Quick start (Node.js)
```javascript
const { jsonToCsv, csvToJson } = require('jtcsv');

const data = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

const csv = jsonToCsv(data, { delimiter: ',', includeHeaders: true });
const json = csvToJson(csv, { delimiter: ',', parseNumbers: true });

console.log(csv);
console.log(json);
```

### Naming aliases (CSV -> JSON)
- `csvToJsonFile` / `csvToJsonFileSync` -> aliases of `readCsvAsJson` / `readCsvAsJsonSync`
- `csvToJsonStream` / `csvFileToJsonStream` -> aliases of `createCsvToJsonStream` / `createCsvFileToJsonStream`

### Async iterator
```javascript
const { csvToJsonIterator } = require('jtcsv');

const csv = 'id,name\n1,Jane\n2,John';

for await (const row of csvToJsonIterator(csv, { fastPathMode: 'compact' })) {
  console.log(row);
}
```

### Command Line Interface

JTCSV includes a powerful CLI for batch conversion, file processing, and data transformation.

```bash
# Convert CSV file to JSON
npx jtcsv csv-to-json data.csv --output data.json

# Convert JSON to CSV with custom delimiter
npx jtcsv json-to-csv data.json --delimiter ";" --output out.csv

# Stream processing with NDJSON
npx jtcsv csv-to-ndjson large.csv output.ndjson --stream

# See all options
npx jtcsv --help
```

Full documentation: `docs/CLI.md`

## Browser usage
- Bundler: `import { csvToJson, jsonToCsv } from 'jtcsv/browser';`
- CDN UMD: `https://cdn.jsdelivr.net/npm/jtcsv/dist/jtcsv.umd.js`
- CDN ESM: `https://cdn.jsdelivr.net/npm/jtcsv/dist/jtcsv.esm.js`

See `docs/BROWSER.md` for full browser API and worker helpers.

## CLI
```bash
npx jtcsv csv-to-json input.csv output.json
npx jtcsv json-to-csv input.json output.csv
npx jtcsv stream csv-to-json big.csv output.json
npx jtcsv batch json-to-csv "data/*.json" output/

# optional TUI
npx jtcsv tui
```

See `docs/CLI.md` for full command list and options.

## Demos
Run these from the repo root:
```bash
# Express API demo
npm run demo

# Web demo (Vite dev server on http://localhost:3000)
npm run demo:web

# Preview built demo
npm run demo:serve
```

From inside `demo/` use:
```bash
npm run dev
npm run preview
npm run serve
```

## Plugin system
The plugin-enabled API is exported from `jtcsv/plugins`.

```javascript
const { create } = require('jtcsv/plugins');

const jtcsv = create();
jtcsv.use('my-plugin', { name: 'My Plugin', version: '1.0.0' });
```

See `docs/PLUGINS.md` and `plugins/README.md` for integrations.

## Development
Run from the repo root:
```bash
npm test
npm run test:coverage
npm run test:coverage:entry
npm run test:coverage:ts
npm run test:types
npm run tsc:types
npm run build
```

Linux validation (Docker):
```bash
docker run --rm -v /path/to/jtcsv:/work -w /work node:20 bash -lc "npm ci && npm test"
```

## License
MIT. See `LICENSE`.
