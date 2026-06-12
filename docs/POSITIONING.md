# Positioning — jtcsv

> One source of truth for every public-facing claim made by jtcsv:
> who it's for, who it's not for, how it differs from the
> incumbents. The README hero, the npm description, the comparison
> table, and the marketing-rollout copy all derive from this file.

## In one sentence

> **jtcsv is the modern, TypeScript-native JSON ↔ CSV toolkit
> that pays half the bundle of PapaParse and protects you against
> Excel formula injection by default.**

## The locked wedge

**Primary**: `import { csvToJson } from 'jtcsv/csv'` costs
**~18 KB gzipped** (entry + transitive shared chunks, measured by
`scripts/check-bundle-size.js`). Papaparse minified is ~35 KB.
A frontend project pays roughly half the bytes — for the same
CSV→JSON workhorse plus subpath imports for every other format.

This is the number we lead with. Everything else is supporting evidence.

## Supporting evidence stack

In priority order — first three appear in the hero block, the rest
live in the deep-dive page linked from the comparison table.

### 1. Default-safe against CSV injection

`preventCsvInjection: true` is on by default. Cells whose first
non-whitespace character is `=`, `+`, `-`, or `@` (the Excel
formula-injection set, per [OWASP][owasp-csv]) get a leading
apostrophe added on write. Papaparse and csv-parse both ship the
attack vector wide open — your users opt into safety with neither.

```js
import { jsonToCsv } from 'jtcsv';
jsonToCsv([{name: '=cmd|"/C calc"!A1'}]);
// → name\n"'=cmd|"/C calc"!A1"\n   (rendered as text in Excel)
```

[owasp-csv]: https://owasp.org/www-community/attacks/CSV_Injection

### 2. Three formats in one — CSV / NDJSON / TSV

A frontend project that imports CSV, exports NDJSON to an
analytics pipeline, and emits TSV to a downstream data-warehouse
spreadsheet adds **one** dependency, not three. Each subpath is
tree-shakable:

| Subpath           | Entry size (gz) | Real import cost |
| ----------------- | --------------: | ---------------: |
| `jtcsv/csv`       | 0.6 KB          | 18 KB |
| `jtcsv/json`      | 2.2 KB          |  8 KB |
| `jtcsv/streams`   | 0.5 KB          | 11 KB |
| `jtcsv/ndjson`    | 3.8 KB          |  4 KB |
| `jtcsv/tsv`       | 3.2 KB          | 36 KB |
| `jtcsv/errors`    | 2.6 KB          |  3 KB |

(*Real import cost* = entry file + transitive `_shared/*` chunks
that the entry pulls in. Measured by `npm run size`.)

### 3. Migration codemod

`npx jtcsv-codemod papaparse "src/**/*.{js,ts,tsx}"` rewrites
your imports and call sites to jtcsv equivalents in seconds.
Renames `header` → `hasHeaders`, `dynamicTyping` → `parseNumbers`,
drops Papa-specific options that have no jtcsv equivalent (with a
TODO comment at the call site so you can review).

No competitor ships a migration codemod. It's a friction-free
on-ramp the rest of the niche can't easily reproduce.

### 4. TypeScript-native

The source is `.ts`. The published `.d.ts` files are generated
from the real types. There's no `@types/jtcsv` overlay drifting
out of sync. Strict-mode (`tsconfig.strict.json`) compiles with
**zero errors** on the public surface — verified by a CI ratchet.

### 5. Zero runtime dependencies + Sigstore-signed

The runtime tree pulls in nothing. Releases are signed with
Sigstore via npm provenance — `npm audit signatures jtcsv` will
verify.

## When NOT to use jtcsv

This section is **non-negotiable** in the README comparison table.
The temptation to omit it is the temptation to write a marketing
blurb instead of an honest positioning.

