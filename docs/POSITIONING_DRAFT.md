# Positioning draft — wedge lock for 3.3.0 / marketing rollout

> **Status**: DRAFT — locked decision for Phase 1, fleshed out in Phase 4
> (week 11 hero rewrite). Source for `docs/POSITIONING.md` (final).

## The locked wedge

**Primary wedge**: `jtcsv/csv` subpath import costs **~18 KB gzipped**
(entry + transitive shared chunks, measured by `scripts/check-bundle-size.js`).
Papaparse raw bundle is ~35 KB. **A jtcsv user pays roughly half the bytes
on a frontend bundle, for the same CSV→JSON workhorse.**

This is the headline. Everything else is supporting evidence.

### Why this wedge and not the others

We considered four candidate wedges in the strategic audit:

| Wedge candidate | Verdict | Reason |
| --------------- | ------- | ------ |
| **A — 18 KB tree-shaken subpath imports** | **LOCKED** | Numeric, measurable, defensible today. `npm run size` proves it. Differentiates against the entire top-5 of the niche. |
| B — Default-safe (CSV injection prevention) | Supporting evidence | Real feature, real safety win, but "secure by default" branding writes a check that the implementation at security score 60 cannot fully cash. Will graduate to a peer wedge after Phase 2 brings security to 88. |
| C — Codemod-driven migration | Supporting evidence | True differentiator (no competitor has one) but at codemod 0.1.1 / 0.2.0 only covers papaparse + csvtojson. Becomes a hero feature once the codemod set covers 4+ libraries (Phase 3 / Phase 5). |
| D — Universal CLI for CSV/TSV/NDJSON | Deferred | The CLI works but the audience (data eng / devops) is downstream of "library users notice us". Park it for v4. |

## The supporting evidence stack (in priority order)

1. **Default-safe**: `preventCsvInjection: true`, path-traversal guards,
   `maxRows` / `maxRecords` — all on by default. Brand surface: a
   sentence in the hero block + a deep-dive page once Security >= 88.
2. **TypeScript-native**: the source is `.ts`, the published `.d.ts` is
   generated from real types, no `@types/jtcsv` overlay needed.
3. **Three formats in one**: CSV + NDJSON + TSV via subpath imports.
   `jtcsv/ndjson` and `jtcsv/tsv` each cost < 5 KB gzipped.
4. **Zero runtime dependencies** + Sigstore-signed releases. Verify
   with `npm audit signatures jtcsv`.
5. **Codemod**: `npx jtcsv-codemod papaparse src/` rewrites your imports
   and call sites in ~1 second per file.

## What we explicitly DO NOT claim

- We do not claim "fastest" — there's a benchmark CI, the picture is
  mixed across workloads, and "fastest" is a fragile, easily-disproven
  brand promise. We DO claim "fast enough that bundle size is the
  honest tradeoff."
- We do not claim "most features." Papaparse and csv-parse have more
  surface area accumulated over 10+ years. We claim "all the features
  most projects need, packaged tighter."
- We do not claim "10/10 OpenSSF Scorecard" — the score will land in
  the 7.5-8.5 range after Phase 1 / 2. Brand surface will quote the
  actual number, not aspirational.

## When NOT to use jtcsv

This section is for the hero comparison table and the POSITIONING.md
final draft. Honest reasons a reader should pick a different library:

- **You need 10 years of battle-tested edge cases.** Use `csv-parse`.
  jtcsv is 5 months old; its fuzz pass is fresh; rare encodings (UTF-16
  with BOM in stream mid-chunk, custom row terminators) may bite.
- **You need PapaParse's exact step/complete streaming callback shape**
  with worker-thread parsing in the browser. Use `papaparse`. Our
  worker-thread support is Node-only and follows a `useWorkers` flag,
  not a callback contract.
- **You're parsing CSV-like-but-not-CSV** (semi-structured logs, fixed-
  width files, line-protocol). Use a parser meant for that format.
- **You depend on the npm @jtcsv/ scope** for some reason. The scope
  is squatted; all official siblings ship unscoped as `jtcsv-*`.

## The week-11 README hero will be built from this file

`docs/POSITIONING.md` (the polished version) is a Phase 1 Week 3
deliverable. It must:

1. Open with the 18 KB number and a comparison table including papaparse
   and csv-parse, with bundle sizes and at least one honest weakness
   per row.
2. Have an "Honest tradeoff" footnote that links to "When NOT to use
   jtcsv" below the fold.
3. Be no longer than ~250 lines so it fits a single browser scroll on a
   13" laptop. Heroes that don't fit get skipped.

---

Locked: 2026-06-12.
Owner: Ruslan Fomenko.
Next review: Phase 1 Week 3 when POSITIONING.md final draft lands.
