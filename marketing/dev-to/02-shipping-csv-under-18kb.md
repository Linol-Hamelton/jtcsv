---
title: 'Shipping CSV parsing in ~18 KB gz: subpath imports done right'
published: false
description: 'Bundle ~18 KB gz for the CSV-only entry, while three formats (CSV/NDJSON/TSV) ship in the same package. Here is the architecture.'
tags: javascript, typescript, opensource, performance
cover_image: ''
canonical_url: ''
---

## The bundle reality

Most JS CSV libraries ship as one bundle. Import once, pay for everything. That tradeoff is the default, and it is the reason your client-side CSV import flow drags in 30+ KB of code even when you only call one function.

The numbers, gathered from the publicly-shipped artifacts on npm:

- papaparse: `~35 KB minified` for the published browser build. It is the workhorse most people reach for, and the methodology its README quotes is minified-only, not gzipped.
- fast-csv: `~30 KB gz` once you bundle in the formatter and the parser together, which is what most consumers do.
- csv-parse: `~14 KB gz`, but Node-only — no browser entry, no Web Worker story.

jtcsv ships 9 subpaths in a single package: `jtcsv/csv`, `jtcsv/json`, `jtcsv/streams`, `jtcsv/ndjson`, `jtcsv/tsv`, `jtcsv/errors`, `jtcsv/browser`, `jtcsv/plugins`, `jtcsv/schema`. Import `jtcsv/csv` and tree-shaking gives you `~18 KB gz`. The other 26+ KB stays out of your bundle until you explicitly import the subpath that contains it.

That is the wedge: `~18 KB gz` tree-shakable subpath imports vs papaparse `~35 KB minified` — half the bundle for the same workhorse, JSON ↔ CSV in both directions, and the same package gives you NDJSON and TSV the day you need them.

This post is about how that number lands. Not "we made it smaller" — the architecture decisions that force the bundler to do the right thing.

## Why subpaths matter

ESM tree-shaking has a well-documented blind spot: if the entry module has any module-level code that could be considered a side effect (initializing a Map, calling a function, even a literal that the bundler cannot prove pure), the bundler conservatively keeps the entire transitive closure of that file. Adding `"sideEffects": false` to package.json helps — it is a permission slip the bundler can lean on — but it is not a guarantee. Plenty of real-world bundles fail to shake a barrel cleanly even with the flag set, because the static analysis runs out of confidence on the first non-trivial pattern it sees.

Subpaths sidestep the problem by giving the bundler an explicit, file-level boundary. When you `import { csvToJson } from 'jtcsv/csv'`, the bundler resolves to `dist/csv.esm.js`. That file imports only what `csvToJson` needs. The streaming module, the NDJSON parser, the schema layer — none of those files are even visited by the bundler. There is nothing to shake because the dead code never enters the graph.

Here is the relevant slice of jtcsv's package.json:

```json
{
  "exports": {
    ".":         { "import": "./dist/index.esm.js"   },
    "./csv":     { "import": "./dist/csv.esm.js"     },
    "./json":    { "import": "./dist/json.esm.js"    },
    "./streams": { "import": "./dist/streams.esm.js" },
    "./ndjson":  { "import": "./dist/ndjson.esm.js"  },
    "./tsv":     { "import": "./dist/tsv.esm.js"     },
    "./errors":  { "import": "./dist/errors.esm.js"  },
    "./browser": { "import": "./dist/jtcsv.esm.js"   },
    "./plugins": { "import": "./dist/plugins.esm.js" },
    "./schema":  { "import": "./dist/schema.esm.js"  }
  }
}
```

Nine subpaths, each pointing at its own rolled-up file. The full `import` map in the source includes `require`/`types`/`browser` conditions, but the shape is the same. The bundler is told, in the package manifest, exactly where to go.

The corollary: `import jtcsv from 'jtcsv'` (the root) is still available, and still ships the full barrel. We did not break that path. It is documented as the "show me everything" entry — convenient for scripts, REPL exploration, and quick prototyping. It is not the entry you ship to production.

## The /csv subpath specifically

The full surface of `jtcsv/csv` is six functions and seven error classes:

```ts
// src/entry-csv.ts
export {
  csvToJson,
  csvToJsonAsync,
  csvToJsonIterator,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter,
} from '../csv-to-json';

export {
  JtcsvError,
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
} from '../errors';
```

That is it. The CSV parser, an async variant, an async iterator for streaming-via-pull, two file-loading helpers (one async, one sync), and a delimiter sniffer. The seven error classes are re-exported as a convenience so callers do not have to also import from `jtcsv/errors`.

How that fits in `~18 KB gz`:

- No JSON serializer in this subpath. `jsonToCsv` lives in `jtcsv/json`. If you only parse CSV — and many import flows only parse CSV — you pay zero bytes for the writer.
- No stream helpers. The Node Transform stream wrapper and the Web Streams adapter both live in `jtcsv/streams`. The async iterator variant is here because it is a tiny wrapper over the same parser core; it does not pull in `stream.Transform`.
- No NDJSON or TSV decoders. Those formats reuse the same fast-path engine, but they live behind their own subpaths.
- The CSV injection guard (`preventCsvInjection: true` by default — `=`, `+`, `-`, `@` per OWASP CSV Formula Injection) is in the writer, not the parser, so it does not weigh on `jtcsv/csv`.

Shared chunks do the rest of the work. Rollup's `output.manualChunks` pulls common utilities — the fast-path engine, BOM stripping, UTF-8 normalization — into `dist/_shared/` files. Every subpath that needs them references the same chunk. That utility code is counted once per consumer bundle even if you import three subpaths.

## What we deliberately left out

The honest version: there are features that could have lived in the core. We pushed them out on purpose.

