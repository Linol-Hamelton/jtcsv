# HN post draft

## Title (one line, ≤ 80 chars)

Show HN: jtcsv – JSON ↔ CSV in ~18 KB gz, with subpath imports and a codemod

## URL (line under the title)

https://github.com/Linol-Hamelton/jtcsv

## Body (the comment field — ~150-250 words)

Built jtcsv as a tree-shakable JSON ↔ CSV toolkit for Node and the browser. `jtcsv/csv` is ~18 KB gz vs papaparse ~35 KB minified, for the same CSV → JSON workhorse.

What's in the box:

- 9 subpath imports (csv, json, streams, ndjson, tsv, errors, browser, plugins, schema). Tree-shaking actually works.
- CSV injection guard ON by default. Cells starting with =, +, -, @ are escaped per OWASP CSV Formula Injection.
- Zero runtime deps in core. Sigstore-signed provenance on every release (`npm audit signatures jtcsv`).
- Three formats first-class: CSV, NDJSON, TSV — all via subpath imports.
- Worker threads (Node) opt-in via `useWorkers`; Web Workers (browser) via the `jtcsv-workers` subpath.
- Codemod: `npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'` rewrites imports + call sites.
- 870 total tests (821 unit + 49 package), ~68% line coverage (honest baseline, climbing).
- SHA-pinned GitHub Actions (16 actions), Dependabot weekly, OpenSSF Scorecard nightly.

What it is NOT:

- Faster than papaparse on every input shape. Use papaparse if you've already optimized around its quirks.
- A drop-in replacement for csv-parse's transform streams.

Repo: github.com/Linol-Hamelton/jtcsv
Comparison matrix: github.com/Linol-Hamelton/jtcsv/blob/main/docs/COMPARISON.md
Threat model: github.com/Linol-Hamelton/jtcsv/blob/main/docs/THREAT_MODEL.md

Feedback welcome — especially the wedge claim, since "papaparse minified ~35 KB" has multiple measurement conventions.

## Posting tips

- [ ] Post Tue/Wed/Thu 8-11 AM PT for best HN visibility.
- [ ] Submit the project URL, then add the body as the first comment immediately.
- [ ] Don't ask for upvotes — HN bans that.
- [ ] Reply to early comments quickly. The first hour is the make-or-break window.
- [ ] If the post stalls at ~5 points, leave it — don't beg friends to upvote, HN's voting ring detection will sink it.

Published date: TBD — operator follow-up.
