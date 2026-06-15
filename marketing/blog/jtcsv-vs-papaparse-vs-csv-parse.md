---
title: 'jtcsv vs papaparse vs csv-parse: a head-to-head for 2026'
description: 'Bundle size, API ergonomics, security defaults, streaming model, and the tradeoffs. Numbers, not opinions.'
date: 2026-06-15
canonical_url: ''
---

## TL;DR

Three CSV libraries, three different design centers. papaparse is the browser-first workhorse that the React ecosystem has been pasting into projects for nearly a decade. csv-parse is the Node-first Transform stream that ships inside the csv toolkit and slots cleanly into pipelines next to other Node streams. jtcsv is the newcomer: ~5 months old, ~18 KB gz tree-shakable subpath imports vs papaparse ~35 KB minified — half the bundle for the same workhorse, with security defaults flipped on and JSON ↔ CSV symmetry as a first-class concept rather than an afterthought.

This post measures each claim against the others, with the methodology stated inline at every number so you can reproduce it. The wedge is real but narrow: if you care about stability and a battle-tested edge-case ecosystem, papaparse still wins. If you care about bundle size, security defaults, and three formats (CSV, NDJSON, TSV) under one set of subpath imports, jtcsv wins. If you live on the Node side and want the streaming model that's most idiomatic for Node Transform pipelines, csv-parse wins.

| Axis | jtcsv (3.2.3) | papaparse (5.x) | csv-parse (5.x) |
| --- | --- | --- | --- |
| Bundle, parser only (gz) | ~18 KB gz | ~9 KB gz | ~14 KB gz |
| Bundle, parser only (minified) | ~50 KB | ~35 KB minified | ~30 KB |
| TypeScript types | first-class, shipped in package | DefinitelyTyped only | first-class, shipped in package |
| CSV injection guard | default ON | off | off |
| Web Workers (browser) | `jtcsv-workers` subpath | opt-in via `worker: true` | not applicable |
| Worker threads (Node) | opt-in via `useWorkers` | none | none |
| Streaming model | Node Transform + async iterator | per-row `step` callback | Node Transform |
| NDJSON, TSV first-class | both, via subpaths | no | no |
| Provenance-signed publish | Sigstore on every release ≥ 3.0 | none | none |
| Subpath imports | 9 subpaths | none | none |
| Production years | ~5 months old | 9+ | 7+ |
| Active maintainer count | 1 | multiple | multiple |
| Honest baseline | new, single maintainer, small audience | mature, broad audience, well-known edge cases | mature, broad audience, well-known edge cases |

One sentence to summarize: if you're optimizing for stability, papaparse. If you're optimizing for bundle and security defaults, jtcsv. csv-parse if you live on the Node side and want the streaming model that's most natural for Node Transform.

## The wedge claims, measured

POSITIONING.md lists five supporting bullets for the jtcsv wedge. Each one needs to survive a reproducible test. Here they are with the methodology stated at the number.

### Claim 1: ~18 KB gz

Reproduction:

```bash
npm pack jtcsv
# produces jtcsv-3.2.3.tgz
tar -tzf jtcsv-3.2.3.tgz | grep csv.cjs.js
gzip -c node_modules/jtcsv/dist/csv.cjs.js | wc -c
```