- Zod-style schema validation lives in `jtcsv/schema`. The validation layer is real and ships with the package, but it is opt-in. The CSV-only subpath does not load it.
- Plugin host lives in `jtcsv/plugins`. Node-only — the browser bundle never sees it because the conditional export resolves a different file for `browser` consumers.
- Excel/.xlsx support lives in a separate npm package, `jtcsv-excel` (2.1.0, staged on the `next` dist-tag). It has a peer dependency on `exceljs`. Bundling that into the core would have added more than the entire CSV subpath weighs.
- React and Vue adapters live in `jtcsv-react` (0.1.0) and `jtcsv-vue` (0.1.0), both staged on `next`. Forcing every consumer of `jtcsv/csv` to satisfy a React peer dep would be hostile.

The decision rule, written down in docs/POSITIONING.md: anything that requires a peer dependency over 10 KB ships as a separate package, not a subpath. Anything that adds optional surface to the core ships as a subpath. The core itself stays zero-runtime-deps.

`jtcsv-codemod` (0.2.0, also staged on `next`) is the migration path for consumers leaving papaparse or csvtojson. Run `npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'` and it rewrites imports and call sites in place. The codemod is a separate binary because it has no business being in a runtime bundle.

## Measuring it

The number on the README is not a guess. It is the output of `scripts/check-bundle-size.js`, which runs as part of `prepublishOnly` — the build refuses to publish if any subpath exceeds its budget.

The methodology, written down so nobody has to re-derive it:

1. Build each subpath via rollup, including its real shared chunks (we do not measure the entry file in isolation — that would lie).
2. Concatenate the entry plus its transitive shared chunks.
3. Gzip the result with default zlib settings (level 6).
4. Compare against the budget in `size-limit` config in package.json.
5. PR-level regression: if any subpath grows by more than 25% versus the main branch, CI fails. Small regressions are allowed (a bugfix sometimes costs a byte), but a quietly-doubling bundle is caught.

The `~18 KB gz` figure is esbuild-minified-then-gzipped. That is the number a consumer actually pays. It is **not** the "minified-only" number, which is the methodology papaparse's README quotes — that is the `~35 KB minified` figure. Comparing minified-to-minified would have us at roughly `~22 KB minified`. We quote gzip because that is what the network transmits. The comparison stays apples-to-apples by carrying the methodology label every time we cite the number.

## Zero runtime deps in core

The other half of the budget: every byte you import from `jtcsv` is jtcsv's own code. There are no transitive dependencies to audit, no transitive dependencies to lock-file-snipe, no surprise updates that ship a different parser into your build overnight.

Provenance is on by default for releases at version 3.0 or later. The publish command is `npm publish --provenance`, the Sigstore transparency log records the GitHub Actions workflow that produced the tarball, and a consumer can verify it locally:

```bash
npm audit signatures jtcsv
```

The supply-chain story does not stop there. The 16 GitHub Actions workflows are SHA-pinned (not tag-pinned — tags can be moved). Dependabot runs weekly. The OpenSSF Scorecard runs nightly and publishes the score on the repo. The `~5 months old` project has built the security posture in from the first publish, not bolted on after.

One footnote on dependencies: there is one entry in `optionalDependencies` — `glob`, used by the CLI for stdin glob expansion. No subpath pulls it. The library API has no `require('glob')` anywhere. If you install with `--omit=optional`, the CLI still works on direct paths; the glob expansion just becomes a no-op.

## What this costs

Honest tradeoffs, because every architecture decision has a price.

- Nine subpaths means nine places consumers can resolve the same code via different specifiers. `import { csvToJson } from 'jtcsv'` works, `import { csvToJson } from 'jtcsv/csv'` works, and they resolve to different files. We documented one canonical entry per use case in docs/API_DECISION_TREE.md. The root is for scripts. The subpaths are for production.
- Tree-shaking only works if the consumer's bundler respects the `exports` field. Webpack 5, Rollup, esbuild, Vite, Parcel 2 all do. Webpack ≤ 4 falls back to the `main` field — those consumers pay for the full barrel. We support them because they exist; we do not optimize for them.
- Maintenance overhead. Every new public API has to be assigned to the right subpath at design time, not silently dropped into the root barrel. The cost is paid in pull-request review: the PR template asks which subpath the new export belongs to, and a missing answer blocks merge.
- Testing surface. We run `870 tests` total (`821 unit tests + 49 package tests`), and a chunk of those exist specifically to assert that the subpath boundaries hold. Coverage is `~68% lines` — orange band, the honest baseline. Coverage is going up in the `3.3.0-beta.0` line that is staged on the `next` dist-tag, but it is not at 90% and we are not going to claim it is.

## Closing

The wedge sentence again, because it is the one number that matters: `~18 KB gz` tree-shakable subpath imports vs papaparse `~35 KB minified` — half the bundle for the same workhorse.

The repo:

- `src/entry-csv.ts` — the actual subpath entry, twenty lines of re-exports.
- `docs/api/csv.md` — the reference for the `jtcsv/csv` surface.
- `docs/POSITIONING.md` — the wedge written down, including the decision rule for what lives in the core vs a separate package.
- `scripts/check-bundle-size.js` — the gate that keeps the number honest.

`jtcsv` 3.2.3 is stable on the latest dist-tag. `3.3.0-beta.0` is staged on `next`. Three formats — CSV, NDJSON, TSV — first-class, in one package, behind nine subpaths. Worker threads opt-in via `useWorkers` on Node, Web Workers via the `jtcsv-workers` subpath in the browser. CSV injection guard on by default. Zero runtime deps in the core.

Bundle budget is a feature. It is the only feature you cannot ship later.