- **You need a decade of battle-tested edge cases.** Use
  [`csv-parse`](https://www.npmjs.com/package/csv-parse). jtcsv is
  ~5 months old. Its fuzz pass is fresh. Rare encodings (UTF-16
  with BOM in a stream mid-chunk, custom row terminators, IBM-EBCDIC
  input) may bite you in ways csv-parse worked through in 2014.

- **You depend on `Papa.parse(file, { step, complete })` callback
  flow** with browser web-worker parsing. Use
  [`papaparse`](https://www.npmjs.com/package/papaparse). jtcsv's
  worker support is Node-side (`useWorkers: true`); the streaming
  contract is Node `Readable`/`Transform`, not Papa callbacks.

- **You're parsing CSV-like-but-not-CSV** — semi-structured logs,
  fixed-width files, line-protocol metrics. Use a parser meant for
  that format. jtcsv is RFC 4180 in spirit; fast-path mode assumes
  no quoted newlines unless the analyzer detects them.

- **You depend on the `@jtcsv/` npm scope** for some downstream
  reason. The scope is unavailable to this project; all sibling
  packages ship unscoped as `jtcsv-*` (e.g. `jtcsv-codemod`).

## Comparison matrix

| Capability                          | jtcsv 3.2 | papaparse 5.x | csv-parse 5.x | fast-csv 5.x |
| ----------------------------------- | --------- | ------------- | ------------- | ------------ |
| Tree-shakable subpaths              | ✅ 6      | ❌           | ❌           | ❌          |
| Bundle (`csvToJson` only, gz)       | **~18 KB** | ~14 KB browser | ~25 KB    | ~7 KB        |
| CSV injection prevention by default | ✅        | ❌           | ❌           | ❌          |
| TypeScript-native source            | ✅        | ❌ (JS + @types) | partial   | partial      |
| NDJSON support in same package      | ✅        | ❌           | ❌           | ❌          |
| TSV support in same package         | ✅        | ❌           | ❌           | ❌          |
| Worker threads (Node) opt-in        | ✅        | ❌           | ❌           | ❌          |
| Web Worker parsing (browser)        | ✅ via `jtcsv-workers` | ✅ first-class | ❌    | ❌          |
| Migration codemod                   | ✅ `jtcsv-codemod` | ❌    | ❌           | ❌          |
| Sigstore-signed releases            | ✅        | ✅ (recent)  | ✅           | ❌          |
| Streaming parser                    | ✅        | ✅           | ✅           | ✅          |
| Sync parser                         | ✅        | ✅           | sync wrapper | ❌          |
| Age (production years)              | **<1**    | 12           | 13           | 11           |
| GitHub stars (Jun 2026)             | <100      | 12.6k        | 4k           | 1.7k         |

**Honest tradeoff**: years 1-12 belong to papaparse and csv-parse.
jtcsv earns trust per-release, not per-decade. The bundle, security,
and ergonomic wins above are real today; the long-tail edge-case
coverage will accumulate.

## Voice and tone

- **Numbers over adjectives.** "~18 KB gzipped" beats "tiny."
  "Strict-TS clean" beats "type-safe."
- **No trash talk.** Papaparse and csv-parse are excellent; the
  comparison table includes a row for what they do better.
- **Plain English.** No "blazing fast," no "next-generation," no
  "AI-powered," no "enterprise-grade." We're a CSV parser.
- **Russian docs welcome but English is canonical.** Migration
  guides and recipe pages may have RU-language siblings; the
  README, comparison table, and POSITIONING are English-first.

## Brand identity (locked Phase 1 Week 3, pending Phase 5 polish)

- **Name pronunciation**: "jay-tee-csv" (J as in JSON, T for
  toolkit). Some users will read it as "jot-csv" — both are fine.
- **Etymology**: J (JSON) ↔ T (toolkit) ↔ CSV.
- **Author identity**: Ruslan Fomenko (npm: `fomenkoruslan`,
  GitHub: `RuslanFomenko`). Repo currently under
  `Linol-Hamelton/jtcsv` — to be reconciled in Phase 5.
- **Logo**: TBD. SVG monogram from a free generator → designer
  iteration in Phase 5 Week 15. The hero block carries a `<picture>`
  tag with light/dark sources from day one; the asset behind that
  tag upgrades over time.
- **Domain**: jtcsv.dev — to be registered in Phase 5. Until then,
  docs ship on `*.pages.dev` and the README badge points there.
- **Social handle**: not yet established. Decision deferred to
  Phase 5 to avoid claiming a handle we won't actively use.

## What this positioning explicitly does NOT claim

- "Fastest in the niche." Bench results are workload-dependent;
  fast-csv wins streaming throughput on large files; csv-parse wins
  RFC-4180-strict correctness on adversarial input. We claim "fast
  enough that bundle size becomes the honest tradeoff."
- "Most features." Papaparse has accumulated a decade of corner-case
  options; csv-parse has the most surface area. We claim "all the
  features most projects need, packaged tighter."
- "Production-ready for safety-critical systems." We claim
  "production-ready for typical CSV workflows with security-first
  defaults." Safety-critical (avionics, medical, financial
  settlement) consumers should treat this paragraph as a yellow flag
  and audit the parser themselves.
- "10/10 OpenSSF Scorecard." The score will land in the 7.5-8.5
  range after Phase 1 → Phase 2 hardening. Brand surface quotes the
  actual number, not aspirational.

---

**Last locked**: 2026-06-12.
**Author**: Ruslan Fomenko.
**Next polish window**: Phase 4 Week 11 (README hero rewrite uses
this file as its source of truth).
