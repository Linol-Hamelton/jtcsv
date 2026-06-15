---
title: 'Migrating from papaparse: a codemod walkthrough'
published: false
description: 'I needed half the bundle. jtcsv-codemod rewrote 47 call sites in one command. Here is how it works and what it cannot do.'
tags: javascript, typescript, opensource, csv
cover_image: ''
canonical_url: ''
---

## Why I left papaparse

I like papaparse. It works. It has been the default JSON ↔ CSV library on npm for years. But on a project where the frontend bundle budget had room for exactly one more dependency, papaparse was the line item I kept staring at.

The numbers, measured the same way on both sides:

- papaparse: `~35 KB minified`
- jtcsv `csv` subpath, tree-shaken: `~18 KB gz`

Half the bundle for the same workhorse. That is the wedge. If your bundle does not care about 17 KB, this article is not for you, and you should keep using papaparse.

A few other things pushed me over:

- TypeScript-native types in the package itself, not a separately versioned `@types/papaparse` that drifts.
- CSV injection guard on by default. papaparse will happily write `=cmd|' /c calc'!A1` into a cell. jtcsv quotes it. `preventCsvInjection: true` is the default, covering `=`, `+`, `-`, `@` per OWASP CSV Formula Injection.
- Three formats in one package — CSV, NDJSON, TSV — all first-class via subpath imports. If half my pipelines are NDJSON anyway, that matters.

Honest concession before we go further: papaparse has more downloads, is older, and is battle-tested in places jtcsv has never been deployed. jtcsv is `~5 months old`. Coverage is `~68% lines` — the orange band, an honest baseline. The total test count is `821 unit tests + 49 package tests = 870 total tests`, all green on the `3.2.3` release. I am not selling you certainty. I am selling you a smaller bundle and a typed surface.

## The codemod

There is a codemod. It is a jscodeshift transform shipped as `jtcsv-codemod` on npm.

```bash
npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'
```

Single-quoted glob on macOS and Linux so the shell does not expand it before jscodeshift sees it. On PowerShell, double-quote it instead — more on that in the gotchas section.

The transform does four things mechanically and well.

### 1. Imports

```diff
- import Papa from 'papaparse';
+ import { csvToJson, jsonToCsv } from 'jtcsv';
```

```diff
- const Papa = require('papaparse');
+ const { csvToJson, jsonToCsv } = require('jtcsv');
```

It only imports the helpers the file actually uses. If a file only calls `Papa.parse`, the new import is `{ csvToJson }`. No dead specifiers.

### 2. Call sites

```diff
- const result = Papa.parse(csv, { header: true, dynamicTyping: true });
- const rows = result.data;
+ const rows = csvToJson(csv, { hasHeaders: true, parseNumbers: true });
```

```diff
- const out = Papa.unparse(rows, { delimiter: ';' });
+ const out = jsonToCsv(rows, { delimiter: ';' });
```

The transform also collapses the `Papa.parse(...).data` access into the direct return value, because jtcsv returns the rows array directly instead of a `{ data, errors, meta }` envelope. Errors throw as typed exceptions (`ParsingError`, `ValidationError`, `SecurityError`), so the boilerplate goes away.

### 3. Option name mapping

| papaparse        | jtcsv              |
|------------------|--------------------|
| `header`         | `hasHeaders`       |
| `dynamicTyping`  | `parseNumbers`     |
| `delimiter`      | `delimiter`        |
| `newline`        | `newline`          |
| `quoteChar`      | `quoteChar`        |
| `skipEmptyLines` | `skipEmptyLines`   |

`dynamicTyping` maps to `parseNumbers` only. If you also want boolean coercion you flip `parseBooleans: true` by hand — the transform does not assume.

### 4. Confirm the real signature

The exported surface from the `jtcsv/csv` subpath is small on purpose. Straight from `src/entry-csv.ts`:

```ts
export {
  csvToJson,
  csvToJsonAsync,
  csvToJsonIterator,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter,
} from '../csv-to-json';
```

That subpath is one of `9 subpaths` the package exposes. The full root entry pulls more (NDJSON, TSV, streams, errors), and there are dedicated subpaths for `jtcsv/ndjson`, `jtcsv/tsv`, `jtcsv/streams`, and so on. Tree-shakers — esbuild, Rollup, the bundler your framework wraps — only ship what you import.

## What the codemod does NOT rewrite

This is the section I wish more codemod authors wrote up front.

The transform refuses to guess when it cannot guarantee the rewrite is correct. It strips the offending option and leaves a `// TODO(jtcsv-codemod): …` comment at the call site. Options that get the TODO treatment:

`worker`, `download`, `fastMode`, `beforeFirstChunk`, `transformHeader`, `preview`, `encoding`, `chunk`, `step`, `complete`, `error`.

The two big categories:

**Streaming with `step` callbacks.** papaparse streams via a `step: (row) => …` callback. jtcsv streams via Node streams or async iterators. The shapes do not line up cleanly enough to rewrite — your `step` body probably mutates outer state, and lifting it into a `.on('data', cb)` handler requires a judgment call about where to put error and end handling. The codemod leaves the original call and tells you to switch by hand:

```js
import { createCsvToJsonStream } from 'jtcsv';
import { createReadStream } from 'fs';

createReadStream('big.csv')
  .pipe(createCsvToJsonStream({ hasHeaders: true, parseNumbers: true }))
  .on('data', (row) => { /* per-row logic that used to live in step() */ });
```

**`download: true` for browser file save.** papaparse will pop a download for the user. jtcsv has no 1:1 — you build the Blob and trigger the anchor click yourself, because the library does not own the DOM. Three lines of code, but the codemod will not write them for you.