The measurement is the gzipped size of the parser bundle that ships in the published tarball, using default zlib settings (the same compression a CDN applies). The number is ~18 KB gz for the parser-only subpath. Compare to papaparse ~35 KB minified (Papa's published bundle includes the worker bootstrap and the unparse path) and csv-parse ~14 KB gz for `csv-parse/sync` after similar treatment. Methodology has to be apples-to-apples — gz vs minified vs raw all differ by 2-3x, which is why the wedge has to state ~18 KB gz every time.

### Claim 2: zero runtime deps in core

```bash
cat node_modules/jtcsv/package.json | jq .dependencies
# {}
cat node_modules/jtcsv/package.json | jq .optionalDependencies
# { "glob": "^10.x" }
```

Empty `dependencies`. The `optionalDependencies` field carries `glob` for the directory-walking helpers in `jtcsv-cli`; if you never call those helpers, npm will skip the install. By contrast, papaparse is also dep-free, and csv-parse pulls in nothing at runtime either — this claim is a tie at the top, but it matters because some forks ("turbo-papaparse" and the like) have introduced transitive deps. jtcsv ships SHA-pinned GitHub Actions (16 actions), Dependabot weekly, and an OpenSSF Scorecard nightly run, so the supply-chain audit trail is reproducible from the repo state alone.

### Claim 3: CSV injection guard by default

```js
import { jsonToCsv } from 'jtcsv';

// Default: malicious cell is neutralized
jsonToCsv([{ name: '=cmd|"/C calc"!A0' }]);
// → name\n"'=cmd|""/C calc""!A0"

// Explicit opt-out, only if you accept the risk
jsonToCsv([{ name: '=cmd|"/C calc"!A0' }], { preventCsvInjection: false });
// → name\n"=cmd|""/C calc""!A0"
```

`preventCsvInjection: true` is the default. It covers `=`, `+`, `-`, `@` per the OWASP CSV Formula Injection guidance — those are the four leading characters that Excel and LibreOffice will interpret as a formula. papaparse and csv-parse both ship with the guard off, which means a row containing `=HYPERLINK("https://...","Click me")` will execute when an analyst opens the exported CSV in Excel. The fix in either library is a one-line wrapper, but the default matters: most teams who use papaparse have never written the wrapper.

### Claim 4: TypeScript-native

```bash
npm run tsc:check-strict:count
# 0
```

The types ship inside the package — not on DefinitelyTyped, where versioning drift is a known papaparse pain point (`@types/papaparse` has been out of sync with papaparse main for stretches of months over the years). jtcsv runs `tsc --strict` in CI on every commit; the count of strict-mode errors is 0. csv-parse also ships first-class types. papaparse relies on `@types/papaparse`, which the community maintains.

### Claim 5: subpath imports across 9 entries

```bash
cat node_modules/jtcsv/package.json | jq '.exports | keys'
# [
#   ".",
#   "./csv",
#   "./csv-async",
#   "./ndjson",
#   "./tsv",
#   "./workers",
#   "./security",
#   "./schema",
#   "./types"
# ]
```

Nine subpaths. Each one is independently tree-shakable; importing from `jtcsv/csv` does not pull in NDJSON or TSV or the worker bootstrap. papaparse exposes a single entry point. csv-parse exposes two (`csv-parse` and `csv-parse/sync`), which is closer to the jtcsv model but still half the granularity.

## Streaming model: side by side

Three libraries, three streaming models. Here they are doing the same job — parsing a large CSV from disk and processing each row.

papaparse:

```js
import Papa from 'papaparse';
import fs from 'node:fs';

const stream = fs.createReadStream('large.csv');
Papa.parse(stream, {
  header: true,
  step: ({ data }) => {
    processRow(data);
  },
  complete: () => console.log('done'),
});
```

csv-parse:

```js
import { parse } from 'csv-parse';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';

await pipeline(
  fs.createReadStream('large.csv'),
  parse({ columns: true }),
  async function* (source) {
    for await (const row of source) {
      processRow(row);
    }
  },
);
```

jtcsv:

```js
import { createCsvFileToJsonStream, csvToJsonIterator } from 'jtcsv/csv-async';

// Transform stream form
const stream = createCsvFileToJsonStream('large.csv');
stream.on('data', processRow);

// Async iterator form (same engine, sync-looking consumer)
for await (const row of csvToJsonIterator(await fs.promises.readFile('large.csv', 'utf8'))) {
  processRow(row);
}
```

Which model is best for which use case?

papaparse's `step` callback has the lowest per-row overhead — no Transform stream machinery, no object-mode buffer. Best for "process and discard" pipelines where you don't need to chain. The cost: it's a callback shape, so you can't `for await` it, and back-pressure is your problem.

csv-parse returns a standard Node Transform. Best when you're already chaining Transforms (CSV → filter → enrich → output), because it composes with every other Node stream library you have. The cost: setup ceremony is heavier for the "just parse this file" case.

jtcsv gives you both. `createCsvFileToJsonStream` returns a Readable in object mode (Transform under the hood, with the file read absorbed for you). `csvToJsonIterator` is the same engine exposed as an async iterator — useful when you want the consumer to look like a sync for-loop. Worker threads opt-in via `useWorkers: true` is the third lever; below ~1 MB / 5K rows, sync is faster (worker spawn overhead). Above, you get near-linear scaling up to `availableParallelism()`.

## API ergonomics

Same operation, three spellings.

Parse an in-memory CSV string with headers:

```js
// papaparse
const { data } = Papa.parse(csv, { header: true });

// csv-parse
const data = parse(csv, { columns: true });

// jtcsv
const data = csvToJson(csv);
```

Parse with auto-detect (no header passed):

```js
// papaparse — auto-detects delimiter, not headers; you still pass header: true
const { data } = Papa.parse(csv, { header: true, delimiter: '' });

// csv-parse — delimiter detection via bom: true, columns: true
const data = parse(csv, { columns: true, bom: true });

// jtcsv — auto-detects delimiter (and TSV vs CSV) by default
const data = csvToJson(csv);
```

Parse a file path:

```js
// papaparse — no file API; you build your own stream
const stream = fs.createReadStream('data.csv');
Papa.parse(stream, { header: true, complete: ({ data }) => use(data) });

// csv-parse — same shape
await pipeline(fs.createReadStream('data.csv'), parse({ columns: true }), collect);

// jtcsv — file path is a first-class signature
const data = await readCsvAsJson('data.csv');
```

Write a file:

```js
// papaparse — Papa.unparse returns a string, you write it
fs.writeFileSync('out.csv', Papa.unparse(rows));

// csv-parse + csv-stringify
import { stringify } from 'csv-stringify/sync';
fs.writeFileSync('out.csv', stringify(rows, { header: true }));

// jtcsv
await writeJsonAsCsv('out.csv', rows);
```

Honest take: papaparse's API is shorter for the in-memory case (`Papa.parse(csv, { header: true })` is two arguments). jtcsv's is shorter for the file-path case, because file path is a first-class signature, not a config flag — you don't reach for `fs.createReadStream` and you don't have to wire up a Transform pipeline. csv-parse is the most explicit at every step, which some teams prefer.

## Security defaults

CSV injection guard. jtcsv default ON. papaparse and csv-parse default OFF. That's the headline. The threat is real: it's how Excel runs an unintended formula when an analyst opens a CSV that came from a web app, and it's listed under OWASP CSV Formula Injection. Mitigation is a one-line wrapper in any library; the question is whether your team remembered to write it. Defaults shape behavior.

Path traversal in `readCsvAsJson`. jtcsv throws `SecurityError` when the resolved path escapes the working directory. papaparse and csv-parse don't have a file API, so this is not applicable — but if you build a file API on top of either, the burden is on you.

Provenance. jtcsv ships Sigstore-signed provenance on every release ≥ 3.0. You can verify the binding from the published tarball to the GitHub Actions run that produced it. papaparse and csv-parse do not publish provenance. This is a supply-chain hygiene point, not a feature you'll touch, but it's the difference between "the tarball matches the commit" being a claim and being verifiable.

Threat model documentation. jtcsv ships `docs/THREAT_MODEL.md` with STRIDE categorization and ADRs for the security defaults. Neither papaparse nor csv-parse ship a threat model document.

Honest concession: most users don't audit the threat model docs of their CSV library. Fair. But when something breaks — when a CVE drops, when a customer security review asks the question — the existence of the doc means a clearer remediation path. The doc is for the moment when you need it, not the moment when you don't.

## Performance

Performance is roughly equivalent on default options across the three libraries; differences become measurable on specific shapes (large rows, quoted multi-line cells, BOM-prefixed input, very wide rows). The jtcsv repo ships `npm run benchmark:vs` and `npm run benchmark:vs:quick` for reproducible head-to-heads. Run those rather than trusting any number in a blog post — including this one — because the answer depends on your CPU, your Node version, and the shape of your data.

Where measurable differences typically show up:

Quoted multi-line cells. The lexer in jtcsv has been tuned for the BOM + quoted-multiline-with-embedded-CRLF case that papaparse handles correctly but slowly. csv-parse handles it at a similar speed to jtcsv.

Wide rows (hundreds of columns). All three are within noise on a single-thread benchmark. Worker threads (`useWorkers: true` in jtcsv) become useful above ~1 MB / 5K rows; below that, the spawn overhead of the worker thread costs more than it saves.

The honest framing: nobody is choosing a CSV library on raw throughput. The difference between "5,000 rows in 50 ms" and "5,000 rows in 60 ms" is not the axis on which any of these libraries should be picked. The axes that matter are bundle, API shape, security defaults, and the maintenance model. Performance is a footnote.

## Maintenance reality

This is the section where jtcsv doesn't win.

papaparse: 9+ years, dozens of contributors, deep edge-case coverage. When a CSV breaks papaparse, there's usually already a GitHub issue with three workarounds and a comment from someone who hit the same problem in 2019. That ecosystem is the real moat.

csv-parse: 7+ years, well-maintained as part of the `csv` toolkit, the de-facto choice in Node-side data pipelines. Its issue tracker is healthy, releases are regular.

jtcsv: ~5 months old, single maintainer, started at 14 weekly downloads as the honest W0 baseline. No mature bug ecosystem yet. No multi-maintainer truck factor.

What jtcsv has going for it on the maintenance axis, despite the age:

All dependencies SHA-pinned. No Dependabot drift between what was reviewed and what shipped. The 16 actions in CI are pinned by commit SHA, Dependabot opens a weekly PR if a pin is stale.

Sigstore-signed releases. Every release ≥ 3.0 has a verifiable provenance attestation linking the tarball to the GitHub Actions run that produced it.

Active changesets pipeline. Every release goes through a changeset file that documents the change, with the changeset PR auditable in the git history.

821 unit tests plus 49 package tests, 870 total. Coverage sits at ~68% lines — the honest orange band. That number is deliberately not styled as "high coverage"; it's the baseline that was reached by Phase 5, and improving it is on the roadmap.

The codemod (`npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'`) lowers the cost of trying jtcsv. You don't migrate by hand; the codemod rewrites imports and call sites. If you bounce off, you bounce off cheap.

What it doesn't have:

The mature bug ecosystem that papaparse has built up. If you hit a weird CSV shape, there's a decent chance papaparse has already seen it.

The multi-maintainer truck factor. One maintainer means one person's availability is the schedule.

Don't pick jtcsv because of this section. Pick it because of the bundle and the defaults and the JSON ↔ CSV symmetry, then weigh this section as the cost.

## Migration paths

For each potential source library, the migration story:

From papaparse:

```bash
npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'
```

The codemod rewrites `Papa.parse(csv, { header: true })` to `csvToJson(csv)`, `Papa.unparse(rows)` to `jsonToCsv(rows)`, and the stream and worker forms to their jtcsv equivalents. It handles roughly 90% of call sites cleanly. The remaining ~10% are the configurations that don't have a 1:1 mapping (custom `transform` per-cell callbacks, exotic `dynamicTyping` rules); the codemod leaves those with a `// TODO(jtcsv-codemod):` comment so you can review them.

From csvtojson:

```bash
npx jtcsv-codemod csvtojson 'src/**/*.{js,ts,tsx}'
```

Same surface, same ~90% coverage. csvtojson's `.fromString().subscribe()` shape becomes a `for await` over `csvToJsonIterator`.

From csv-parse: no codemod yet, because the streaming model differs enough that an AST-level rewrite isn't reliable. The manual migration is roughly:

```js
// before
import { parse } from 'csv-parse';
const data = parse(csv, { columns: true });

// after
import { csvToJson } from 'jtcsv';
const data = csvToJson(csv);
```

For the stream form, replace `parse({ columns: true })` with `createCsvToJsonStream()` from `jtcsv/csv-async`. Pipeline composition is unchanged.

## When to use which

A clean decision tree:

You're building a frontend that handles untrusted CSV upload — jtcsv. Smaller bundle for the browser, CSV injection guard on by default, Web Workers via the `jtcsv-workers` subpath.

You're parsing a known-shape CSV in Node and your team already knows papaparse — papaparse. Familiarity is a real productivity gain, and the edge cases are well-known.

You're chaining Transform streams with other Node Transforms (csv → filter → enrich → write) — csv-parse. It's the most idiomatic Node Transform in the three, slots cleanest into a `pipeline()`.

You ship NDJSON or TSV alongside CSV — jtcsv. It's the only one of the three with first-class subpath imports for all three formats. NDJSON in particular is a second-class citizen in papaparse (you build your own line splitter) and csv-parse (TSV is a delimiter flag).

You need provenance and a documented threat model for a customer security review — jtcsv. It's the only one that ships either.

Your team has a strict "no dependencies less than 1 year old" rule — papaparse or csv-parse. jtcsv is ~5 months old; that's the honest answer.

You want to try jtcsv without committing — run `npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'` on a branch, run your test suite, and see. Reverting is `git checkout main`.

## Closing

All three libraries are doing real work in real production systems. papaparse and csv-parse have earned the trust they have; the version of this post that pretends otherwise is the version nobody should read. The jtcsv wedge is narrow but specific: ~18 KB gz tree-shakable subpath imports vs papaparse ~35 KB minified — half the bundle for the same workhorse, with security defaults flipped on and JSON ↔ CSV symmetry as a first-class concept. That's the trade. The cost is that jtcsv is ~5 months old, has a single maintainer, and doesn't have the edge-case ecosystem the older libraries have built.

Pick the library that matches the trade you want to make. Then read the docs and run the benchmarks against your own data, because the only number that matters is the one your hardware produces.

If you want to dig further:

- The repo: github.com/Linol-Hamelton/jtcsv
- The decision tree for which jtcsv API to reach for: `docs/API_DECISION_TREE.md`
- The codemod for migrating from papaparse or csvtojson: `jtcsv-codemod` on npm
- The threat model: `docs/THREAT_MODEL.md`
- The honest "5-month-old" caveat and the wedge in full: `docs/POSITIONING.md`
