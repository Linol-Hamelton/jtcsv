# jtcsv - JSON <-> CSV toolkit for Node.js and browser

[![npm version](https://img.shields.io/npm/v/jtcsv)](https://www.npmjs.com/package/jtcsv)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Zero-Deps Core](https://img.shields.io/badge/core-zero%20deps-brightgreen.svg)](https://www.npmjs.com/package/jtcsv)

Fast JSON <-> CSV conversion with streaming helpers, NDJSON/TSV support, and optional integrations.

## Features
- JSON <-> CSV conversion with security defaults
- Streaming helpers and async iterator API
- NDJSON and TSV helpers
- Browser bundle with Web Worker helpers
- Optional plugin system and framework adapters
- CLI and optional TUI

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

### Async iterator
```javascript
const { csvToJsonIterator } = require('jtcsv');

const csv = 'id,name\n1,Jane\n2,John';
for await (const row of csvToJsonIterator(csv, { fastPathMode: 'compact' })) {
  console.log(row);
}
```

## Browser usage
- Bundler: `import { csvToJson, jsonToCsv } from 'jtcsv/browser';`
- CDN UMD: `https://cdn.jsdelivr.net/npm/jtcsv/dist/jtcsv.umd.js`
- CDN ESM: `https://cdn.jsdelivr.net/npm/jtcsv/dist/jtcsv.esm.js`

See `README-browser.md` for full browser API and worker helpers.

## CLI
```bash
npx jtcsv csv-to-json input.csv output.json
npx jtcsv json-to-csv input.json output.csv
npx jtcsv stream csv-to-json big.csv output.json
npx jtcsv batch json-to-csv "data/*.json" output/

# optional TUI
npx jtcsv tui
```

See `CLI.md` for full command list and options.

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

See `README-PLUGINS.md` and `plugins/README.md` for integrations.

## Development
Run from the repo root:
```bash
npm test
npm run test:coverage
npm run build
```

## License
MIT. See `LICENSE`.