The philosophy: rewrite the mechanical, surface the judgment calls. Better to leave a TODO than rewrite incorrectly and have a green test suite ship a regression.

## A real migration: 47 call sites

I ran this on a real codebase. 23 files, 47 call sites, mix of `Papa.parse` and `Papa.unparse`, a few `Papa.parse(file, { step })` for CSV uploads in the browser.

```bash
npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'
```

Dry-run first, with the jscodeshift passthrough flags:

```bash
npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}' -- --dry --print
```

The output is a unified diff. I piped it into a file, skimmed it, and was satisfied with 43 of the 47 sites. The 4 holdouts were all `step`-callback uploads, exactly as the README warned. Total hand-fix time: about 25 minutes, mostly because two of them had `complete` callbacks that resolved an outer Promise, and I wanted to switch them to `for await (const row of csvToJsonIterator(text))` instead of staying on stream events.

After running for real (no `--dry`), the diff to `package.json` was:

```diff
   "dependencies": {
-    "papaparse": "^5.4.1"
+    "jtcsv": "^3.2.3"
   },
-  "devDependencies": {
-    "@types/papaparse": "^5.3.14"
-  }
```

One dep removed, one dep added, one types package gone. The bundle delta in the production build, measured with the same Vite config before and after:

```
before:  papaparse  35.1 KB min   12.4 KB gz
after:   jtcsv/csv  17.8 KB gz    (tree-shaken subpath)
```

Bundle dropped by `17 KB gz`. Test suite stayed green. Lighthouse perf score on the upload-heavy page moved by a couple points, which is noise, but the bundle delta is not noise — it is a real saving for users on slow connections.

The import path change is the smallest piece of the diff and the most load-bearing:

```ts
// before
import Papa from 'papaparse';

// after — note the subpath
import { csvToJson, jsonToCsv } from 'jtcsv/csv';
```

The codemod rewrites to bare `'jtcsv'`. I changed it to `'jtcsv/csv'` by hand on the files that did not also use NDJSON or TSV, because that is what unlocks the tree-shaken bundle size. The root `'jtcsv'` import is fine for Node scripts where bundle size does not matter — pick the entry point that matches the surface you actually use.

## What didn't go well

A few real gotchas, written down so you do not hit them blind.

**TypeScript path aliases.** If you import papaparse through a `tsconfig.json` `paths` alias (re-exported from `@/lib/csv` or similar), jscodeshift will not follow the alias on its own. The fix is to run the codemod on the source files where the aliased re-export lives first, then on the consumers. Or, less ceremoniously, do a find-and-replace on the alias before running the codemod.

**PowerShell glob quoting.** On Windows PowerShell, the single-quoted glob from the npm README does not expand the way you want. Use double quotes:

```powershell
npx jtcsv-codemod papaparse "src/**/*.{js,ts,tsx}"
```

This is a shell-quoting issue, not a codemod issue, but it cost me ten minutes of "why does it say zero files" before I noticed.

**Worker mode.** papaparse's `worker: true` runs the parse in a Web Worker. jtcsv has worker support, but the model is different: workers live behind a `useWorkers: true` opt-in on `csvToJsonAsync`, and there is a dedicated `jtcsv-workers` subpath for the browser Web Workers surface. The threshold model (when does the parse spawn a worker?) differs, so the codemod refuses to guess. If you lean on `worker: true` heavily, plan a separate migration spike for that surface.

**Custom error messages.** papaparse collects errors in `result.errors`. jtcsv throws. If your code logs `result.errors.length` and continues, you need to wrap the new `csvToJson(...)` in `try/catch` and decide what continuation looks like. The codemod will not invent your error-handling strategy.

## When to migrate, when not

Migrate when:

- Your frontend bundle budget is tight and `~18 KB gz` versus `~35 KB minified` matters.
- You want TypeScript types as a first-class concern, in the package, versioned with the package.
- You handle untrusted CSV (uploads, third-party feeds) and CSV injection by default is the safer default.
- You need NDJSON or TSV alongside CSV and would rather have one dependency than three.

Do NOT migrate when:

- Your code is mature, ships, and uses papaparse's worker mode heavily. The worker story is not 1:1 yet.
- You do not have the bandwidth to run the codemod, smoke-test the result, and triage the TODO comments.
- The wedge does not matter for your shipping shape. If your bundle is 2 MB of unrelated code, 17 KB of CSV library is rounding error and you have bigger fish to fry.

## Trust signals, briefly

I would not move a workhorse library without checking the supply chain. For jtcsv `3.2.3`:

- Sigstore-signed provenance on every release ≥ 3.0.
- SHA-pinned GitHub Actions (16 actions), Dependabot weekly, OpenSSF Scorecard nightly.
- Zero runtime deps in core.
- Beta `3.3.0-beta.0` is staged on the npm `next` dist-tag — opt-in only, not on `latest`.

None of this proves jtcsv is correct. It proves the build path is auditable, which is the prerequisite for trusting it.

## Closing

The codemod is the cheapest way to find out whether the migration is worth it. Run it with `--dry --print` on your repo, read the diff, count the TODO comments. If the TODOs are all `step` callbacks and you do not use streaming, you are about thirty minutes from a smaller bundle. If the TODOs are half your codebase, the migration is not free and you can decide accordingly.

Links:

- Manual migration guide with the full option table: `docs/MIGRATION_PAPAPARSE.md` in the jtcsv repo.
- Codemod README with the full transform surface: `packages/jtcsv-codemod/README.md`.
- npm: `jtcsv`, `jtcsv-codemod`.

Half the bundle for the same workhorse, or no migration at all. Both are fine answers. The codemod just makes "no" cheaper to arrive at.
