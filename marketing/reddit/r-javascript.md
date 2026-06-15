# Reddit post — r/javascript

## Title
I built jtcsv — JSON ↔ CSV in ~18 KB gz, with subpath imports and a papaparse codemod

## Body
The wedge: ~18 KB gz tree-shakable subpath imports vs papaparse ~35 KB minified — half the bundle for the same workhorse.

I shipped a JSON ↔ CSV toolkit with `9 subpaths`, three formats (CSV, NDJSON, TSV) all first-class, and zero runtime deps in core. Current stable is 3.2.3; 3.3.0-beta.0 is staged on the npm `next` dist-tag.

Subpath shape (3 rows is enough to see the idea):

| Import | What you pay for |
| --- | --- |
| `jtcsv/csv-to-json` | only the CSV→JSON path |
| `jtcsv/json-to-csv` | only the JSON→CSV path |
| `jtcsv/ndjson` | NDJSON streaming, nothing else |

A minimal example:

```js
import { csvToJson } from 'jtcsv/csv-to-json';

const rows = csvToJson('name,age\nAda,36\nLin,28', {
  parseNumbers: true,
  preventCsvInjection: true, // ON by default — guards =, +, -, @ per OWASP
});
```

Migrating from papaparse is a one-liner codemod that rewrites imports and call sites:

```
npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'
```

What jtcsv is NOT: it is not a drop-in superset of papaparse — the codemod handles the common shapes (`Papa.parse`, `Papa.unparse`, header/dynamicTyping flags), but exotic config keys still need a manual look. It is also not a CSV editor or a data-cleaning lib — it's a parser/serializer with sane defaults.

Honest test posture: `821 unit tests + 49 package tests = 870 total`, ~68% lines covered (orange band — that's the actual number, not a vanity figure). Every release ≥ 3.0 ships with Sigstore-signed provenance. CI uses SHA-pinned GitHub Actions (16 of them), Dependabot weekly, OpenSSF Scorecard nightly. Browser workloads can offload via the `jtcsv-workers` subpath.

Three links, not seven:
- Repo: https://github.com/jtcsv/jtcsv
- npm: https://www.npmjs.com/package/jtcsv
- Bundle-size methodology doc: docs/POSITIONING.md (how the `~18 KB gz` and papaparse `~35 KB minified` numbers are measured)

The ask: I quote papaparse at `~35 KB minified` from its dist build, and jtcsv core at `~18 KB gz` from `jtcsv/csv-to-json + jtcsv/json-to-csv` through Rollup. Curious whether the `~35 KB minified` papaparse number matches what frontend devs actually see in their builds — what's your measured bundle slice for papaparse (or for whatever you swapped it out with)? Numbers from real apps would help me sharpen the comparison page.

## Posting notes
- Post Tue-Thu, 9-11am US Eastern — r/javascript engagement peaks mid-morning weekdays; Showoff Saturday tag only if posting Saturday.
- Flair: "Project" on weekday, "showoff Saturday" if Saturday.
- Skip the screenshot for the OP; r/javascript prefers a code-first post body. Drop a bundle-size screenshot in the first comment if anyone asks for proof.
- Pin a follow-up comment with the codemod invocation again — many readers skim and miss the inline command.
- Reply within the first 90 minutes; r/javascript ranks heavily on early reply velocity and you want to be there when the methodology questions land.
