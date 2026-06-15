# Reddit post — r/node

## Title
jtcsv: streaming JSON ↔ CSV/NDJSON/TSV in one zero-deps package

## Body
Built for server-side CSV ingestion: jtcsv handles JSON ↔ CSV plus NDJSON and TSV as first-class formats, all reachable via `9 subpaths`. Zero runtime deps in core. Current stable is 3.2.3 on npm; 3.3.0-beta.0 is staged on the `next` dist-tag.

The Node path is built around backpressure-aware streams, with an optional worker-thread offload for CPU-bound parses.

A 6-line streaming example, file → JSON objects:

```js
import { createCsvFileToJsonStream } from 'jtcsv/streams';

createCsvFileToJsonStream('./orders.csv', { useWorkers: true })
  .on('data', (row) => insertIntoQueue(row))
  .on('end', () => console.log('done'))
  .on('error', (err) => console.error(err));
```

`useWorkers: true` opts into the worker_threads pool — off by default so single-file callers don't pay the worker spin-up cost. The CSV injection guard (`preventCsvInjection: true`) is ON by default and covers `=`, `+`, `-`, `@` per OWASP CSV Formula Injection, which matters when you're emitting CSV that downstream users open in Excel.

Migrating from csvtojson: the codemod rewrites imports and the common call shapes.

```
npx jtcsv-codemod csvtojson 'src/**/*.{js,ts}'
```

Supply-chain posture, since it comes up on every Node thread:
- Sigstore-signed provenance on every release ≥ 3.0 — verify with `npm audit signatures` against the `provenance` field.
- 16 GitHub Actions, all SHA-pinned (not `@v3`).
- Dependabot weekly, OpenSSF Scorecard nightly.
- `821 unit tests + 49 package tests = 870 total`, ~68% lines covered. That's the honest baseline; coverage growth is tracked in CHANGELOG.

What jtcsv is NOT: it's not a database loader, not a schema validator, and not a Papa Parse rewrite for Node — if you want runtime schemas, pair it with Zod at the boundary. The package focuses on the parse/serialize step and gets out of the way.

Three links, not seven:
- Repo: https://github.com/jtcsv/jtcsv
- npm: https://www.npmjs.com/package/jtcsv
- Streaming + worker-threads doc: docs/STREAMS.md

The ask: anyone running CSV ingestion at scale — would worker threads via `useWorkers: true` actually help your pipeline, or is your bottleneck somewhere else (network, DB writes, schema validation)? I want to know whether to invest more in the worker-pool tuning or in the DB-adapter sister packages. If you've profiled a real ingest job, I'd love to see where parsing actually sits on the flame graph.

## Posting notes
- Post Wed-Thu, 8-10am US Eastern — r/node skews east-coast backend devs, mid-morning weekday gets the best discussion.
- Flair: "Library".
- No image attachment; r/node treats screenshots in the OP as low-effort. If you want a flame-graph, save it for a follow-up comment when someone asks for profiling data.
- Mention Sigstore + SHA-pinned actions early — supply chain is the recurring r/node hot button and signals you've done the homework.
- Watch for "why not csvtojson / fast-csv / Papa" comments — have the bundle/perf/provenance comparison ready in a saved reply, don't ad-lib the numbers.
